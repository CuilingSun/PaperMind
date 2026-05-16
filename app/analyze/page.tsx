'use client';

import { useEffect, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import ApiKeyModal from '@/components/ApiKeyModal';
import PdfUpload from '@/components/PdfUpload';
import ReportView from '@/components/ReportView';
import ChatPanel from '@/components/ChatPanel';
import NavHeader from '@/components/NavHeader';
import HistoryList from '@/components/HistoryList';
import { getHistory, removeHistory, clearHistory, addHistory, HistoryEntry } from '@/lib/history';
import {
  analyzePaper,
  chatWithPaper,
  parseSections,
  SECTION_KEYS,
  SectionKey,
  ChatMessage,
  Lang,
} from '@/lib/gemini';
import { parseFigureMap, stripFigureJson } from '@/lib/figureParser';

const PdfViewer = dynamic(() => import('@/components/PdfViewer'), { ssr: false });

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = reject;
  });
}

type SectionsCache = Partial<Record<SectionKey, string>>;
type CachedReport = Record<string, Record<string, string>>;

interface ArxivInfo {
  id: string;
  title: string;
  authors?: string[];
  published?: string;
  absUrl?: string;
  summary?: string;
  cachedReport?: CachedReport;
}

export default function AnalyzePage() {
  const [apiKey, setApiKey] = useState('');
  const [showModal, setShowModal] = useState(false);

  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfUrl, setPdfUrl] = useState('');
  const [pdfBase64, setPdfBase64] = useState('');

  const [arxivMeta, setArxivMeta] = useState<ArxivInfo | null>(null);

  const [lang, setLang] = useState<Lang>('zh');
  const [cache, setCache] = useState<Record<Lang, SectionsCache>>({ zh: {}, en: {} });
  const [currentSection, setCurrentSection] = useState<SectionKey | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisComplete, setAnalysisComplete] = useState<Record<Lang, boolean>>({ zh: false, en: false });
  const [analysisError, setAnalysisError] = useState('');
  const [figureMap, setFigureMap] = useState<Map<string, number>>(new Map());

  const [viewerPage, setViewerPage] = useState(1);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isChatting, setIsChatting] = useState(false);
  const [historyEntries, setHistoryEntries] = useState<HistoryEntry[]>([]);

  // Load API key; check for pending arXiv paper from tracker
  useEffect(() => {
    const saved = localStorage.getItem('gemini-api-key');
    if (saved) setApiKey(saved);
    else setShowModal(true);
    setHistoryEntries(getHistory());

    const pendingId = localStorage.getItem('pending-arxiv-id');
    const pendingTitle = localStorage.getItem('pending-arxiv-title');
    if (pendingId) {
      localStorage.removeItem('pending-arxiv-id');
      localStorage.removeItem('pending-arxiv-title');
      const authors = localStorage.getItem('pending-arxiv-authors');
      const published = localStorage.getItem('pending-arxiv-published');
      const absUrl = localStorage.getItem('pending-arxiv-absurl');
      const summary = localStorage.getItem('pending-arxiv-summary');
      const report = localStorage.getItem('pending-arxiv-report');
      localStorage.removeItem('pending-arxiv-authors');
      localStorage.removeItem('pending-arxiv-published');
      localStorage.removeItem('pending-arxiv-absurl');
      localStorage.removeItem('pending-arxiv-summary');
      localStorage.removeItem('pending-arxiv-report');
      setArxivMeta({
        id: pendingId,
        title: pendingTitle || pendingId,
        authors: authors ? JSON.parse(authors) : undefined,
        published: published || undefined,
        absUrl: absUrl || undefined,
        summary: summary || undefined,
        cachedReport: report ? JSON.parse(report) : undefined,
      });
    }
  }, []);

  // When we have both a pending arXiv paper and an API key, fetch PDF and analyze/restore
  useEffect(() => {
    if (!arxivMeta || !apiKey) return;
    const meta = arxivMeta;
    setArxivMeta(null); // consume

    (async () => {
      try {
        const res = await fetch(`/api/arxiv-pdf?id=${encodeURIComponent(meta.id)}`);
        if (!res.ok) throw new Error(`PDF download failed (${res.status})`);
        const blob = await res.blob();
        const file = new File([blob], `${meta.title.slice(0, 60)}.pdf`, { type: 'application/pdf' });
        handleFileSelect(file, meta);
      } catch (err) {
        setAnalysisError(
          lang === 'zh'
            ? `无法下载 PDF：${err instanceof Error ? err.message : '未知错误'}`
            : `Failed to download PDF: ${err instanceof Error ? err.message : 'Unknown error'}`
        );
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [arxivMeta, apiKey]);

  const handleApiKeySave = (key: string) => {
    setApiKey(key);
    localStorage.setItem('gemini-api-key', key);
    setShowModal(false);
  };

  const runAnalysis = useCallback(async (
    base64: string,
    key: string,
    language: Lang,
    meta?: { id: string; title: string; source: 'arxiv' | 'upload'; authors?: string[]; published?: string; absUrl?: string; summary?: string },
  ) => {
    setIsAnalyzing(true);
    setAnalysisError('');
    setCurrentSection(null);
    setCache((prev) => ({ ...prev, [language]: {} }));
    setAnalysisComplete((prev) => ({ ...prev, [language]: false }));

    let accumulated = '';
    try {
      for await (const chunk of analyzePaper(key, base64, language)) {
        accumulated += chunk;
        const map = parseFigureMap(accumulated);
        if (map.size > 0) setFigureMap(map);
        const cleaned = stripFigureJson(accumulated);
        const parsed = parseSections(cleaned);
        setCache((prev) => ({ ...prev, [language]: parsed }));
        const detected = SECTION_KEYS.filter((k) => k in parsed);
        setCurrentSection(detected.length > 0 ? detected[detected.length - 1] : null);
      }
      setAnalysisComplete((prev) => ({ ...prev, [language]: true }));

      if (meta) {
        const finalSections = parseSections(stripFigureJson(accumulated));
        const existing = getHistory().find((e) => e.id === meta.id);
        addHistory({
          id: meta.id,
          title: meta.title,
          authors: meta.authors,
          published: meta.published,
          absUrl: meta.absUrl,
          summary: meta.summary,
          report: {
            ...(existing?.report ?? {}),
            [language]: finalSections as Record<string, string>,
          },
          source: meta.source,
          analyzedAt: new Date().toISOString(),
        });
        setHistoryEntries(getHistory());
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : (language === 'zh' ? '未知错误' : 'Unknown error');
      const isKeyError = msg.includes('API_KEY_INVALID') || msg.includes('API key');
      const isQuota = msg.includes('quota') || msg.includes('RESOURCE_EXHAUSTED');
      setAnalysisError(
        language === 'zh'
          ? isKeyError ? 'API Key 无效，请点击右上角重新设置'
            : isQuota ? 'API 免费额度已用完，请稍后再试'
            : `分析失败：${msg}`
          : isKeyError ? 'Invalid API Key — click the key button to update it'
            : isQuota ? 'API quota exhausted — please try again later'
            : `Analysis failed: ${msg}`
      );
    } finally {
      setIsAnalyzing(false);
      setCurrentSection(null);
    }
  }, []);

  const handleFileSelect = async (
    file: File,
    arxivInfo?: ArxivInfo,
  ) => {
    if (!apiKey) { setShowModal(true); return; }
    if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    const url = URL.createObjectURL(file);
    setPdfFile(file);
    setPdfUrl(url);
    setViewerPage(1);
    setChatMessages([]);
    setFigureMap(new Map());
    const base64 = await fileToBase64(file);
    setPdfBase64(base64);

    // Restore any cached report sections
    const cached = arxivInfo?.cachedReport;
    const restoredCache: Record<Lang, SectionsCache> = { zh: {}, en: {} };
    const restoredComplete: Record<Lang, boolean> = { zh: false, en: false };
    if (cached?.zh && Object.keys(cached.zh).length > 0) {
      restoredCache.zh = cached.zh as SectionsCache;
      restoredComplete.zh = true;
    }
    if (cached?.en && Object.keys(cached.en).length > 0) {
      restoredCache.en = cached.en as SectionsCache;
      restoredComplete.en = true;
    }
    setCache(restoredCache);
    setAnalysisComplete(restoredComplete);

    // Only call API for languages not already cached
    if (!restoredComplete[lang]) {
      const meta = arxivInfo
        ? { id: arxivInfo.id, title: arxivInfo.title, source: 'arxiv' as const,
            authors: arxivInfo.authors, published: arxivInfo.published,
            absUrl: arxivInfo.absUrl, summary: arxivInfo.summary }
        : { id: file.name, title: file.name, source: 'upload' as const };
      runAnalysis(base64, apiKey, lang, meta);
    }
  };

  const handleLangSwitch = (next: Lang) => {
    if (next === lang) return;
    setLang(next);
    setChatMessages([]);
    if (!analysisComplete[next] && pdfBase64 && apiKey) {
      runAnalysis(pdfBase64, apiKey, next);
    }
  };

  const handleClearFile = () => {
    if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    setPdfFile(null);
    setPdfUrl('');
    setPdfBase64('');
    setCache({ zh: {}, en: {} });
    setCurrentSection(null);
    setIsAnalyzing(false);
    setAnalysisComplete({ zh: false, en: false });
    setAnalysisError('');
    setFigureMap(new Map());
    setChatMessages([]);
    setViewerPage(1);
  };

  const handleChatSend = async (message: string) => {
    if (!apiKey || !pdfBase64) return;
    const newMessages: ChatMessage[] = [...chatMessages, { role: 'user', content: message }];
    setChatMessages([...newMessages, { role: 'assistant', content: '' }]);
    setIsChatting(true);
    let response = '';
    try {
      for await (const chunk of chatWithPaper(apiKey, pdfBase64, newMessages, lang)) {
        response += chunk;
        setChatMessages([...newMessages, { role: 'assistant', content: response }]);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : (lang === 'zh' ? '未知错误' : 'Unknown error');
      setChatMessages([...newMessages, { role: 'assistant', content: `Error: ${msg}` }]);
    } finally {
      setIsChatting(false);
    }
  };

  const handleHistoryRemove = (id: string) => {
    removeHistory(id);
    setHistoryEntries(getHistory());
  };

  const handleHistoryClear = () => {
    clearHistory();
    setHistoryEntries([]);
  };

  const handleHistoryReanalyze = (entry: HistoryEntry) => {
    if (entry.source === 'arxiv') {
      setArxivMeta({
        id: entry.id,
        title: entry.title,
        authors: entry.authors,
        published: entry.published,
        absUrl: entry.absUrl,
        summary: entry.summary,
        cachedReport: entry.report,
      });
    }
  };

  const sections = cache[lang];
  const isDone = analysisComplete[lang];

  return (
    <div style={{ height: '100vh', overflow: 'hidden', background: 'var(--pm-bg-page)', display: 'flex', flexDirection: 'column' }}>
      <NavHeader lang={lang} onLangChange={handleLangSwitch}>
        {pdfFile && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'var(--pm-blue-light)', borderRadius: 'var(--pm-r-sm)',
            padding: '4px 10px', fontSize: 12,
          }}>
            <span>📄</span>
            <span style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--pm-blue-dark)' }}>
              {pdfFile.name}
            </span>
            <button
              onClick={handleClearFile}
              style={{ color: 'var(--pm-text-muted)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, lineHeight: 1, marginLeft: 2 }}
              title={lang === 'zh' ? '清除文件' : 'Clear file'}
            >×</button>
          </div>
        )}
        <button
          onClick={() => setShowModal(true)}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '5px 10px', borderRadius: 'var(--pm-r-sm)',
            fontSize: 12, fontWeight: 500, border: 'none', cursor: 'pointer',
            background: apiKey ? 'rgba(92,150,25,0.10)' : 'rgba(226,75,74,0.10)',
            color: apiKey ? 'var(--pm-success)' : 'var(--pm-error)',
          }}
        >
          {apiKey ? '🔑 API Key' : '⚠️ No Key'}
        </button>
      </NavHeader>

      {!pdfFile ? (
        <main className="pm-page-tint pm-tint-warm" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
          {analysisError && (
            <div style={{ maxWidth: 720, margin: '0 auto', width: '100%', padding: '20px 24px 0' }}>
              <div style={{
                display: 'flex', alignItems: 'flex-start', gap: 10,
                borderRadius: 'var(--pm-r-md)', border: '1px solid rgba(226,75,74,0.3)',
                background: '#fff5f5', padding: '12px 16px',
                fontSize: 13, color: 'var(--pm-error)',
              }}>
                <span style={{ flexShrink: 0 }}>⚠️</span>
                <span style={{ flex: 1 }}>{analysisError}</span>
                <button
                  onClick={() => setAnalysisError('')}
                  style={{ color: 'var(--pm-error)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, lineHeight: 1, flexShrink: 0 }}
                >×</button>
              </div>
            </div>
          )}
          <PdfUpload
            onFileSelect={handleFileSelect}
            disabled={!apiKey}
            onSetupKey={() => setShowModal(true)}
            lang={lang}
          />
          {historyEntries.length > 0 && (
            <div style={{ maxWidth: 720, margin: '0 auto', width: '100%', padding: '0 24px 40px' }}>
              <HistoryList
                entries={historyEntries}
                lang={lang}
                onRemove={handleHistoryRemove}
                onClear={handleHistoryClear}
                onReanalyze={handleHistoryReanalyze}
                maxItems={5}
                showViewAll={historyEntries.length > 5}
              />
            </div>
          )}
        </main>
      ) : (
        <main style={{ flex: 1, display: 'flex', overflow: 'hidden', height: 'calc(100vh - 56px)' }}>
          <div style={{ width: '45%', flexShrink: 0, borderRight: '1px solid var(--pm-border)', display: 'flex', flexDirection: 'column' }}>
            <PdfViewer pdfUrl={pdfUrl} targetPage={viewerPage} />
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--pm-bg-page)' }}>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              <ReportView
                sections={sections}
                currentSection={currentSection}
                isAnalyzing={isAnalyzing}
                error={analysisError}
                figureMap={figureMap}
                onFigureClick={setViewerPage}
                lang={lang}
              />
            </div>
            {isDone && (
              <div style={{ flexShrink: 0 }}>
                <ChatPanel
                  messages={chatMessages}
                  onSend={handleChatSend}
                  isChatting={isChatting}
                  lang={lang}
                />
              </div>
            )}
          </div>
        </main>
      )}

      {showModal && (
        <ApiKeyModal
          currentKey={apiKey}
          onSave={handleApiKeySave}
          onClose={() => setShowModal(false)}
          lang={lang}
        />
      )}
    </div>
  );
}
