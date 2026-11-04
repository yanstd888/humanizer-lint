#!/usr/bin/env node
import { promises as fs, realpathSync } from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { fileURLToPath } from 'node:url';
import { analyzeText } from './analyze.mjs';
import { createAnalyzer } from './core/analyzer-core.mjs';
import { calculateMetrics } from './utils/metrics.mjs';

const parentDirectory = '..';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), parentDirectory);
const genres = new Set(['blog-opinion', 'news', 'technical-doc', 'academic-formal', 'legal-formal', 'marketing', 'email-chat']);
const adversaries = new Set(['none', 'synonym-swap', 'humanize-prompt', 'paraphrase']);
const compare = (a, b) => a < b ? -1 : a > b ? 1 : 0;
const round = (n) => n === null ? null : Number(n.toFixed(6));

export function parseOptions(args) {
  const { values, positionals } = parseArgs({ args, allowPositionals: true, options: {
    split: { type: 'string' }, lang: { type: 'string' }, genre: { type: 'string' }, json: { type: 'boolean' }, table: { type: 'boolean' }, sweep: { type: 'string' }, check: { type: 'boolean' },
  } });
  if (positionals.length) throw new Error('Unexpected positional arguments');
  values.split ??= 'dev'; values.lang ??= 'all';
  if (!['dev', 'test', 'all'].includes(values.split)) throw new Error('Invalid split');
  if (!['id', 'en', 'all'].includes(values.lang)) throw new Error('Invalid language');
  if (values.genre && !genres.has(values.genre)) throw new Error('Invalid genre');
  if (values.json && values.table) throw new Error('Choose one output format');
  if (values.sweep) {
    if (values.split !== 'dev') throw new Error('Sweep is allowed only on dev split');
    const match = /^(passScore|burstinessCVLong)=([0-9.,]+)$/.exec(values.sweep);
    if (!match) throw new Error('Invalid sweep parameter');
    const parts = match[2].split(','), nums = parts.map(Number), max = match[1] === 'passScore' ? 100 : 1;
    if (parts.some((s) => !/^\d+(?:\.\d+)?$/.test(s)) || nums.some((n) => !Number.isFinite(n) || n < 0 || n > max)) throw new Error('Invalid sweep values');
    values.sweep = { param: match[1], values: nums };
  }
  return values;
}
function wilson(success, total) {
  if (!total) return null;
  const z = 1.959963984540054, p = success / total, z2 = z * z;
  const center = (p + z2 / (2 * total)) / (1 + z2 / total);
  const margin = z * Math.sqrt(p * (1 - p) / total + z2 / (4 * total * total)) / (1 + z2 / total);
  return [round(Math.max(0, center - margin)), round(Math.min(1, center + margin))];
}
function quantile(sorted, p) {
  if (!sorted.length) return null;
  const at = (sorted.length - 1) * p, low = Math.floor(at), high = Math.ceil(at);
  return round(sorted[low] + (sorted[high] - sorted[low]) * (at - low));
}
export function summarize(rows) {
  const c = { tp: 0, fn: 0, fp: 0, tn: 0, skipped: 0 }, scores = { ai: [], human: [] };
  for (const r of rows) {
    if (r.status === 'SKIP') { c.skipped++; continue; }
    if (r.label === 'ai') c[r.status === 'FAIL' ? 'tp' : 'fn']++;
    else c[r.status === 'FAIL' ? 'fp' : 'tn']++;
    scores[r.label].push(r.score);
  }
  scores.ai.sort((a, b) => a - b); scores.human.sort((a, b) => a - b);
  const ratio = (a, b) => b ? round(a / b) : null;
  let wins = 0;
  for (const a of scores.ai) for (const h of scores.human) wins += a < h ? 1 : a === h ? 0.5 : 0;
  const dist = (s) => ({ n: s.length, median: quantile(s, 0.5), p10: quantile(s, 0.1), p90: quantile(s, 0.9) });
  return { n: rows.length, confusion: c, tpr: ratio(c.tp, c.tp + c.fn), fpr: ratio(c.fp, c.fp + c.tn), precision: ratio(c.tp, c.tp + c.fp), f1: ratio(2 * c.tp, 2 * c.tp + c.fp + c.fn), tprWilson95: wilson(c.tp, c.tp + c.fn), fprWilson95: wilson(c.fp, c.fp + c.tn), auc: ratio(wins, scores.ai.length * scores.human.length), scores: { ai: dist(scores.ai), human: dist(scores.human) } };
}
export function evaluate(input) {
  const rows = input.slice().sort((a, b) => compare(a.id, b.id)), groups = new Map(), ruleMap = new Map();
  for (const r of rows) {
    const key = JSON.stringify([r.lang, r.genre, r.split, r.adversarial ?? 'none']);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(r);
    if (r.split !== 'dev') continue;
    for (const rule of new Set((r.violations ?? []).map((v) => v.ruleId ?? v.type).filter(Boolean))) {
      if (!ruleMap.has(rule)) ruleMap.set(rule, { ruleId: rule, human: 0, ai: 0 });
      ruleMap.get(rule)[r.label]++;
    }
  }
  const byLanguageSplit = {};
  for (const lang of ['en', 'id']) for (const split of ['dev', 'test']) {
    const subset = rows.filter((r) => r.lang === lang && r.split === split);
    if (subset.length) byLanguageSplit[`${lang}:${split}`] = summarize(subset);
  }
  return { aggregate: summarize(rows), byLanguageSplit, groups: [...groups.entries()].sort(([a], [b]) => compare(a, b)).map(([key, items]) => { const [lang, genre, split, adversarial] = JSON.parse(key); return { lang, genre, split, adversarial, ...summarize(items) }; }), rules: [...ruleMap.values()].sort((a, b) => compare(a.ruleId, b.ruleId)) };
}
export async function validateCorpus(dir, manifest, prompts) {
  if (!Array.isArray(manifest)) throw new Error('Manifest must be an array');
  if (!prompts || typeof prompts !== 'object' || Array.isArray(prompts)) throw new Error('Prompts must be an object');
  const ids = new Set(), files = new Set(), result = [], base = await fs.realpath(dir);
  for (const item of manifest) {
    for (const field of ['id', 'file', 'lang', 'label', 'genre', 'split', 'provenance', 'license', 'retrievedDate']) if (typeof item[field] !== 'string' || !item[field].trim()) throw new Error(`Missing ${field}`);
    if (ids.has(item.id)) throw new Error(`Duplicate id: ${item.id}`); ids.add(item.id);
    if (files.has(item.file)) throw new Error(`Duplicate file: ${item.file}`); files.add(item.file);
    if (!['en', 'id'].includes(item.lang) || !['human', 'ai'].includes(item.label) || !genres.has(item.genre) || !['dev', 'test'].includes(item.split)) throw new Error(`Invalid metadata: ${item.id}`);
    if (!Number.isInteger(item.wordCount) || item.wordCount < 1) throw new Error(`Invalid wordCount: ${item.id}`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(item.retrievedDate)) throw new Error(`Invalid retrievedDate: ${item.id}`);
    if (item.label === 'human' && !(Number.isInteger(item.firstPublishedYear) && item.firstPublishedYear <= 2020) && !(typeof item.verifiedHumanNote === 'string' && item.verifiedHumanNote.trim())) throw new Error(`Human provenance required: ${item.id}`);
    if (item.label === 'ai' && (!(typeof item.generator === 'string' && item.generator.trim()) || !(typeof item.promptId === 'string' && Object.hasOwn(prompts, item.promptId)) || !adversaries.has(item.adversarial))) throw new Error(`Invalid AI provenance: ${item.id}`);
    if (path.isAbsolute(item.file) || item.file.split(/[\\/]/).some((s) => s === '..' || s === '')) throw new Error(`Invalid file path: ${item.id}`);
    let target;
    try { target = await fs.realpath(path.resolve(base, item.file)); } catch { throw new Error(`File not found: ${item.file}`); }
    const relative = path.relative(base, target);
    if (relative === '' || relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) throw new Error(`Invalid file path: ${item.id}`);
    const stat = await fs.stat(target);
    if (!stat.isFile() || stat.size > 1048576) throw new Error(`Invalid file size or type: ${item.file}`);
    result.push({ ...item, text: await fs.readFile(target, 'utf8') });
  }
  return result.sort((a, b) => compare(a.id, b.id));
}
async function loadCorpus() {
  const directory = path.join(root, 'benchmark', 'corpus');
  try {
    const [manifest, prompts] = await Promise.all(['manifest.json', 'prompts.json'].map(async (name) => JSON.parse(await fs.readFile(path.join(directory, name), 'utf8'))));
    return await validateCorpus(directory, manifest, prompts);
  } catch (error) {
    if (error.code === 'ENOENT') throw new Error('Evaluation corpus missing: create benchmark/corpus/manifest.json and prompts.json');
    throw error;
  }
}
function checkRegression(report, baseline) {
  const failures = [];
  for (const lang of ['en', 'id']) {
    const key = `${lang}:dev`, before = baseline.byLanguageSplit?.[key], after = report.byLanguageSplit?.[key];
    if (!before || !after) throw new Error(`Missing dev baseline group: ${key}`);
    for (const metric of ['fpr', 'tpr']) {
      if (typeof before[metric] !== 'number' || typeof after[metric] !== 'number') throw new Error(`Insufficient dev labels for ${key} ${metric}`);
      if (metric === 'fpr' ? after[metric] - before[metric] > 0.020000001 : before[metric] - after[metric] > 0.020000001) failures.push(`${key} ${metric} regression`);
    }
  }
  return failures;
}
async function main() {
  const options = parseOptions(process.argv.slice(2));
  const corpus = (await loadCorpus()).filter((r) => (options.split === 'all' || r.split === options.split) && (options.lang === 'all' || r.lang === options.lang) && (!options.genre || r.genre === options.genre));
  if (!corpus.length) throw new Error('No corpus entries match the requested filters');
  const defaultProfile = JSON.parse(await fs.readFile(path.join(root, 'profiles', 'default-human.json'), 'utf8'));
  const run = (analyzer) => evaluate(corpus.map((r) => { const outcome = analyzer(r.text, { language: r.lang, sourcePath: r.file }); return { ...r, status: outcome.status, score: outcome.score, violations: outcome.violations }; }));
  const report = run(analyzeText);
  if (options.sweep) {
    const languages = ['id', 'en', 'es', 'ms', 'fr', 'de', 'pt', 'zh'];
    const rules = Object.fromEntries(await Promise.all(languages.map(async (lang) => [lang, JSON.parse(await fs.readFile(path.join(root, 'rules', `${lang}-slop.json`), 'utf8'))])));
    report.sweep = options.sweep.values.map((value) => {
      const profile = { ...defaultProfile, thresholds: { ...defaultProfile.thresholds, [options.sweep.param]: value } };
      const analyzer = createAnalyzer({ rules, defaultProfile: profile, calculateMetrics }).analyzeText;
      return { parameter: options.sweep.param, value, ...run(analyzer) };
    });
  }
  if (options.check) {
    if (options.split !== 'dev' || options.lang !== 'all' || options.genre || options.sweep) throw new Error('--check requires all languages, dev split and no genre or sweep');
    report.regressions = checkRegression(report, JSON.parse(await fs.readFile(path.join(root, 'benchmark', 'eval-baseline.json'), 'utf8')));
  }
  if (options.table) for (const [name, data] of Object.entries(report.byLanguageSplit)) console.log(`${name}\tn=${data.n}\tTPR=${data.tpr}\tFPR=${data.fpr}\tAUC=${data.auc}`);
  else console.log(JSON.stringify(report, null, 2));
  return report.regressions?.length ? 1 : 0;
}
if (process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))) {
  main().then((code) => { process.exitCode = code; }).catch((error) => { console.error(`eval: ${error.message}`); process.exitCode = 2; });
}
