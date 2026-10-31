import { tokenizeText } from '../scripts/utils/tokenizer.mjs';

const SAMPLE_IDS = new Set(['ai-id', 'human-id', 'ai-en', 'human-en']);
const LANGUAGES = new Set(['en', 'id']);

export function parseDemoQuery(search) {
  const query = new URLSearchParams(search);
  const sample = query.get('sample');
  const language = query.get('lang');
  return {
    sample: SAMPLE_IDS.has(sample) ? sample : null,
    language: LANGUAGES.has(language) ? language : null,
  };
}

function sentenceAt(text, location) {
  const found = /^Paragraph (\d+), Sentence (\d+)/.exec(location ?? '');
  if (!found) return '';
  const [, paragraphIndex, sentenceIndex] = found.map(Number);
  const tokenized = tokenizeText(text, 'auto');
  return tokenized.paragraphs
    .find((paragraph) => paragraph.paragraphIndex === paragraphIndex)
    ?.sentences.find((sentence) => sentence.sentenceIndex === sentenceIndex)
    ?.text ?? '';
}

export function diagnosticExcerpt(text, violation) {
  return sentenceAt(text, violation.location) || violation.match || violation.location || '';
}

export function buildAutoFixPrompt({ text, report }) {
  const violations = report.violations.map((violation) => [
    `- ${violation.type} — ${violation.location}`,
    `  Instruction: ${violation.fixInstruction}`,
  ].join('\n')).join('\n');
  const metrics = Object.entries(report.metrics)
    .filter(([key]) => ['burstinessCV', 'adjacentDelta', 'mattr'].includes(key))
    .map(([key, value]) => `- ${key}: ${value}`)
    .join('\n');

  return `# Targeted prose revision\n\nRewrite only the sentences cited below. Preserve facts, names, numbers, quotations, and the original language. Remove flagged slop without adding unsupported claims. Aim for stronger sentence-length variation and no slop phrases, then re-run humanizer-lint to verify the result.\n\n## Analyzer report\n- Status: ${report.status}\n- Score: ${report.score}/100\n- Language: ${report.language}\n\n## Measured metrics\n${metrics}\n\n## Flagged diagnostics\n${violations}\n\n## Original text\n${text}`;
}
