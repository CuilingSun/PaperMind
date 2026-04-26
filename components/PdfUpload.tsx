'use client';

import { useRef, useState } from 'react';
import { Lang } from '@/lib/gemini';

interface Props {
  onFileSelect: (file: File) => void;
  disabled: boolean;
  onSetupKey: () => void;
  lang: Lang;
}

export default function PdfUpload({ onFileSelect, disabled, onSetupKey, lang }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const zh = lang === 'zh';

  const handleFile = (file: File) => {
    if (file.type !== 'application/pdf') {
      alert(zh ? '请上传 PDF 格式的文件' : 'Please upload a PDF file');
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      alert(zh ? '文件大小不能超过 20MB' : 'File size must be under 20 MB');
      return;
    }
    onFileSelect(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  return (
    <div className="flex flex-1 items-center justify-center p-8">
      <div className="w-full max-w-2xl">
        {disabled ? (
          <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-16 text-center">
            <div className="text-4xl mb-4">🔑</div>
            <p className="text-slate-600 font-medium mb-2">
              {zh ? '需要先设置 Gemini API Key' : 'A Gemini API Key is required'}
            </p>
            <p className="text-sm text-slate-400 mb-6">
              {zh
                ? 'Key 免费，无需付费，仅保存在你的浏览器中'
                : 'Free to use — your key is stored only in your browser'}
            </p>
            <button
              onClick={onSetupKey}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
            >
              {zh ? '设置 API Key' : 'Set up API Key'}
            </button>
          </div>
        ) : (
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            className={`rounded-2xl border-2 border-dashed p-16 text-center cursor-pointer transition-all duration-200 ${
              isDragging
                ? 'border-indigo-500 bg-indigo-50'
                : 'border-slate-300 bg-slate-50 hover:border-indigo-400 hover:bg-indigo-50/50'
            }`}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }}
            />
            <div className="text-5xl mb-4">📄</div>
            <p className="text-slate-700 font-semibold text-lg mb-2">
              {isDragging
                ? (zh ? '松开以上传论文' : 'Drop to upload')
                : (zh ? '拖拽 PDF 论文到此处' : 'Drag & drop a PDF paper here')}
            </p>
            <p className="text-sm text-slate-400 mb-6">
              {zh ? '或点击选择文件（最大 20MB，仅支持 PDF）' : 'or click to browse (PDF only, max 20 MB)'}
            </p>
            <span className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 transition-colors">
              {zh ? '选择文件' : 'Choose file'}
            </span>
          </div>
        )}

        <p className="mt-6 text-center text-xs text-slate-400">
          {zh
            ? '上传后 AI 将自动解析论文，生成摘要翻译 + 六维深度报告，并可追问'
            : 'Upload a paper and AI will generate a structured analysis report you can chat with'}
        </p>
      </div>
    </div>
  );
}
