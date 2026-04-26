export interface FigureMapping {
  id: string;   // "Figure 1"
  page: number; // PDF page number
}

// Matches: Figure 1, Figure 2a, Fig. 3, Fig 4
const FIGURE_REF_REGEX = /\b(Figure|Fig\.?)\s*(\d+[a-zA-Z]?)/gi;

export function parseFigureMap(text: string): Map<string, number> {
  const map = new Map<string, number>();

  const jsonMatch = text.match(/```json\s*(\{[\s\S]*?"figures"[\s\S]*?\})\s*```/);
  if (!jsonMatch) return map;

  try {
    const parsed = JSON.parse(jsonMatch[1]) as { figures: FigureMapping[] };
    for (const fig of parsed.figures ?? []) {
      map.set(fig.id.toLowerCase(), fig.page);
    }
  } catch {
    // malformed JSON — return empty map, caller falls back gracefully
  }

  return map;
}

// Split a text string into segments, separating out Figure/Fig references.
// Returns an array of { text, figureId? } tokens for rendering.
export function tokenizeFigureRefs(text: string): Array<{ text: string; figureId?: string }> {
  const tokens: Array<{ text: string; figureId?: string }> = [];
  let lastIndex = 0;

  const regex = new RegExp(FIGURE_REF_REGEX.source, 'gi');
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({ text: text.slice(lastIndex, match.index) });
    }
    tokens.push({ text: match[0], figureId: match[0] });
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    tokens.push({ text: text.slice(lastIndex) });
  }

  return tokens;
}

// Strip the leading ```json ... ``` block from the raw AI output before rendering.
export function stripFigureJson(text: string): string {
  return text.replace(/```json\s*\{[\s\S]*?"figures"[\s\S]*?\}\s*```\n?/, '').trimStart();
}
