#!/usr/bin/env node
// preserve-check: verify that protected tokens (numbers, dates, URLs, quotes,
// inline code, fenced code) survive from a "before" text into an "after" text.
// Deterministic, offline, no dependencies. Exit 0 = extracted token counts match,
// 1 = missing or added extracted tokens, 2 = invalid arguments/inputs.
// ponytail: compares token counts, not attribution or meaning; use human review for facts.
import { readFileSync, realpathSync } from 'node:fs';
import path from 'node:path';

const normalizeEol = (text) => text.replaceAll('\r\n', '\n').replaceAll('\r', '\n');
const key = (token) => token;

function extractFencedBlocks(text) {
  const lines = text.split('\n');
  const blocks = [];
  const restLines = [];
  let inBlock = false;
  let fenceChar = '';
  let fenceLen = 0;
  let currentBlockLines = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!inBlock) {
      const match = line.match(/^[ ]{0,3}(`{3,}|~{3,})([^\n]*)$/);
      if (match && (!match[1].startsWith('`') || !match[2].includes('`'))) {
        inBlock = true;
        fenceChar = match[1][0];
        fenceLen = match[1].length;
        currentBlockLines = [line];
      } else {
        restLines.push(line);
      }
    } else {
      currentBlockLines.push(line);
      const closeMatch = line.match(/^[ ]{0,3}(`+|~+)[ \t]*$/);
      if (closeMatch && closeMatch[1][0] === fenceChar && closeMatch[1].length >= fenceLen) {
        inBlock = false;
        blocks.push(currentBlockLines.join('\n'));
        currentBlockLines = [];
        restLines.push('');
      }
    }
  }
  if (inBlock && currentBlockLines.length > 0) {
    blocks.push(currentBlockLines.join('\n'));
    restLines.push('');
  }
  return { blocks, rest: restLines.join('\n') };
}

function cleanUrl(raw) {
  let url = raw.replace(/[.,;:!]+$/, '');
  while (url.endsWith(')') && (url.match(/\(/g) || []).length < (url.match(/\)/g) || []).length) {
    url = url.slice(0, -1);
  }
  return url.replace(/[.,;:!]+$/, '');
}

// ponytail: two-pass token extraction with delimiter stripping; digit grouping
// is preserved as an opaque token, not arithmetic-normalized. Currency codes are
// limited and a quote directly after a digit is treated as a measurement mark;
// use a structured parser if broader formats or disambiguation become necessary.
export function extractProtectedTokens(text) {
  const normalized = normalizeEol(text);
  const { blocks, rest } = extractFencedBlocks(normalized);
  const count = (list) => {
    const counts = new Map();
    for (const token of list) counts.set(token, (counts.get(token) ?? 0) + 1);
    return counts;
  };
  const pull = (text, regex, pick = (match) => match[1] ?? match[0]) => {
    const found = [...text.matchAll(regex)].map(pick);
    return { found, stripped: text.replace(regex, ' ') };
  };
  const { found: inlineCode, stripped: afterCode } = pull(
    rest,
    /(?<!`)(`+)([\s\S]+?)(?<!`)\1(?!`)/g,
    (m) => m[2]
  );
  const { found: quote, stripped: afterQuotes } = pull(
    afterCode,
    /\\"((?:\\\\|\\"|[^"\\])+?)\\"|(?<![\\\d])"((?:\\.|[^"\\])+?)(?<!\\)"|“((?:\\.|[^“”\\])+?)”/gs,
    (m) => m[1] ?? m[2] ?? m[3]
  );
  const { found: url, stripped: afterUrls } = pull(
    afterQuotes,
    /https?:\/\/[^\s<>\[\]{}"'`]+/gi,
    (m) => cleanUrl(m[0])
  );
  const datePattern = /\b\d{4}[-/]\d{2}[-/]\d{2}(?:[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?)?\b|(?<![\p{L}\p{N}])\d{2}:\d{2}(?::\d{2})?(?:Z|[+-]\d{2}:?\d{2})?(?:\s*(?:AM|PM|am|pm))?(?![\p{L}\p{N}])/gu;
  const { found: date, stripped: afterDates } = pull(
    afterUrls,
    datePattern,
    (m) => m[0]
  );
  const currencyPattern = /(?:\([+-]?\s*(?:(?:[$€£¥]|\b(?:USD|EUR|IDR|GBP|JPY|SGD|AUD|CAD|CHF|CNY|NZD)\b|\bRp\.?(?=\s|\d|$))\s*\d+(?:[.,]\d+)*(?:[kKmMbBtT](?![\p{L}\p{N}]))?|\d+(?:[.,]\d+)*(?:[kKmMbBtT](?![\p{L}\p{N}]))?\s*(?:[$€£¥]|\b(?:USD|EUR|IDR|GBP|JPY|SGD|AUD|CAD|CHF|CNY|NZD)\b|\bRp\.?(?=\s|\d|$)))(?:\s*%)?\s*\)|(?:(?<![\p{L}\p{N}])[+-]\s*)?(?:[$€£¥]|\b(?:USD|EUR|IDR|GBP|JPY|SGD|AUD|CAD|CHF|CNY|NZD)\b|\bRp\.?(?=\s|\d|$))\s*(?:[+-]\s*)?\d+(?:[.,]\d+)*(?:[kKmMbBtT](?![\p{L}\p{N}]))?(?:\s*%)?|(?:(?<![\p{L}\p{N}])[+-]\s*)?\d+(?:[.,]\d+)*(?:[kKmMbBtT](?![\p{L}\p{N}]))?(?:\s*%)?\s*(?:[$€£¥]|\b(?:USD|EUR|IDR|GBP|JPY|SGD|AUD|CAD|CHF|CNY|NZD)\b|\bRp\.?(?=\s|\d|$)))/giu;
  const currencyTokens = [...afterDates.matchAll(currencyPattern)].map((m) => m[0].replace(/\s+/g, ' ').trim());
  const afterCurrency = afterDates.replaceAll(currencyPattern, ' ');
  const numberPattern = /\(\s*[+-]?\d+(?:[.,]\d+)*(?:[kKmMbBtT](?![\p{L}\p{N}]))?(?:\s*%)?\s*\)|(?:(?<![\p{L}\p{N}])[+-])?(?:\d+\s*\/\s*\d+(?![\p{L}\p{N}])|(?:\d+(?:[.,]\d+)*(?:[kKmMbBtT](?![\p{L}\p{N}]))?|[.,]\d+)(?:[eE][+-]?\d+)?(?:\s*%)?)/gu;
  const number = [...afterCurrency.matchAll(numberPattern)].map((m) => m[0].replace(/\s+/g, ' ').trim());
  return {
    code: count(blocks),
    inlineCode: count(inlineCode),
    quote: count(quote),
    url: count(url),
    date: count(date),
    currency: count(currencyTokens),
    number: count(number),
  };
}

const CLASSES = ['code', 'inlineCode', 'quote', 'url', 'date', 'currency', 'number'];

function diffCounts(beforeCounts, afterCounts) {
  const missing = [];
  const added = [];
  for (const className of CLASSES) {
    const before = beforeCounts[className];
    const after = afterCounts[className];
    for (const token of new Set([...before.keys(), ...after.keys()])) {
      const beforeCount = before.get(token) ?? 0;
      const afterCount = after.get(token) ?? 0;
      if (afterCount < beforeCount) missing.push({ class: className, token, beforeCount, afterCount });
      if (afterCount > beforeCount) added.push({ class: className, token, beforeCount, afterCount });
    }
  }
  const compare = (a, b) => a < b ? -1 : a > b ? 1 : 0;
  const byToken = (a, b) => compare(a.class, b.class) || compare(a.token, b.token);
  missing.sort(byToken);
  added.sort(byToken);
  return { missing, added };
}

export function compareTokens(beforeText, afterText) {
  return diffCounts(extractProtectedTokens(beforeText), extractProtectedTokens(afterText));
}

function parseArgs(argv) {
  const values = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--json') values.json = true;
    else if (arg === '--before' || arg === '--after') {
      const value = argv[++i];
      if (value === undefined) throw new Error(`${arg} requires a path`);
      values[arg.slice(2)] = value;
    } else if (arg.startsWith('--before=') || arg.startsWith('--after=')) {
      values[arg.slice(2, arg.indexOf('='))] = arg.slice(arg.indexOf('=') + 1);
    } else if (arg === '--help') values.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return values;
}

export function runPreserveCheck(argv) {
  let values;
  try {
    values = parseArgs(argv);
  } catch (error) {
    return { exitCode: 2, message: `preserve-check: ${error.message}\n` };
  }
  if (values.help) {
    return { exitCode: 0, message: 'Usage: preserve-check --before <path> --after <path> [--json]\n' };
  }
  if (!values.before || !values.after) {
    return { exitCode: 2, message: 'preserve-check: both --before and --after are required\n' };
  }
  let beforeText;
  let afterText;
  try {
    beforeText = readFileSync(path.resolve(values.before), 'utf8');
    afterText = readFileSync(path.resolve(values.after), 'utf8');
  } catch (error) {
    return { exitCode: 2, message: `preserve-check: cannot read input: ${error.message}\n` };
  }
  const { missing, added } = compareTokens(beforeText, afterText);
  const ok = missing.length === 0 && added.length === 0;
  if (values.json) {
    return { exitCode: ok ? 0 : 1, message: `${JSON.stringify({ ok, missing, added }, null, 2)}\n` };
  }
  const lines = [`preserve-check: before=${values.before} after=${values.after}`];
  for (const entry of missing) lines.push(`MISSING [${entry.class}] "${entry.token}" (${entry.beforeCount} -> ${entry.afterCount})`);
  for (const entry of added) lines.push(`ADDED [${entry.class}] "${entry.token}" (${entry.beforeCount} -> ${entry.afterCount})`);
  lines.push(ok ? 'OK: extracted token counts match; review meaning and attribution separately' : `FAIL: ${missing.length} missing, ${added.length} added`);
  return { exitCode: ok ? 0 : 1, message: `${lines.join('\n')}\n` };
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
  const result = runPreserveCheck(process.argv.slice(2));
  if (result.message) (result.exitCode === 2 ? process.stderr : process.stdout).write(result.message);
  process.exitCode = result.exitCode;
}
