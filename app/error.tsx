'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-6">
      <div className="text-center max-w-sm">
        <p className="text-5xl mb-5">⚠️</p>
        <h2 className="text-base font-semibold text-slate-800 mb-2">出了点问题</h2>
        <p className="text-sm text-slate-500 mb-6 break-words">
          {error.message || 'Something went wrong'}
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
          >
            重试
          </button>
          <a
            href="/"
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
          >
            返回首页
          </a>
        </div>
      </div>
    </div>
  );
}
