#!/usr/bin/env node
import { readFile, readFileSync, realpathSync, promises as fs } from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';

import { createAnalyzer } from './core/analyzer-core.mjs';
import { calculateMetrics } from './utils/metrics.mjs';

const projectRoot = '..';
const projectFileUrl = (...segments) => new URL([projectRoot, ...segments].join('/'), import.meta.url);
const readProjectJson = (...segments) => JSON.parse(readFileSync(projectFileUrl(...segments), 'utf8'));
const RULES = Object.fromEntries(['id', 'en', 'es', 'ms', 'fr', 'de', 'pt', 'zh'].map((language) => [
  language,
  readProjectJson('rules', `${language}-slop.json`),
]));
const DEFAULT_PROFILE = readProjectJson('profiles', 'default-human.json');
const { analyzeText } = createAnalyzer({ rules: RULES, defaultProfile: DEFAULT_PROFILE, calculateMetrics });

export { analyzeText };

function formatHuman(result, includeDeliveryGate = false) {
  const lines = [`Status: ${result.status}`, `Score: ${result.score}`, `Language: ${result.language}`, `Rule pack: ${result.rulePack}`, `Suppressed: ${result.suppressed.length}`];
  if (result.warning) lines.push(`Warning: ${result.warning}`);
  for (const warning of result.ignoreWarnings ?? []) lines.push(`Warning: ${warning}`);
  lines.push('', 'Metrics:');
  for (const [name, value] of Object.entries(result.metrics)) lines.push(`  ${name}: ${value}`);
  if (result.violations.length) lines.push('', 'Violations:');
  for (const violation of result.violations) lines.push(`  ${violation.type} | ${violation.location} | ${violation.fixInstruction}`);
  if (includeDeliveryGate) {
    lines.push('', 'Delivery Gate:');
    for (const [name, block] of Object.entries(result.deliveryGate)) lines.push(`  ${name}: ${JSON.stringify(block)}`);
  }
  return `${lines.join('\n')}\n`;
}

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks.map((chunk) => Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))).toString('utf8');
}

async function expandFilePattern(pattern) {
  if (!/[*?]/u.test(pattern)) return [pattern];
  const absolute = path.resolve(pattern);
  const root = path.parse(absolute).root;
  const parts = absolute.slice(root.length).split(path.sep);
  const matches = [];
  async function visit(dir, index) {
    if (index === parts.length) {
      try { if ((await fs.stat(dir)).isFile()) matches.push(dir); } catch (error) { if (error.code !== 'ENOENT' && error.code !== 'ENOTDIR') throw error; }
      return;
    }
    const part = parts[index];
    if (part === '**') {
      await visit(dir, index + 1);
      let entries;
      try { entries = await fs.readdir(dir, { withFileTypes: true }); } catch (error) { if (error.code === 'ENOENT' || error.code === 'ENOTDIR') return; throw error; }
      for (const entry of entries) if (entry.isDirectory()) await visit(path.join(dir, entry.name), index);
      return;
    }
    if (!/[*?]/u.test(part)) { await visit(path.join(dir, part), index + 1); return; }
    const expression = new RegExp(`^${part.replace(/[.+^${}()|[\]\\]/gu, '\\$&').replaceAll('*', '.*').replaceAll('?', '.')}$`, 'u');
    let entries;
    try { entries = await fs.readdir(dir, { withFileTypes: true }); } catch (error) { if (error.code === 'ENOENT' || error.code === 'ENOTDIR') return; throw error; }
    for (const entry of entries) {
      if (expression.test(entry.name) && (index === parts.length - 1 ? entry.isFile() : entry.isDirectory())) await visit(path.join(dir, entry.name), index + 1);
    }
  }
  await visit(root, 0);
  if (!matches.length) throw new Error(`No files match: ${pattern}`);
  return matches.sort();
}

export async function runAnalyzeCli(argv, io = {}) {
  const stdout = io.stdout ?? ((value) => process.stdout.write(value));
  const stderr = io.stderr ?? ((value) => process.stderr.write(value));
  const stdin = io.stdin ?? readStdin;
  try {
    const { values, positionals } = parseArgs({
      args: argv,
      options: {
        file: { type: 'string' },
        stdin: { type: 'boolean' },
        'stdin-filename': { type: 'string' },
        lang: { type: 'string', default: 'auto' },
        profile: { type: 'string' },
        allow: { type: 'string' },
        'min-score': { type: 'string' },
        domain: { type: 'string', default: 'auto' },
        'no-domain-lint': { type: 'boolean' },
        'no-ignore': { type: 'boolean' },
        json: { type: 'boolean' },
        brief: { type: 'boolean' },
        'delivery-gate': { type: 'boolean' },
        help: { type: 'boolean' },
      },
      strict: true,
      allowPositionals: true,
    });
    // Node 18.3 parseArgs does not apply option defaults.
    values.lang ??= 'auto';
    values.domain ??= 'auto';
    if (values.help) {
      stdout('Usage: humanizer-lint (--file <path> | --stdin | <files...>) [--stdin-filename <name>] [--lang auto|universal|<ISO-639-1>] [--profile <path>] [--allow <phrases>] [--min-score <0-100>] [--domain auto|prose|copywriting|code|ui] [--no-domain-lint] [--no-ignore] [--json] [--brief] [--delivery-gate]\n');
      return 0;
    }
    if ((values.stdin && (values.file || positionals.length)) || (values.file && positionals.length) || (!values.stdin && !values.file && !positionals.length)) throw new Error('Choose exactly one input: --file, file paths, or --stdin');
    if (values.brief && !values.json) throw new Error('--brief requires --json');
    if (values['stdin-filename'] !== undefined && (!values.stdin || !values['stdin-filename'].trim())) throw new Error('--stdin-filename requires --stdin and a nonempty name');
    if (!/^(?:auto|universal|[a-z]{2})$/u.test(values.lang)) throw new Error('--lang must be auto, universal, or an ISO 639-1 code');
    if (!['auto', 'prose', 'copywriting', 'code', 'ui'].includes(values.domain)) throw new Error('--domain must be auto, prose, copywriting, code, or ui');
    if (values.stdin && io.stdin == null && process.stdin.isTTY) throw new Error('--stdin requires piped input');
    const minimumScore = values['min-score'] == null ? null : Number(values['min-score']);
    if (minimumScore !== null && (!/^(?:\d+(?:\.\d+)?)$/.test(values['min-score']) || minimumScore < 0 || minimumScore > 100)) throw new Error('--min-score must be a number from 0 to 100');
    const profile = values.profile ? JSON.parse(await new Promise((resolve, reject) => readFile(values.profile, 'utf8', (error, data) => error ? reject(error) : resolve(data)))) : undefined;
    const files = values.stdin ? [null] : [...new Set((await Promise.all((values.file ? [values.file] : positionals).map(expandFilePattern))).flat())];
    const reports = [];
    for (const file of files) {
      const text = file ? await new Promise((resolve, reject) => readFile(file, 'utf8', (error, data) => error ? reject(error) : resolve(data))) : await stdin();
      const result = analyzeText(text, { language: values.lang, profile, sourcePath: file ?? values['stdin-filename'], domain: values['no-domain-lint'] ? 'prose' : values.domain, allowlist: values.allow ? values.allow.split(',') : [], noIgnore: values['no-ignore'] });
      reports.push({ file, result });
    }
    const multi = reports.length > 1;
    const project = (result) => values.brief ? {
      ...Object.fromEntries(['schemaVersion', 'status', 'score', 'targets', 'violations', 'ignoreWarnings', 'allowlistApplied'].map((key) => [key, result[key]])),
      suppressed: result.suppressed.map(({ type, ruleId, location, charOffset, directive, match, sourceScope }) => ({ type, ruleId, location, charOffset, directive, match, sourceScope })),
      deliveryGate: { rhythmAndStylometry: { status: result.deliveryGate.rhythmAndStylometry.status }, finalVerdict: { status: result.status, score: result.score } },
    } : result;
    const jsonOutput = multi ? reports.map(({ file, result }) => ({ file, result: project(result) })) : project(reports[0].result);
    stdout(values.json ? `${JSON.stringify(jsonOutput, null, values.brief ? 0 : 2)}\n` : reports.map(({ file, result }) => `${multi ? `File: ${file}\n` : ''}${formatHuman(result, values['delivery-gate'])}`).join('\n'));
    return reports.some(({ result }) => result.status === 'FAIL' || (minimumScore !== null && result.score < minimumScore)) ? 1 : 0;
  } catch (error) {
    stderr(`ERROR: ${error.message}\n`);
    return 2;
  }
}

function currentModulePath() {
  let value = decodeURIComponent(new URL(import.meta.url).pathname);
  if (/^\/[A-Za-z]:/.test(value)) value = value.slice(1);
  return path.resolve(value);
}

function isMainModule() {
  if (!process.argv[1]) return false;
  try {
    return realpathSync(process.argv[1]) === realpathSync(currentModulePath());
  } catch {
    return false;
  }
}

if (isMainModule()) {
  process.exitCode = await runAnalyzeCli(process.argv.slice(2));
}