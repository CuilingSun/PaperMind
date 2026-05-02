import { GoogleGenerativeAI } from '@google/generative-ai';
import { Lang, buildAnalysisPrompt, buildChatContext, buildChatResponse } from './prompts';

export { type Lang };

export const SECTION_KEYS = [
  '摘要翻译',
  '方法动机',
  '方法设计',
  '与其他方法对比',
  '实验表现与优势',
  '学习与应用',
  '总结',
] as const;

export type SectionKey = (typeof SECTION_KEYS)[number];

export const SECTION_LABELS: Record<SectionKey, { zh: string; en: string }> = {
  '摘要翻译':      { zh: '摘要翻译',      en: 'Abstract' },
  '方法动机':      { zh: '方法动机',      en: 'Motivation' },
  '方法设计':      { zh: '方法设计',      en: 'Method Design' },
  '与其他方法对比': { zh: '与其他方法对比', en: 'Comparison' },
  '实验表现与优势': { zh: '实验表现与优势', en: 'Experiments & Results' },
  '学习与应用':    { zh: '学习与应用',    en: 'Learning & Application' },
  '总结':         { zh: '总结',          en: 'Summary' },
};

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export function parseSections(text: string): Partial<Record<SectionKey, string>> {
  const result: Partial<Record<SectionKey, string>> = {};
  const parts = text.split(/(?=^## )/m);
  for (const part of parts) {
    for (const key of SECTION_KEYS) {
      if (part.startsWith(`## ${key}`)) {
        result[key] = part.replace(/^## .+\n/, '').trim();
        break;
      }
    }
  }
  return result;
}

export async function* analyzePaper(
  apiKey: string,
  pdfBase64: string,
  lang: Lang,
): AsyncGenerator<string> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const result = await model.generateContentStream([
    { inlineData: { mimeType: 'application/pdf', data: pdfBase64 } },
    { text: buildAnalysisPrompt(lang) },
  ]);

  for await (const chunk of result.stream) {
    yield chunk.text();
  }
}

export async function* chatWithPaper(
  apiKey: string,
  pdfBase64: string,
  messages: ChatMessage[],
  lang: Lang,
): AsyncGenerator<string> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });

  const history = messages.slice(0, -1).map((msg) => ({
    role: msg.role === 'user' ? ('user' as const) : ('model' as const),
    parts: [{ text: msg.content }],
  }));

  const chat = model.startChat({
    history: [
      {
        role: 'user',
        parts: [
          { inlineData: { mimeType: 'application/pdf', data: pdfBase64 } },
          { text: buildChatContext(lang) },
        ],
      },
      {
        role: 'model',
        parts: [{ text: buildChatResponse(lang) }],
      },
      ...history,
    ],
  });

  const lastMessage = messages[messages.length - 1].content;
  const result = await chat.sendMessageStream(lastMessage);

  for await (const chunk of result.stream) {
    yield chunk.text();
  }
}
