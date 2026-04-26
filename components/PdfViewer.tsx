'use client';

import { useEffect, useRef, useState } from 'react';

interface Props {
  pdfUrl: string;
  targetPage: number; // controlled externally (figure click)
}

export default function PdfViewer({ pdfUrl, targetPage }: Props) {
  const [page, setPage] = useState(1);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // When parent requests a figure jump, update page
  useEffect(() => {
    if (targetPage >= 1) setPage(targetPage);
  }, [targetPage]);

  // Reload iframe src whenever page changes
  // Chrome's built-in PDF viewer responds to #page=N hash
  const src = `${pdfUrl}#page=${page}`;

  const goTo = (n: number) => {
    if (n >= 1) setPage(n);
  };

  return (
    <div className="flex flex-col h-full bg-slate-100">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-slate-200 shrink-0">
        <span className="text-xs font-medium text-slate-600">PDF 原文</span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => goTo(page - 1)}
            disabled={page <= 1}
            className="w-7 h-7 flex items-center justify-center rounded hover:bg-slate-100 disabled:opacity-30 text-slate-600 text-lg transition-colors"
          >
            ‹
          </button>
          <div className="flex items-center gap-1 text-xs text-slate-500">
            <span>第</span>
            <input
              type="number"
              min={1}
              value={page}
              onChange={(e) => goTo(Number(e.target.value))}
              className="w-10 text-center border border-slate-300 rounded px-1 py-0.5 focus:outline-none focus:border-indigo-400"
            />
            <span>页</span>
          </div>
          <button
            onClick={() => goTo(page + 1)}
            className="w-7 h-7 flex items-center justify-center rounded hover:bg-slate-100 text-slate-600 text-lg transition-colors"
          >
            ›
          </button>
        </div>
      </div>

      {/* PDF iframe — uses browser's native viewer */}
      <iframe
        ref={iframeRef}
        key={src}          // key change forces remount → browser PDF viewer jumps to page
        src={src}
        className="flex-1 w-full border-0 bg-white"
        title="PDF Viewer"
      />
    </div>
  );
}
