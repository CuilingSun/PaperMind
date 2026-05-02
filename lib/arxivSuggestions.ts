export interface Suggestion {
  label: string;
  tag?: string; // e.g. arXiv category
}

const SUGGESTIONS: Suggestion[] = [
  // ── Large Language Models ──
  { label: 'large language model' },
  { label: 'LLM reasoning' },
  { label: 'instruction tuning' },
  { label: 'RLHF' },
  { label: 'chain of thought' },
  { label: 'retrieval augmented generation' },
  { label: 'RAG' },
  { label: 'in-context learning' },
  { label: 'prompt engineering' },
  { label: 'hallucination' },
  { label: 'alignment' },
  { label: 'AI safety' },
  { label: 'GPT' },
  { label: 'Llama' },
  { label: 'Mistral' },
  { label: 'mixture of experts' },

  // ── Agents ──
  { label: 'AI agent' },
  { label: 'LLM agent' },
  { label: 'autonomous agent' },
  { label: 'multi-agent system' },
  { label: 'tool use' },
  { label: 'agentic AI' },
  { label: 'planning' },
  { label: 'reasoning' },
  { label: 'code generation' },

  // ── Vision & Multimodal ──
  { label: 'vision transformer' },
  { label: 'vision language model' },
  { label: 'multimodal learning' },
  { label: 'image generation' },
  { label: 'text to image' },
  { label: 'diffusion model' },
  { label: 'stable diffusion' },
  { label: 'CLIP' },
  { label: 'object detection' },
  { label: 'image segmentation' },
  { label: 'semantic segmentation' },
  { label: 'instance segmentation' },
  { label: 'panoptic segmentation' },
  { label: 'depth estimation' },
  { label: '3D reconstruction' },
  { label: 'NeRF' },
  { label: 'Gaussian splatting' },
  { label: 'video generation' },
  { label: 'video understanding' },
  { label: 'optical flow' },
  { label: 'image super resolution' },
  { label: 'visual question answering' },
  { label: 'SAM' },
  { label: 'segment anything' },

  // ── Medical Imaging ──
  { label: 'medical image segmentation' },
  { label: 'medical image analysis' },
  { label: 'radiology' },
  { label: 'pathology' },
  { label: 'CT scan' },
  { label: 'MRI segmentation' },
  { label: 'digital pathology' },
  { label: 'clinical NLP' },

  // ── Generative Models ──
  { label: 'GAN' },
  { label: 'VAE' },
  { label: 'normalizing flow' },
  { label: 'score matching' },
  { label: 'image inpainting' },
  { label: 'image editing' },

  // ── NLP ──
  { label: 'machine translation' },
  { label: 'text summarization' },
  { label: 'sentiment analysis' },
  { label: 'named entity recognition' },
  { label: 'question answering' },
  { label: 'information extraction' },
  { label: 'dialogue systems' },
  { label: 'speech recognition' },
  { label: 'text classification' },
  { label: 'knowledge graph' },

  // ── Reinforcement Learning ──
  { label: 'reinforcement learning' },
  { label: 'deep reinforcement learning' },
  { label: 'multi-agent reinforcement learning' },
  { label: 'offline reinforcement learning' },
  { label: 'model-based RL' },

  // ── Graph & Structure ──
  { label: 'graph neural network' },
  { label: 'GNN' },
  { label: 'graph transformer' },
  { label: 'knowledge distillation' },
  { label: 'federated learning' },
  { label: 'continual learning' },
  { label: 'meta-learning' },
  { label: 'few-shot learning' },
  { label: 'zero-shot learning' },
  { label: 'transfer learning' },
  { label: 'self-supervised learning' },
  { label: 'contrastive learning' },

  // ── Efficiency & Systems ──
  { label: 'model compression' },
  { label: 'neural architecture search' },
  { label: 'quantization' },
  { label: 'pruning' },
  { label: 'efficient transformer' },
  { label: 'LoRA' },
  { label: 'parameter efficient fine-tuning' },
  { label: 'speculative decoding' },

  // ── Robotics & Autonomous ──
  { label: 'robotics' },
  { label: 'autonomous driving' },
  { label: 'robot learning' },
  { label: 'manipulation' },
  { label: 'SLAM' },
  { label: 'point cloud' },
  { label: 'LiDAR' },

  // ── Science AI ──
  { label: 'protein structure prediction' },
  { label: 'AlphaFold' },
  { label: 'drug discovery' },
  { label: 'molecular generation' },
  { label: 'weather forecasting' },
  { label: 'climate modeling' },

  // ── arXiv categories ──
  { label: 'cs.AI', tag: 'Artificial Intelligence' },
  { label: 'cs.CL', tag: 'Computation and Language' },
  { label: 'cs.CV', tag: 'Computer Vision' },
  { label: 'cs.LG', tag: 'Machine Learning' },
  { label: 'cs.RO', tag: 'Robotics' },
  { label: 'cs.NE', tag: 'Neural and Evolutionary Computing' },
  { label: 'cs.IR', tag: 'Information Retrieval' },
  { label: 'cs.HC', tag: 'Human-Computer Interaction' },
  { label: 'stat.ML', tag: 'Machine Learning (Statistics)' },
  { label: 'eess.IV', tag: 'Image and Video Processing' },
  { label: 'q-bio.QM', tag: 'Quantitative Methods (Bio)' },
];

export function getSuggestions(input: string, max = 8): Suggestion[] {
  if (!input.trim()) return [];
  const q = input.toLowerCase();

  const prefix: Suggestion[] = [];
  const contains: Suggestion[] = [];

  for (const s of SUGGESTIONS) {
    const l = s.label.toLowerCase();
    const t = s.tag?.toLowerCase() ?? '';
    if (l.startsWith(q)) {
      prefix.push(s);
    } else if (l.includes(q) || t.includes(q)) {
      contains.push(s);
    }
    if (prefix.length + contains.length >= max * 2) break;
  }

  return [...prefix, ...contains].slice(0, max);
}
