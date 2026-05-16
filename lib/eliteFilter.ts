// OpenAlex institution IDs — used for accurate affiliation filtering in /works API.
// Names are display-only; IDs are the canonical filter keys.
export const ELITE_INSTITUTION_IDS: string[] = [
  'I4210161460',  // OpenAI
  'I4210090411',  // Google DeepMind
  'I4387930290',  // Anthropic
  'I1291425158',  // Google (US) — covers Google Research
  'I4210164937',  // Microsoft Research (UK/Redmond)
  'I4210113369',  // Microsoft Research Asia
  'I4210124949',  // Microsoft Research India
  'I4210156221',  // Allen Institute for Artificial Intelligence
  'I4387154989',  // Hugging Face
  'I97018004',    // Stanford University
  'I63966007',    // Massachusetts Institute of Technology
  'I74973139',    // Carnegie Mellon University
  'I20089843',    // Princeton University
  'I136199984',   // Harvard University
  'I40120149',    // University of Oxford
  'I241749',      // University of Cambridge
  'I35440088',    // ETH Zurich
  'I185261750',   // University of Toronto
  'I4210164802',  // Mila – Quebec AI Institute
  'I201448701',   // University of Washington
];

// Display names kept for chip labels and UI matching only (not used as API filters).
export const ELITE_INSTITUTIONS = [
  'OpenAI',
  'Google DeepMind',
  'Google Research',
  'Anthropic',
  'Microsoft Research',
  'Allen Institute for Artificial Intelligence',
  'Hugging Face',
  'Stanford University',
  'Massachusetts Institute of Technology',
  'Carnegie Mellon University',
  'Princeton University',
  'Harvard University',
  'University of Oxford',
  'University of Cambridge',
  'ETH Zurich',
  'University of Toronto',
  'Mila',
  'University of Washington',
];

// Default research areas used when the user has set no preference keywords.
export const DEFAULT_AREA_KEYWORDS = [
  'machine learning',
  'large language model',
  'reinforcement learning',
  'agent',
];

// Maps substrings found in OpenAlex affiliation display_name → short chip label.
// Order matters: more specific entries must come before generic ones (e.g. DeepMind before Google).
// Matching is done with word-boundary regex (see AFFILIATION_LABEL_RE below).
export const AFFILIATION_LABEL_MAP: [string, string][] = [
  // AI labs — most specific first
  ['openai',                                       'OpenAI'],
  ['deepmind',                                     'DeepMind'],
  ['anthropic',                                    'Anthropic'],
  ['allen institute for artificial intelligence',  'AI2'],
  ['hugging face',                                 'Hugging Face'],
  ['microsoft research',                           'Microsoft Research'],
  ['facebook ai research',                         'Meta AI'],
  ['meta ai',                                      'Meta AI'],
  ['facebook',                                     'Meta AI'],
  ['nvidia research',                              'NVIDIA'],
  ['nvidia',                                       'NVIDIA'],
  ['bytedance',                                    'ByteDance'],
  ['deepseek',                                     'DeepSeek'],
  ['shanghai artificial intelligence laboratory',  'SHLAB'],
  ['google',                                       'Google'],
  // Universities
  ['tsinghua',                                     'Tsinghua'],
  ['peking university',                            'PKU'],
  ['beida',                                        'PKU'],
  ['stanford',                                     'Stanford'],
  ['massachusetts institute of technology',        'MIT'],
  ['carnegie mellon',                              'CMU'],
  ['princeton',                                    'Princeton'],
  ['harvard',                                      'Harvard'],
  ['university of oxford',                         'Oxford'],
  ['university of cambridge',                      'Cambridge'],
  ['eth zurich',                                   'ETH Zürich'],
  ['mila',                                         'Mila'],
  ['university of toronto',                        'U Toronto'],
  ['university of washington',                     'UW'],
  ['new york university',                          'NYU'],
  ['columbia university',                          'Columbia'],
  ['national university of singapore',             'NUS'],
  ['uc berkeley',                                  'UC Berkeley'],
  ['university of california, berkeley',           'UC Berkeley'],
];

// Precomputed word-boundary regexes — prevents substring false matches (e.g. 'mila' hitting 'Milad').
// Lookbehind/lookahead check that the key is not surrounded by other letters.
const AFFILIATION_LABEL_RE: [RegExp, string][] = AFFILIATION_LABEL_MAP.map(([key, label]) => [
  new RegExp(`(?<![a-z])${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![a-z])`),
  label,
]);

export interface EliteAuthor {
  display: string;    // shown as chip label
  lastName: string;   // for matching in paper.authors
  firstName: string;  // required — avoids false positives on last name alone
}

// Notable researchers — both names stored so matching is unambiguous
export const ELITE_AUTHORS: EliteAuthor[] = [
  // General AI
  { display: 'Geoffrey Hinton',    lastName: 'Hinton',      firstName: 'Geoffrey' },
  { display: 'Yann LeCun',         lastName: 'LeCun',       firstName: 'Yann' },
  { display: 'Yoshua Bengio',      lastName: 'Bengio',      firstName: 'Yoshua' },
  { display: 'Demis Hassabis',     lastName: 'Hassabis',    firstName: 'Demis' },
  // NLP / LLM
  { display: 'Ilya Sutskever',     lastName: 'Sutskever',   firstName: 'Ilya' },
  { display: 'Alec Radford',       lastName: 'Radford',     firstName: 'Alec' },
  { display: 'Luke Zettlemoyer',   lastName: 'Zettlemoyer', firstName: 'Luke' },
  { display: 'Dan Jurafsky',       lastName: 'Jurafsky',    firstName: 'Dan' },
  { display: 'Graham Neubig',      lastName: 'Neubig',      firstName: 'Graham' },
  { display: 'Jacob Devlin',       lastName: 'Devlin',      firstName: 'Jacob' },
  { display: 'Percy Liang',        lastName: 'Liang',       firstName: 'Percy' },
  // Vision
  { display: 'Ross Girshick',      lastName: 'Girshick',    firstName: 'Ross' },
  { display: 'Trevor Darrell',     lastName: 'Darrell',     firstName: 'Trevor' },
  { display: 'Alexei Efros',       lastName: 'Efros',       firstName: 'Alexei' },
  { display: 'Jitendra Malik',     lastName: 'Malik',       firstName: 'Jitendra' },
  { display: 'Olga Russakovsky',   lastName: 'Russakovsky', firstName: 'Olga' },
  { display: 'Fei-Fei Li',         lastName: 'Li',          firstName: 'Fei-Fei' },
  // RL / Robotics
  { display: 'Pieter Abbeel',      lastName: 'Abbeel',      firstName: 'Pieter' },
  { display: 'Sergey Levine',      lastName: 'Levine',      firstName: 'Sergey' },
  { display: 'Chelsea Finn',       lastName: 'Finn',        firstName: 'Chelsea' },
  { display: 'Oriol Vinyals',      lastName: 'Vinyals',     firstName: 'Oriol' },
  { display: 'Doina Precup',       lastName: 'Precup',      firstName: 'Doina' },
  // Generative models
  { display: 'Ian Goodfellow',     lastName: 'Goodfellow',  firstName: 'Ian' },
  { display: 'Prafulla Dhariwal',  lastName: 'Dhariwal',    firstName: 'Prafulla' },
  // Graph / Theory
  { display: 'Jure Leskovec',      lastName: 'Leskovec',    firstName: 'Jure' },
  { display: 'Bernhard Scholkopf', lastName: 'Scholkopf',   firstName: 'Bernhard' },
];

export type PrestigeSignal = 'institution' | 'author';

interface ElitePaperLike {
  authors: string[];
  affiliations: string[];
}

export function resolveInstitutionLabel(
  paper: ElitePaperLike
): string | undefined {
  const allAffs = paper.affiliations.join(' ').toLowerCase();
  for (const [re, label] of AFFILIATION_LABEL_RE) {
    if (re.test(allAffs)) return label;
  }

  // Some arXiv papers list the lab/company as an author name instead of an affiliation.
  const authorStr = paper.authors.join(' ').toLowerCase();
  for (const [re, label] of AFFILIATION_LABEL_RE) {
    if (re.test(authorStr)) return label;
  }

  return undefined;
}

export function resolveEliteAuthorLabel(
  paper: ElitePaperLike
): string | undefined {
  const authorStr = paper.authors.join(' ').toLowerCase();
  for (const a of ELITE_AUTHORS) {
    if (
      authorStr.includes(a.lastName.toLowerCase()) &&
      authorStr.includes(a.firstName.toLowerCase())
    ) {
      return a.display;
    }
  }
  return undefined;
}

export function getPrestigeSignals(
  paper: ElitePaperLike
): PrestigeSignal[] {
  const signals: PrestigeSignal[] = [];
  if (resolveInstitutionLabel(paper)) signals.push('institution');
  if (resolveEliteAuthorLabel(paper)) signals.push('author');
  return signals;
}

export function getEliteLabel(
  paper: ElitePaperLike
): string | undefined {
  return resolveInstitutionLabel(paper) ?? resolveEliteAuthorLabel(paper);
}
