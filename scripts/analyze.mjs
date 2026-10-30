#!/usr/bin/env node
import { readFile, readFileSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';

import { createAnalyzer } from './core/analyzer-core.mjs';
import { calculateMetrics } from './utils/metrics.mjs';

const RULES = {
  id: JSON.parse(readFileSync(new URL('../rules/id-slop.json', import.meta.url), 'utf8')),
  en: JSON.parse(readFileSync(new URL('../rules/en-slop.json', import.meta.url), 'utf8')),
};
const DEFAULT_PROFILE = JSON.parse(readFileSync(new URL('../profiles/default-human.json', import.meta.url), 'utf8'));
const { analyzeText } = createAnalyzer({ rules: RULES, defaultProfile: DEFAULT_PROFILE, calculateMetrics });

export { analyzeText };

function formatHuman(result) {
  const lines = [`Status: ${result.status}`, `Score: ${result.score}`, `Language: ${result.language}`];
  if (result.warning) lines.push(`Warning: ${result.warning}`);
  lines.push('', 'Metrics:');
  for (const [name, value] of Object.entries(result.metrics)) lines.push(`  ${name}: ${value}`);
  if (result.violations.length) lines.push('', 'Violations:');
  for (const violation of result.violations) lines.push(`  ${violation.type} | ${violation.location} | ${violation.fixInstruction}`);
  return `${lines.join('\n')}\n`;
}

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks.map((chunk) => Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))).toString('utf8');
}

export async function runAnalyzeCli(argv, io = {}) {
  const stdout = io.stdout ?? ((value) => process.stdout.write(value));
  const stderr = io.stderr ?? ((value) => process.stderr.write(value));
  const stdin = io.stdin ?? readStdin;
  try {
    const { values } = parseArgs({
      args: argv,
      options: {
        file: { type: 'string' },
        stdin: { type: 'boolean' },
        lang: { type: 'string', default: 'auto' },
        profile: { type: 'string' },
        json: { type: 'boolean' },
        help: { type: 'boolean' },
      },
      strict: true,
      allowPositionals: false,
    });
    if (values.help) {
      stdout('Usage: humanizer-lint (--file <path> | --stdin) [--lang id|en|auto] [--profile <path>] [--json]\n');
      return 0;
    }
    if (Boolean(values.file) === Boolean(values.stdin)) throw new Error('Choose exactly one input: --file or --stdin');
    if (!['id', 'en', 'auto'].includes(values.lang)) throw new Error('--lang must be id, en, or auto');
    if (values.stdin && io.stdin == null && process.stdin.isTTY) throw new Error('--stdin requires piped input');
    const text = values.file ? await new Promise((resolve, reject) => readFile(values.file, 'utf8', (error, data) => error ? reject(error) : resolve(data))) : await stdin();
    const profile = values.profile ? JSON.parse(await new Promise((resolve, reject) => readFile(values.profile, 'utf8', (error, data) => error ? reject(error) : resolve(data)))) : undefined;
    const result = analyzeText(text, { language: values.lang, profile });
    stdout(values.json ? `${JSON.stringify(result, null, 2)}\n` : formatHuman(result));
    return result.status === 'FAIL' ? 1 : 0;
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