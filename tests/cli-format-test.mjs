import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

const parentDirectory = '..';
const {
  runAnalyzeCli,
  escapeGithubProperty,
  escapeGithubMessage,
  formatSarif,
  formatGithub,
} = await import(new URL([parentDirectory, 'scripts', 'analyze.mjs'].join('/'), import.meta.url));

test('configuration and SARIF formatting work together', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'humanizer-combined-'));
  try {
    await writeFile(path.join(root, '.humanizerrc.json'), JSON.stringify({ lang: 'en' }));
    let output = '', error = '';
    const code = await runAnalyzeCli(['--stdin', '--stdin-filename', 'my #file.md', '--format', 'sarif'], {
      cwd: root, stdin: async () => "In today's fast-paced world, we delve into things.",
      stdout: (text) => { output += text; }, stderr: (text) => { error += text; },
    });
    assert.equal(code, 1, error);
    const results = JSON.parse(output).runs[0].results;
    assert.ok(results.some((item) => item.ruleId === 'EN001'));
    assert.equal(results[0].locations[0].physicalLocation.artifactLocation.uri, 'my%20%23file.md');
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('--format rejects invalid names and conflicting flags', async () => {
  let output = '', error = '';
  const io = { stdout: (s) => { output += s; }, stderr: (s) => { error += s; } };

  assert.equal(await runAnalyzeCli(['--stdin', '--format', 'xml'], { ...io, stdin: async () => 'sample' }), 2);
  assert.match(error, /--format must be human, json, sarif, or github/);

  for (const conflicting of ['sarif', 'github', 'human']) {
    error = '';
    assert.equal(await runAnalyzeCli(['--stdin', '--json', '--format', conflicting], { ...io, stdin: async () => 'sample' }), 2);
    assert.match(error, new RegExp(`Cannot combine --json with conflicting --format ${conflicting}`));
  }

  error = '';
  assert.equal(await runAnalyzeCli(['--stdin', '--json', '--format', 'json'], { ...io, stdin: async () => 'sample' }), 0);
});

test('--brief restrictions apply to non-JSON formats', async () => {
  let output = '', error = '';
  const io = { stdout: (s) => { output += s; }, stderr: (s) => { error += s; } };

  for (const format of ['human', 'sarif', 'github']) {
    error = '';
    assert.equal(await runAnalyzeCli(['--stdin', '--format', format, '--brief'], { ...io, stdin: async () => 'sample' }), 2);
    assert.match(error, /--brief requires JSON format/);
  }

  error = '';
  assert.equal(await runAnalyzeCli(['--stdin', '--brief'], { ...io, stdin: async () => 'sample' }), 2);
  assert.match(error, /--brief requires JSON format/);

  error = '';
  output = '';
  assert.equal(await runAnalyzeCli(['--stdin', '--format', 'json', '--brief'], { ...io, stdin: async () => 'sample' }), 0);
  assert.ok(JSON.parse(output).schemaVersion);
});

test('GitHub annotation escaping prevents property and message injection', () => {
  assert.equal(escapeGithubProperty('line%1:col,2\r\ntitle'), 'line%251%3Acol%2C2%0D%0Atitle');
  assert.equal(escapeGithubMessage('line%1:col,2\r\ntitle'), 'line%251:col,2%0D%0Atitle');
});

test('finding newlines cannot inject GitHub commands and remain valid SARIF', () => {
  const message = 'Fix this\r\n::error::forged';
  const violation = { ruleId: 'R1', severity: 'error', fixInstruction: message, line: 1, column: 1, endLine: 1, endColumn: 2 };
  const reports = [{ file: 'draft.md', result: { violations: [violation] } }];
  const lines = formatGithub(reports).trimEnd().split('\n');
  assert.equal(lines.length, 1);
  assert.match(lines[0], /Fix this%0D%0A::error::forged/);
  const sarif = JSON.parse(formatSarif(reports));
  assert.equal(sarif.version, '2.1.0');
  assert.equal(sarif.runs[0].results[0].message.text, message);
});

test('SARIF encodes special characters in artifact URIs', () => {
  const violation = { ruleId: 'R1', severity: 'error', fixInstruction: 'Fix', line: 1, column: 1, endLine: 1, endColumn: 2 };
  const doc = JSON.parse(formatSarif([{ file: 'dir/a #1%.md', result: { violations: [violation] } }]));
  assert.equal(doc.runs[0].results[0].locations[0].physicalLocation.artifactLocation.uri, 'dir/a%20%231%25.md');
  const windows = JSON.parse(formatSarif([{ file: 'C:\\Project Folder\\a#1.md', result: { violations: [violation] } }]));
  assert.equal(windows.runs[0].results[0].locations[0].physicalLocation.artifactLocation.uri, 'file:///C:/Project%20Folder/a%231.md');
});

test('SARIF format produces valid schema, rules, and regions', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'humanizer-sarif-'));
  try {
    const filePath = path.join(root, 'ai-sample.md');
    await writeFile(filePath, "In today's fast-paced world, we delve into things.\r\n");

    let output = '', error = '';
    const io = { stdout: (s) => { output += s; }, stderr: (s) => { error += s; } };

    const status = await runAnalyzeCli([filePath, '--format', 'sarif', '--lang', 'en'], io);
    assert.equal(status, 1, error);

    const report = JSON.parse(output);
    assert.equal(report.$schema, 'https://json.schemastore.org/sarif-2.1.0.json');
    assert.equal(report.version, '2.1.0');
    assert.equal(report.runs.length, 1);

    const driver = report.runs[0].tool.driver;
    assert.equal(driver.name, 'humanizer-lint');
    assert.match(driver.version, /^\d+\.\d+\.\d+/);
    assert.ok(Array.isArray(driver.rules));
    assert.ok(driver.rules.some((rule) => rule.id === 'EN001'));
    assert.ok(driver.rules.some((rule) => rule.id === 'EN022'));
    const ruleIds = driver.rules.map((r) => r.id);
    assert.deepEqual(ruleIds, [...new Set(ruleIds)].sort());

    const results = report.runs[0].results;
    assert.ok(results.length >= 2);
    for (const res of results) {
      assert.ok(['error', 'warning'].includes(res.level));
      assert.ok(typeof res.message.text === 'string' && res.message.text.length > 0);
      assert.equal(res.locations.length, 1);
      const loc = res.locations[0].physicalLocation;
      assert.ok(loc.artifactLocation.uri.includes('ai-sample.md'));
      assert.doesNotMatch(loc.artifactLocation.uri, /\\/);
      assert.ok(loc.region.startLine >= 1);
      assert.ok(loc.region.startColumn >= 1);
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('SARIF handles stdin with and without --stdin-filename', async () => {
  let output = '', error = '';
  const io = { stdout: (s) => { output += s; }, stderr: (s) => { error += s; } };

  await runAnalyzeCli(['--stdin', '--format', 'sarif', '--lang', 'en'], {
    ...io,
    stdin: async () => "In today's fast-paced world, we delve into things.",
  });
  let report = JSON.parse(output);
  assert.equal(report.runs[0].results[0].locations[0].physicalLocation.artifactLocation, undefined);
  assert.ok(report.runs[0].results[0].locations[0].physicalLocation.region.startLine >= 1);

  output = '';
  await runAnalyzeCli(['--stdin', '--stdin-filename', 'custom-name.txt', '--format', 'sarif', '--lang', 'en'], {
    ...io,
    stdin: async () => "In today's fast-paced world, we delve into things.",
  });
  report = JSON.parse(output);
  assert.equal(report.runs[0].results[0].locations[0].physicalLocation.artifactLocation.uri, 'custom-name.txt');
});

test('GitHub format emits workflow commands and handles stdin, multi-file and Windows paths with spaces', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'humanizer gh space-'));
  try {
    const file1 = path.join(root, 'draft one.md');
    const file2 = path.join(root, 'draft two.txt');
    await writeFile(file1, "In today's fast-paced world, we delve into things.\r\n");
    await writeFile(file2, "A short clean note.\r\n");

    let output = '', error = '';
    const io = { stdout: (s) => { output += s; }, stderr: (s) => { error += s; } };

    const status = await runAnalyzeCli([file1, file2, '--format', 'github', '--lang', 'en'], io);
    assert.equal(status, 1, error);

    const lines = output.trim().split('\n');
    assert.ok(lines.length >= 2);
    for (const line of lines) {
      assert.match(line, /^::(?:error|warning) file=[^,]+,line=\d+,col=\d+,endLine=\d+,endColumn=\d+,title=[^:]+::.+/);
      assert.doesNotMatch(line, /\\/);
      assert.ok(line.includes('draft one.md'));
    }

    output = '';
    await runAnalyzeCli(['--stdin', '--format', 'github', '--lang', 'en'], {
      ...io,
      stdin: async () => "In today's fast-paced world, we delve into things.",
    });
    const stdinLines = output.trim().split('\n');
    assert.ok(stdinLines.length >= 2);
    for (const line of stdinLines) {
      assert.match(line, /^::(?:error|warning) line=\d+,col=\d+,endLine=\d+,endColumn=\d+,title=[^:]+::.+/);
      assert.doesNotMatch(line, /file=/);
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
