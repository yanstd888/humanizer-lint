import { DEFAULT_ID_EXCLUSIVE_WORDS, DEFAULT_MS_EXCLUSIVE_WORDS } from './editorial-fallbacks.mjs';
const parentDirectory = '..';
const utilityModule = (...segments) => new URL([parentDirectory, 'utils', ...segments].join('/'), import.meta.url);
const { isCJKText } = await import(utilityModule('tokenizer.mjs'));
const HAN = /[\u4e00-\u9fff]/gu;
const KANA = /[\u3040-\u30ff]/u;
const ARABIC = /[\u0600-\u06ff]/u;
const ID_EXCLUSIVE_WORDS = new Set(DEFAULT_ID_EXCLUSIVE_WORDS);
const MS_EXCLUSIVE_WORDS = new Set(DEFAULT_MS_EXCLUSIVE_WORDS);

export function detectLanguage(text, words, rules) {
  if (KANA.test(text)) return 'ja';
  if (ARABIC.test(text)) return 'ar';
  const hanCount = (text.match(HAN) ?? []).length;
  if (hanCount > 0 && isCJKText(text)) return 'zh';

  const scores = new Map();
  for (const [language, rule] of Object.entries(rules)) {
    let score = 0;
    const stopwords = new Set(rule.stopwords ?? []);
    for (const word of words) if (stopwords.has(word)) score += 1;
    scores.set(language, score);
  }
  if (scores.has('id') && scores.has('ms')) {
    const idExclusive = words.filter((word) => ID_EXCLUSIVE_WORDS.has(word)).length;
    const msExclusive = words.filter((word) => MS_EXCLUSIVE_WORDS.has(word)).length;
    scores.set('id', scores.get('id') + idExclusive * 2);
    scores.set('ms', scores.get('ms') + msExclusive * 2);
  }

  const [language, score] = [...scores.entries()].sort((left, right) => right[1] - left[1])[0] ?? ['universal', 0];
  return score >= Math.max(2, Math.ceil(words.length * 0.04)) ? language : 'universal';
}

export function mattrThreshold(thresholds, language, tokenized) {
  if (typeof thresholds.mattr?.[language] === 'number') return thresholds.mattr[language];
  return isCJKText(tokenized.words.join('')) ? 0.68 : 0.72;
}
