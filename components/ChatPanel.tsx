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

const SendIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>
  </svg>
);

const ChatIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
  </svg>
);

export default function ChatPanel({ messages, onSend, isChatting, lang }: Props) {
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const zh = lang === 'zh';

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
    <div style={{ borderTop: '1px solid var(--pm-border)', background: 'var(--pm-bg-card)' }}>
      <div style={{ padding: '20px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, color: 'var(--pm-blue)' }}>
          <ChatIcon />
          <span style={{ fontWeight: 600, fontSize: 15, color: 'var(--pm-text)', letterSpacing: '-0.005em' }}>
            {zh ? '基于论文追问' : 'Ask a question'}
          </span>
          <span style={{ fontSize: 12, color: 'var(--pm-text-soft)', marginLeft: 4 }}>
            {zh ? '刷新页面后对话清空' : 'Cleared on page refresh'}
          </span>
        </div>

        {messages.length > 0 && (
          <div style={{ marginBottom: 16, maxHeight: 400, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {messages.map((msg, i) => (
              <div
                key={i}
                style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}
              >
                {msg.role === 'assistant' ? (
                  <div className="pm-bubble-ai">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        p: ({ children }) => <p style={{ marginBottom: 8, lineHeight: 1.7, margin: '0 0 8px' }}>{children}</p>,
                        ul: ({ children }) => <ul style={{ paddingLeft: 16, marginBottom: 8 }}>{children}</ul>,
                        ol: ({ children }) => <ol style={{ paddingLeft: 16, marginBottom: 8 }}>{children}</ol>,
                        strong: ({ children }) => <strong style={{ fontWeight: 600 }}>{children}</strong>,
                        code: ({ children }) => (
                          <code style={{ background: 'rgba(107,76,154,0.08)', padding: '1px 5px', borderRadius: 3, fontSize: 12.5, fontFamily: 'monospace' }}>
                            {children}
                          </code>
                        ),
                        table: ({ children }) => (
                          <div style={{ overflowX: 'auto', margin: '8px 0' }}>
                            <table style={{ borderCollapse: 'collapse', fontSize: 12 }}>{children}</table>
                          </div>
                        ),
                        th: ({ children }) => (
                          <th style={{ border: '1px solid rgba(107,76,154,0.2)', padding: '6px 10px', background: 'rgba(107,76,154,0.06)', fontWeight: 600, textAlign: 'left' }}>{children}</th>
                        ),
                        td: ({ children }) => (
                          <td style={{ border: '1px solid rgba(107,76,154,0.15)', padding: '6px 10px' }}>{children}</td>
                        ),
                      }}
                    >
                      {msg.content || '▋'}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <div className="pm-bubble-user">{msg.content}</div>
                )}
              </div>
            ))}

            {isChatting && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div className="pm-bubble-ai">
                  <span style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}>
                    {[0, 0.2, 0.4].map((delay, i) => (
                      <span key={i} style={{
                        width: 6, height: 6, borderRadius: '50%',
                        background: 'var(--pm-purple)',
                        animation: 'pm-dot-bounce 1.4s infinite',
                        animationDelay: `${delay}s`,
                        display: 'inline-block',
                      }} />
                    ))}
                    <style>{`@keyframes pm-dot-bounce { 0%,60%,100%{opacity:0.3} 30%{opacity:1} }`}</style>
                  </span>
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={zh
              ? '输入问题，例如：这篇论文的方法能用于视频理解吗？（Enter 发送）'
              : 'Ask a question, e.g. Can this method be applied to video understanding? (Enter to send)'}
            rows={2}
            style={{
              flex: 1, resize: 'none',
              border: '1px solid var(--pm-border)',
              borderRadius: 'var(--pm-r-sm)',
              padding: '10px 14px',
              fontSize: 14, color: 'var(--pm-text)',
              background: '#fff', outline: 'none',
              transition: 'border-color 180ms, box-shadow 180ms',
              lineHeight: 1.6,
              fontFamily: 'inherit',
            }}
            onFocus={(e) => {
              e.target.style.borderColor = 'var(--pm-blue)';
              e.target.style.boxShadow = '0 0 0 3px rgba(24,95,165,0.12)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = 'var(--pm-border)';
              e.target.style.boxShadow = 'none';
            }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isChatting}
            style={{
              flexShrink: 0,
              display: 'inline-flex', alignItems: 'center', gap: 6,
              height: 40, padding: '0 18px',
              borderRadius: 'var(--pm-r-sm)',
              background: !input.trim() || isChatting ? 'var(--pm-bg-soft)' : 'var(--pm-blue)',
              color: !input.trim() || isChatting ? 'var(--pm-text-muted)' : '#fff',
              fontSize: 14, fontWeight: 500, border: 'none',
              cursor: !input.trim() || isChatting ? 'not-allowed' : 'pointer',
              transition: 'background 180ms, color 180ms',
            }}
          >
            {isChatting ? (
              <>
                <span style={{
                  width: 12, height: 12, border: '2px solid rgba(136,135,128,0.4)',
                  borderTopColor: 'var(--pm-text-muted)', borderRadius: '50%',
                  animation: 'pm-spin 1s linear infinite', display: 'inline-block',
                }} />
                {zh ? '回答中' : 'Thinking'}
              </>
            ) : (
              <>
                <SendIcon />
                {zh ? '发送' : 'Send'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
