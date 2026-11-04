#!/usr/bin/env node
import { promises as fs } from 'node:fs';
const { readFile, readdir, writeFile, rename } = fs;
import { parseArgs } from 'node:util';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { tokenizeText } from './utils/tokenizer.mjs';
import { sanitizeMarkdown } from './utils/sanitizer.mjs';
import { coefficientOfVariation, adjacentDelta, mattr, MIN_SENTENCES_FOR_RHYTHM } from './utils/metrics-core.mjs';

const round = (n) => Number(n.toFixed(6));
async function readCorpus(dir, language) {
  const files = (await readdir(dir, { withFileTypes: true })).filter((f) => f.isFile() && /\.(?:txt|md)$/iu.test(f.name)).map((f) => f.name).sort();
  if (!files.length) throw new Error(`No .txt or .md documents in ${dir}`);
  const frequencies = new Map();
  const variants = new Map();
  const metrics = { cv: [], adjacentDelta: [], mattr: [] };
  for (const file of files) {
    const text = sanitizeMarkdown(await readFile(path.join(dir, file), 'utf8'));
    const parsed = tokenizeText(text, language);
    const seen = new Set();
    for (const sentence of parsed.sentences) {
      for (let size = 2; size <= 5; size += 1) {
        for (let i = 0; i + size <= sentence.words.length; i += 1) {
          const tokens = sentence.words.slice(i, i + size).join(' ');
          const raw = tokens.toLocaleLowerCase('und');
          const phrase = tokens.normalize('NFKC').toLocaleLowerCase('und');
          seen.add(phrase);
          if (!variants.has(phrase)) variants.set(phrase, new Set());
          variants.get(phrase).add(raw);
        }
      }
    }
    for (const phrase of seen) frequencies.set(phrase, (frequencies.get(phrase) ?? 0) + 1);
    if (parsed.words.length) metrics.mattr.push(round(mattr(parsed.words)));
    if (parsed.sentences.length >= MIN_SENTENCES_FOR_RHYTHM) {
      const lengths = parsed.sentences.map((s) => s.wordCount);
      metrics.cv.push(round(coefficientOfVariation(lengths)));
      metrics.adjacentDelta.push(round(adjacentDelta(lengths)));
    }
  }
  return { documents: files.length, metrics, frequencies, variants };
}
function quantile(values, fraction) {
  if (!values.length) return null;
  const ordered = [...values].sort((a, b) => a - b);
  return ordered[Math.floor((ordered.length - 1) * fraction)];
}
export async function minePatterns(aiDir, humanDir, language = 'en') {
  const [ai, human] = await Promise.all([readCorpus(aiDir, language), readCorpus(humanDir, language)]);
  const candidates = [...ai.frequencies].filter(([, n]) => n >= 3).map(([phrase, aiDocuments]) => {
    const humanDocuments = human.frequencies.get(phrase) ?? 0;
    const aiRate = aiDocuments / ai.documents; const humanRate = humanDocuments / human.documents;
    return { phrase, variants: [...ai.variants.get(phrase)].sort(), aiDocuments, humanDocuments, aiRate: round(aiRate), humanRate: round(humanRate), differentialRatio: round((aiRate + 1 / ai.documents) / (humanRate + 1 / human.documents)) };
  }).filter((item) => item.humanRate <= 0.1 && item.aiRate > item.humanRate).sort((a, b) => b.differentialRatio - a.differentialRatio || (a.phrase < b.phrase ? -1 : a.phrase > b.phrase ? 1 : 0));
  return { language, corpus: { ai: { documents: ai.documents, metrics: ai.metrics }, human: { documents: human.documents, metrics: human.metrics } }, exploratoryBaseline: Object.fromEntries(Object.entries(human.metrics).map(([key, values]) => [key, { sampleCount: values.length, p10: quantile(values, 0.1), median: quantile(values, 0.5) }])), caveat: 'Exploratory corpus statistics only; thresholds are not validated and require human review.', candidates };
}
async function main() {
  const { values } = parseArgs({ options: { 'ai-dir': { type: 'string' }, 'human-dir': { type: 'string' }, lang: { type: 'string', default: 'en' }, write: { type: 'boolean', default: false } } });
  if (!values['ai-dir'] || !values['human-dir'] || !/^(en|id|es|ms|fr|de|pt|zh)$/u.test(values.lang)) throw new Error('Usage: mine-patterns --ai-dir <dir> --human-dir <dir> [--lang en|id|es|ms|fr|de|pt|zh] [--write]');
  const report = await minePatterns(values['ai-dir'], values['human-dir'], values.lang);
  if (values.write) {
    const filename = path.join(path.dirname(path.dirname(fileURLToPath(import.meta.url))), 'rules', `${values.lang}-slop.json`);
    const pack = JSON.parse(await readFile(filename, 'utf8'));
    const existing = new Set(pack.patterns.map((rule) => rule.pattern));
    const existingPhrases = new Set(pack.patterns.map((rule) => rule.minedPhrase).filter(Boolean));
    const ids = new Set(pack.patterns.map((rule) => rule.id));
    let n = 1; let added = 0;
    for (const item of report.candidates) {
      const escaped = item.phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      // ponytail: NFC/NFD per token only; other equivalent forms need review.
      const separator = values.lang === 'zh' ? '[\\s\\p{P}]*' : '[\\s\\p{P}]+';
      const forms = [...new Set([item.phrase, ...item.variants])].sort().map((form) => form.split(' ').map((token) => {
        const variants = [...new Set([token.normalize('NFC'), token.normalize('NFD')])].sort().map((variant) => variant.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
        return variants.length > 1 ? `(?:${variants.join('|')})` : variants[0];
      }).join(separator));
      const wrap = (body) => values.lang === 'zh' ? body : `(?<![\\p{L}\\p{N}\\p{M}])${body}(?![\\p{L}\\p{N}\\p{M}])`;
      const oldWrap = (body) => values.lang === 'zh' ? body : `(?<![\\p{L}\\p{N}])${body}(?![\\p{L}\\p{N}])`;
      const pattern = wrap(forms.length > 1 ? `(?:${forms.join('|')})` : forms[0]);
      const previousPattern = oldWrap(escaped.replaceAll(' ', separator));
      const legacyPattern = `(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`;
      if (existingPhrases.has(item.phrase) || existing.has(pattern) || existing.has(previousPattern) || existing.has(legacyPattern)) continue;
      while (ids.has(`MINED_${values.lang.toUpperCase()}_${n}`)) n += 1;
      const id = `MINED_${values.lang.toUpperCase()}_${n++}`;
      pack.patterns.push({ id, type: 'SLOP_PHRASE', pattern, minedPhrase: item.phrase, source: 'mined', fixInstruction: 'Review this corpus-derived phrase in context; preserve accurate meaning.' });
      ids.add(id); existing.add(pattern); existingPhrases.add(item.phrase); added += 1;
    }
    if (added) {
      const temp = `${filename}.${process.pid}.tmp`;
      await writeFile(temp, `${JSON.stringify(pack, null, 2)}\n`, { flag: 'wx' });
      await rename(temp, filename);
    }
    report.writtenRules = added;
  }
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch((error) => { process.stderr.write(`ERROR: ${error.message}\n`); process.exitCode = 2; });
