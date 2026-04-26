'use client';

import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ChatMessage } from '@/lib/gemini';

interface Props {
  messages: ChatMessage[];
  onSend: (message: string) => void;
  isChatting: boolean;
  lang: 'zh' | 'en';
}

export default function ChatPanel({ messages, onSend, isChatting, lang }: Props) {
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || isChatting) return;
    setInput('');
    onSend(trimmed);
  };

  return (
    <div className="border-t border-slate-200 bg-white">
      <div className="px-6 py-6">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-lg">💬</span>
          <h2 className="font-semibold text-slate-900">
            {lang === 'zh' ? '基于论文追问' : 'Ask a question'}
          </h2>
          <span className="text-xs text-slate-400 ml-1">
            {lang === 'zh' ? '刷新页面后对话清空' : 'Cleared on page refresh'}
          </span>
        </div>

        {messages.length > 0 && (
          <div className="mb-4 space-y-4 max-h-96 overflow-y-auto pr-1">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'assistant' && (
                  <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-xs shrink-0 mt-0.5 mr-2">
                    AI
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
                    msg.role === 'user'
                      ? 'bg-indigo-600 text-white rounded-tr-sm'
                      : 'bg-slate-100 text-slate-800 rounded-tl-sm'
                  }`}
                >
                  {msg.role === 'user' ? (
                    msg.content
                  ) : (
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        p: ({ children }) => <p className="mb-2 last:mb-0 leading-6">{children}</p>,
                        ul: ({ children }) => <ul className="list-disc pl-4 mb-2 space-y-0.5">{children}</ul>,
                        ol: ({ children }) => <ol className="list-decimal pl-4 mb-2 space-y-0.5">{children}</ol>,
                        strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                        code: ({ children }) => (
                          <code className="bg-slate-200 px-1 py-0.5 rounded text-xs font-mono">{children}</code>
                        ),
                        table: ({ children }) => (
                          <div className="overflow-x-auto my-2">
                            <table className="border-collapse text-xs">{children}</table>
                          </div>
                        ),
                        th: ({ children }) => (
                          <th className="border border-slate-300 px-2 py-1 bg-slate-200 text-left font-semibold">{children}</th>
                        ),
                        td: ({ children }) => (
                          <td className="border border-slate-300 px-2 py-1">{children}</td>
                        ),
                      }}
                    >
                      {msg.content || '▋'}
                    </ReactMarkdown>
                  )}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        )}

        <div className="flex gap-3 items-end">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={lang === 'zh'
              ? '输入问题，例如：这篇论文的方法能用于视频理解吗？（Enter 发送）'
              : 'Ask a question, e.g. Can this method be applied to video understanding? (Enter to send)'}
            rows={2}
            className="flex-1 resize-none rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isChatting}
            className="shrink-0 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {isChatting ? (
              <span className="flex items-center gap-2">
                <span className="inline-block h-3 w-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                {lang === 'zh' ? '回答中' : 'Thinking'}
              </span>
            ) : (lang === 'zh' ? '发送' : 'Send')}
          </button>
        </div>
      </div>
    </div>
  );
}
