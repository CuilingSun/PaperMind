import { ArxivPaper } from './arxiv';
import {
  getEliteLabel,
  getPrestigeSignals,
  PrestigeSignal,
} from './eliteFilter';

const ARXIV_CATEGORY_RE = /^(cs\.[a-z]{2}|stat\.[a-z]{2}|eess\.[a-z]{2}|q-bio\.[a-z]{2})$/i;

const DOMAIN_PRIORITY = ['cs.CL', 'cs.AI', 'cs.CV', 'cs.LG', 'cs.RO', 'stat.ML', 'cs.IR', 'cs.HC'] as const;
export const DEFAULT_MIXED_PICK_DOMAINS = ['cs.AI', 'cs.CL', 'cs.CV'] as const;

const DOMAIN_LABELS: Record<string, string> = {
  'cs.CL': 'NLP / Language',
  'cs.AI': 'AI / Agents',
  'cs.CV': 'Vision / Multimodal',
  'cs.LG': 'Machine Learning',
  'cs.RO': 'Robotics',
  'stat.ML': 'Statistical ML',
  'cs.IR': 'Information Retrieval',
  'cs.HC': 'HCI',
};

const DOMAIN_RULES: Array<{ domain: string; terms: string[] }> = [
  {
    domain: 'cs.CL',
    terms: [
      'large language model',
      'llm',
      'gpt',
      'llama',
      'mistral',
      'instruction tuning',
      'rlhf',
      'chain of thought',
      'rag',
      'retrieval augmented generation',
      'in-context learning',
      'prompt engineering',
      'hallucination',
      'machine translation',
      'text summarization',
      'question answering',
      'dialogue',
      'speech recognition',
      'named entity recognition',
      'information extraction',
      'knowledge graph',
    ],
  },
  {
    domain: 'cs.AI',
    terms: [
      'agent',
      'agentic',
      'autonomous agent',
      'multi-agent',
      'tool use',
      'planning',
      'reasoning',
      'alignment',
      'ai safety',
      'code generation',
    ],
  },
  {
    domain: 'cs.CV',
    terms: [
      'vision transformer',
      'vision language model',
      'multimodal',
      'image generation',
      'text to image',
      'diffusion',
      'stable diffusion',
      'clip',
      'object detection',
      'segmentation',
      'depth estimation',
      '3d reconstruction',
      'nerf',
      'gaussian splatting',
      'video generation',
      'video understanding',
      'optical flow',
      'super resolution',
      'visual question answering',
      'segment anything',
      'sam',
      'point cloud',
      'lidar',
      'medical image',
      'radiology',
      'pathology',
      'ct scan',
      'mri',
      'digital pathology',
    ],
  },
  {
    domain: 'cs.LG',
    terms: [
      'machine learning',
      'self-supervised learning',
      'contrastive learning',
      'few-shot learning',
      'zero-shot learning',
      'meta-learning',
      'continual learning',
      'federated learning',
      'knowledge distillation',
      'transfer learning',
      'mixture of experts',
      'lora',
      'parameter efficient fine-tuning',
      'quantization',
      'pruning',
      'model compression',
      'efficient transformer',
      'speculative decoding',
      'neural architecture search',
      'graph neural network',
      'gnn',
      'graph transformer',
      'protein structure prediction',
      'alphafold',
      'drug discovery',
      'molecular generation',
      'weather forecasting',
      'climate modeling',
    ],
  },
  {
    domain: 'cs.RO',
    terms: [
      'robotics',
      'robot learning',
      'manipulation',
      'autonomous driving',
      'slam',
    ],
  },
  {
    domain: 'stat.ML',
    terms: [
      'bayesian learning',
      'probabilistic model',
      'statistical learning',
      'uncertainty estimation',
    ],
  },
  {
    domain: 'cs.IR',
    terms: [
      'information retrieval',
      'retrieval system',
      'search ranking',
      'search engine',
    ],
  },
  {
    domain: 'cs.HC',
    terms: [
      'human-computer interaction',
      'hci',
      'user study',
      'human-ai interaction',
    ],
  },
];

export type TodayPickPaper = Pick<ArxivPaper, 'title' | 'summary' | 'authors' | 'affiliations'>;

export function isArxivCategory(value: string): boolean {
  return ARXIV_CATEGORY_RE.test(value.trim());
}

function normalizeArxivCategory(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;

  for (const domain of DOMAIN_PRIORITY) {
    if (domain.toLowerCase() === trimmed.toLowerCase()) return domain;
  }

  if (!isArxivCategory(trimmed)) return undefined;

  const [prefix, suffix] = trimmed.split('.');
  if (!prefix || !suffix) return undefined;
  return `${prefix.toLowerCase()}.${suffix.toUpperCase()}`;
}

export function getActiveTodayPickKeywords(keywords: string[]): string[] {
  if (keywords.length === 0) return [];
  return keywords
    .map((keyword) => keyword.trim())
    .filter((keyword) => keyword.length > 0 && !normalizeArxivCategory(keyword));
}

function inferKeywordDomain(keyword: string): string | undefined {
  const normalized = keyword.trim().toLowerCase();
  if (!normalized) return undefined;
  const directCategory = normalizeArxivCategory(normalized);
  if (directCategory) return directCategory;

  for (const rule of DOMAIN_RULES) {
    if (rule.terms.some((term) => normalized.includes(term) || term.includes(normalized))) {
      return rule.domain;
    }
  }

  return undefined;
}

export function resolvePrimaryPickDomain(keywords: string[]): string {
  const directCategories = keywords
    .map((keyword) => normalizeArxivCategory(keyword))
    .filter(Boolean) as string[];

  if (directCategories.length > 0) {
    const categoryCounts = new Map<string, number>();
    directCategories.forEach((category) => {
      categoryCounts.set(category, (categoryCounts.get(category) ?? 0) + 1);
    });
    return pickHighestPriorityDomain(categoryCounts);
  }

  const activeKeywords = getActiveTodayPickKeywords(keywords);
  const domainCounts = new Map<string, number>();

  for (const keyword of activeKeywords) {
    const domain = inferKeywordDomain(keyword);
    if (!domain) continue;
    domainCounts.set(domain, (domainCounts.get(domain) ?? 0) + 1);
  }

  if (domainCounts.size === 0) {
    return DEFAULT_MIXED_PICK_DOMAINS[0];
  }

  return pickHighestPriorityDomain(domainCounts);
}

export function resolvePickDomains(keywords: string[]): string[] {
  if (keywords.length === 0) return [...DEFAULT_MIXED_PICK_DOMAINS];
  return [resolvePrimaryPickDomain(keywords)];
}

function pickHighestPriorityDomain(counts: Map<string, number>, fallback = 'cs.AI'): string {
  let bestDomain = fallback;
  let bestCount = -1;

  for (const domain of DOMAIN_PRIORITY) {
    const count = counts.get(domain) ?? -1;
    if (count > bestCount) {
      bestDomain = domain;
      bestCount = count;
    }
  }

  if (bestCount >= 0) return bestDomain;

  counts.forEach((count, domain) => {
    if (count > bestCount) {
      bestDomain = domain;
      bestCount = count;
    }
  });

  return bestDomain;
}

export function matchPaperKeywords(
  paper: Pick<ArxivPaper, 'title' | 'summary'>,
  keywords: string[]
): string[] {
  const activeKeywords = getActiveTodayPickKeywords(keywords);
  if (activeKeywords.length === 0) return [];

  const text = `${paper.title} ${paper.summary}`.toLowerCase();
  return activeKeywords.filter((keyword) => text.includes(keyword.toLowerCase()));
}

export function resolvePrestigeLabel(paper: TodayPickPaper): string | undefined {
  return getEliteLabel(paper);
}

export function resolvePrestigeSignals(paper: TodayPickPaper): PrestigeSignal[] {
  return getPrestigeSignals(paper);
}

export function getDomainLabel(category: string): string {
  return DOMAIN_LABELS[category] ?? category;
}
