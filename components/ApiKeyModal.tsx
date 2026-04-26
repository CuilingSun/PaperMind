'use client';

import { useState } from 'react';
import { Lang } from '@/lib/gemini';

interface Props {
  currentKey: string;
  onSave: (key: string) => void;
  onClose: () => void;
  lang: Lang;
}

export default function ApiKeyModal({ currentKey, onSave, onClose, lang }: Props) {
  const [value, setValue] = useState(currentKey);
  const [error, setError] = useState('');
  const zh = lang === 'zh';

  const handleSave = () => {
    const trimmed = value.trim();
    if (!trimmed) {
      setError(zh ? '请输入 API Key' : 'Please enter your API Key');
      return;
    }
    if (!trimmed.startsWith('AIza') || trimmed.length < 30) {
      setError(
        zh
          ? 'Key 格式不正确，Gemini API Key 以 "AIza" 开头'
          : 'Invalid key format — Gemini API Keys start with "AIza"'
      );
      return;
    }
    onSave(trimmed);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl mx-4">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-slate-900">
            {zh ? '设置 Gemini API Key' : 'Set up Gemini API Key'}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {zh
              ? 'Key 仅保存在本地浏览器，不会上传到任何服务器'
              : 'Your key is stored only in your browser — never sent to any server'}
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              API Key
            </label>
            <input
              type="password"
              value={value}
              onChange={(e) => { setValue(e.target.value); setError(''); }}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              placeholder="AIzaSy..."
              className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              autoFocus
            />
            {error && <p className="mt-1.5 text-xs text-red-500">{error}</p>}
          </div>

          <a
            href="https://aistudio.google.com/app/apikey"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700"
          >
            {zh ? '没有 Key？在 Google AI Studio 免费获取 →' : "Don't have a key? Get one free at Google AI Studio →"}
          </a>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={handleSave}
            className="flex-1 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
          >
            {zh ? '保存' : 'Save'}
          </button>
          {currentKey && (
            <button
              onClick={onClose}
              className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              {zh ? '取消' : 'Cancel'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
