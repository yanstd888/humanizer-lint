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
const PACKAGE_INFO = readProjectJson('package.json');
const { analyzeText } = createAnalyzer({ rules: RULES, defaultProfile: DEFAULT_PROFILE, calculateMetrics });

function escapeGithubProperty(value) {
  return String(value)
    .replace(/%/gu, '%25')
    .replace(/\r/gu, '%0D')
    .replace(/\n/gu, '%0A')
    .replace(/:/gu, '%3A')
    .replace(/,/gu, '%2C');
}

function escapeGithubMessage(value) {
  return String(value)
    .replace(/%/gu, '%25')
    .replace(/\r/gu, '%0D')
    .replace(/\n/gu, '%0A');
}

function formatSarif(reports, stdinFilename) {
  const allViolations = reports.flatMap(({ file, result }) =>
    result.violations.map((violation) => ({ violation, file: file ?? stdinFilename }))
  );
  const rules = [...new Set(allViolations.map(({ violation }) => violation.ruleId))].sort().map((id) => ({ id }));
  const results = allViolations.map(({ violation, file }) => {
    const normalized = file?.replace(/\\/g, '/');
    const encoded = normalized?.split('/').map((part, index) => index === 0 && /^[A-Za-z]:$/u.test(part) ? part : encodeURIComponent(part)).join('/');
    const uri = !encoded ? undefined : /^[A-Za-z]:\//u.test(encoded) ? `file:///${encoded}` : encoded.startsWith('//') ? `file:${encoded}` : encoded.startsWith('/') ? `file://${encoded}` : encoded;
    return {
      ruleId: violation.ruleId,
      level: violation.severity === 'error' ? 'error' : 'warning',
      message: { text: violation.fixInstruction },
      locations: [
        {
          physicalLocation: {
            ...(uri !== undefined ? { artifactLocation: { uri } } : {}),
            region: {
              startLine: violation.line ?? 1,
              startColumn: violation.column ?? 1,
              endLine: violation.endLine ?? violation.line ?? 1,
              endColumn: violation.endColumn ?? violation.column ?? 1,
            },
          },
        },
      ],
    };
  });
  return `${JSON.stringify({
    $schema: 'https://json.schemastore.org/sarif-2.1.0.json',
    version: '2.1.0',
    runs: [
      {
        tool: {
          driver: {
            name: 'humanizer-lint',
            version: PACKAGE_INFO.version,
            rules,
          },
        },
        results,
      },
    ],
  }, null, 2)}\n`;
}

function formatGithub(reports, stdinFilename) {
  const lines = [];
  for (const { file, result } of reports) {
    const filePath = file ?? stdinFilename;
    for (const violation of result.violations) {
      const command = violation.severity === 'error' ? 'error' : 'warning';
      const props = [];
      if (filePath) props.push(`file=${escapeGithubProperty(filePath.replace(/\\/g, '/'))}`);
      props.push(`line=${violation.line ?? 1}`);
      props.push(`col=${violation.column ?? 1}`);
      props.push(`endLine=${violation.endLine ?? violation.line ?? 1}`);
      props.push(`endColumn=${violation.endColumn ?? violation.column ?? 1}`);
      props.push(`title=${escapeGithubProperty(violation.ruleId)}`);
      lines.push(`::${command} ${props.join(',')}::${escapeGithubMessage(violation.fixInstruction)}`);
    }
  }
  return lines.length ? `${lines.join('\n')}\n` : '';
}


const ALLOWED_CONFIG_KEYS = new Set(['lang', 'domain', 'profile', 'allow', 'minScore', 'noDomainLint']);

async function findConfigFile(startDir) {
  let dir = path.resolve(startDir);
  while (true) {
    const candidate = path.join(dir, '.humanizerrc.json');
    try {
      const stat = await fs.stat(candidate);
      if (stat.isFile()) return candidate;
    } catch (error) {
      if (error.code !== 'ENOENT' && error.code !== 'ENOTDIR') throw error;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

async function loadConfigFile(configPath) {
  let content;
  try {
    content = await fs.readFile(configPath, 'utf8');
  } catch {
    throw new Error(`Failed to read configuration file: ${configPath}`);
  }
  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error(`Invalid JSON in configuration file: ${configPath}`);
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error(`Configuration in ${configPath} must be a JSON object`);
  }
  for (const key of Object.keys(parsed)) {
    if (!ALLOWED_CONFIG_KEYS.has(key)) {
      throw new Error(`Unknown configuration key "${key}" in ${configPath}`);
    }
  }
  if (parsed.lang !== undefined) {
    if (typeof parsed.lang !== 'string' || !/^(?:auto|universal|[a-z]{2})$/u.test(parsed.lang)) {
      throw new Error(`Invalid "lang" in ${configPath}: must be auto, universal, or an ISO 639-1 code`);
    }
  }
  if (parsed.domain !== undefined) {
    if (typeof parsed.domain !== 'string' || !['auto', 'prose', 'copywriting', 'code', 'ui'].includes(parsed.domain)) {
      throw new Error(`Invalid "domain" in ${configPath}: must be auto, prose, copywriting, code, or ui`);
    }
  }
  if (parsed.profile !== undefined) {
    if (typeof parsed.profile !== 'string' || !parsed.profile.trim()) {
      throw new Error(`Invalid "profile" in ${configPath}: must be a nonempty string path`);
    }
  }
  if (parsed.allow !== undefined) {
    if (!Array.isArray(parsed.allow) || !parsed.allow.every((item) => typeof item === 'string')) {
      throw new Error(`Invalid "allow" in ${configPath}: must be an array of strings`);
    }
  }
  if (parsed.minScore !== undefined) {
    if (typeof parsed.minScore !== 'number' || !Number.isFinite(parsed.minScore) || parsed.minScore < 0 || parsed.minScore > 100) {
      throw new Error(`Invalid "minScore" in ${configPath}: must be a number from 0 to 100`);
    }
  }
  if (parsed.noDomainLint !== undefined) {
    if (typeof parsed.noDomainLint !== 'boolean') {
      throw new Error(`Invalid "noDomainLint" in ${configPath}: must be a boolean`);
    }
  }
  return parsed;
}


export { analyzeText, formatSarif, formatGithub, escapeGithubProperty, escapeGithubMessage, findConfigFile, loadConfigFile };

function formatHuman(result, includeDeliveryGate = false) {
  const lines = [`Status: ${result.status}`, `Score: ${result.score}`, `Language: ${result.language}`, `Rule pack: ${result.rulePack}`, `Rhythm evaluated: ${result.rhythmEvaluated ? 'yes' : 'no'}`, `Suppressed: ${result.suppressed.length}`];
  if (result.failedGates.length) lines.push(`Failed gates: ${result.failedGates.join(', ')}`);
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
  if (!/[*?]/u.test(pattern)) {
    const entry = await fs.stat(pattern);
    if (!entry.isDirectory()) return [pattern];
    const matches = [];
    async function visitDirectory(dir) {
      for (const item of await fs.readdir(dir, { withFileTypes: true })) {
        if (item.isDirectory() && (item.name.startsWith('.') || item.name === 'node_modules')) continue;
        const file = path.join(dir, item.name);
        if (item.isDirectory()) await visitDirectory(file);
        else if (item.isFile() && /\.(?:md|mdx|txt)$/iu.test(item.name)) matches.push(file);
      }
    }
    await visitDirectory(pattern);
    if (!matches.length) throw new Error(`No files match: ${pattern}`);
    return matches.sort();
  }
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
  const cwd = io.cwd ?? process.cwd();
  try {
    const { values, positionals } = parseArgs({
      args: argv,
      options: {
        file: { type: 'string' },
        stdin: { type: 'boolean' },
        'stdin-filename': { type: 'string' },
        lang: { type: 'string' },
        profile: { type: 'string' },
        allow: { type: 'string' },
        'min-score': { type: 'string' },
        domain: { type: 'string' },
        'no-domain-lint': { type: 'boolean' },
        'no-ignore': { type: 'boolean' },
        format: { type: 'string' },
        config: { type: 'string' },
        'no-config': { type: 'boolean' },
        json: { type: 'boolean' },
        brief: { type: 'boolean' },
        'delivery-gate': { type: 'boolean' },
        help: { type: 'boolean' },
      },
      strict: true,
      allowPositionals: true,
    });
    if (values.help) {
      stdout('Usage: humanizer-lint (--file <path> | --stdin | <files...>) [--stdin-filename <name>] [--lang auto|universal|<ISO-639-1>] [--profile <path>] [--allow <phrases>] [--min-score <0-100>] [--domain auto|prose|copywriting|code|ui] [--no-domain-lint] [--no-ignore] [--config <path>] [--no-config] [--format human|json|sarif|github] [--json] [--brief] [--delivery-gate]\n');
      return 0;
    }
    if ((values.stdin && (values.file || positionals.length)) || (values.file && positionals.length) || (!values.stdin && !values.file && !positionals.length)) throw new Error('Choose exactly one input: --file, file paths, or --stdin');
    if (values.json && values.format && values.format !== 'json') throw new Error(`Cannot combine --json with conflicting --format ${values.format}`);
    const format = values.format ?? (values.json ? 'json' : 'human');
    if (!['human', 'json', 'sarif', 'github'].includes(format)) throw new Error('--format must be human, json, sarif, or github');
    if (values.brief && format !== 'json') throw new Error('--brief requires JSON format');
    if (values['stdin-filename'] !== undefined && (!values.stdin || !values['stdin-filename'].trim())) throw new Error('--stdin-filename requires --stdin and a nonempty name');
    if (values.stdin && io.stdin == null && process.stdin.isTTY) throw new Error('--stdin requires piped input');
    if (values.config !== undefined && values['no-config']) throw new Error('Cannot combine --config and --no-config');
    if (values.config !== undefined && !values.config.trim()) throw new Error('--config requires a nonempty path');

    let config = {};
    let configPath = null;
    if (!values['no-config']) {
      configPath = values.config !== undefined ? path.resolve(cwd, values.config) : await findConfigFile(cwd);
      if (configPath) config = await loadConfigFile(configPath);
    }

    const effectiveLang = values.lang ?? config.lang ?? 'auto';
    if (!/^(?:auto|universal|[a-z]{2})$/u.test(effectiveLang)) throw new Error('--lang must be auto, universal, or an ISO 639-1 code');
    const effectiveDomain = values.domain ?? config.domain ?? 'auto';
    if (!['auto', 'prose', 'copywriting', 'code', 'ui'].includes(effectiveDomain)) throw new Error('--domain must be auto, prose, copywriting, code, or ui');
    const effectiveNoDomainLint = values['no-domain-lint'] ?? (values.domain !== undefined ? false : (config.noDomainLint ?? false));

    let minimumScore = null;
    if (values['min-score'] !== undefined) {
      if (!/^(?:\d+(?:\.\d+)?)$/.test(values['min-score']) || Number(values['min-score']) < 0 || Number(values['min-score']) > 100) throw new Error('--min-score must be a number from 0 to 100');
      minimumScore = Number(values['min-score']);
    } else if (config.minScore !== undefined) {
      minimumScore = config.minScore;
    }

    let effectiveAllow = [];
    if (values.allow !== undefined) {
      effectiveAllow = values.allow ? values.allow.split(',') : [];
    } else if (config.allow !== undefined) {
      effectiveAllow = config.allow;
    }

    let profile;
    const profilePath = values.profile !== undefined ? path.resolve(cwd, values.profile) : (config.profile !== undefined ? path.resolve(path.dirname(configPath), config.profile) : undefined);
    if (profilePath !== undefined) {
      try {
        const profileContent = await fs.readFile(profilePath, 'utf8');
        profile = JSON.parse(profileContent);
      } catch {
        throw new Error(`Failed to load profile at ${profilePath}`);
      }
    }

    const files = values.stdin ? [null] : [...new Set((await Promise.all((values.file ? [values.file] : positionals).map(expandFilePattern))).flat())];
    const reports = [];
    for (const file of files) {
      const text = file ? await fs.readFile(file, 'utf8') : await stdin();
      const result = analyzeText(text, { language: effectiveLang, profile, sourcePath: file ?? values['stdin-filename'], domain: effectiveNoDomainLint ? 'prose' : effectiveDomain, allowlist: effectiveAllow, noIgnore: values['no-ignore'] });
      reports.push({ file, result });
    }
    const multi = reports.length > 1;
    const project = (result) => values.brief ? {
      ...Object.fromEntries(['schemaVersion', 'status', 'score', 'rhythmEvaluated', 'failedGates', 'targets', 'violations', 'ignoreWarnings', 'allowlistApplied'].map((key) => [key, result[key]])),
      ...(result.warning ? { warning: result.warning } : {}),
      suppressed: result.suppressed.map(({ type, ruleId, location, charOffset, directive, match, sourceScope }) => ({ type, ruleId, location, charOffset, directive, match, sourceScope })),
      deliveryGate: { rhythmAndStylometry: { status: result.deliveryGate.rhythmAndStylometry.status }, finalVerdict: { status: result.status, score: result.score } },
    } : result;
    if (format === 'sarif') {
      stdout(formatSarif(reports, values['stdin-filename']));
    } else if (format === 'github') {
      stdout(formatGithub(reports, values['stdin-filename']));
    } else if (format === 'json') {
      const jsonOutput = multi ? reports.map(({ file, result }) => ({ file, result: project(result) })) : project(reports[0].result);
      stdout(`${JSON.stringify(jsonOutput, null, values.brief ? 0 : 2)}\n`);
    } else {
      stdout(reports.map(({ file, result }) => `${multi ? `File: ${file}\n` : ''}${formatHuman(result, values['delivery-gate'])}`).join('\n'));
    }
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