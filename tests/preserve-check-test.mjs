import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

const projectRoot = '..';
const projectModule = (...segments) => new URL([projectRoot, ...segments].join('/'), import.meta.url);
const { extractProtectedTokens, compareTokens, runPreserveCheck } = await import(projectModule('scripts', 'preserve-check.mjs'));

const SAMPLE = [
  'Released 3 fixes on 2026-11-04, cutting latency by 15% for $50 per seat.',
  'See https://example.com/docs?x=1 for details, or run `npm test`.',
  'She said "ship it" and the note read “aman”.',
  '',
  '```js',
  'const retries = 2;',
  '```',
  '',
].join('\n');

async function writePair(directory, beforeName, afterName, beforeText, afterText) {
  const before = path.join(directory, beforeName);
  const after = path.join(directory, afterName);
  await writeFile(before, beforeText);
  await writeFile(after, afterText);
  return { before, after };
}

test('detects currency and magnitude changes without mistaking inch marks for quotes', () => {
  for (const [before, after] of [['SGD 50', 'AUD 50'], ['$10k', '$10M'], ['10k', '10M'], ['Buy a 15" screen and a 17" laptop', 'Buy a 15" screen and a 18" laptop']]) {
    const diff = compareTokens(before, after);
    assert.ok(diff.missing.length && diff.added.length, `${before} -> ${after}`);
  }
  const sizes = extractProtectedTokens('Buy a 15" screen and a 17" laptop');
  assert.deepEqual([...sizes.number.keys()], ['15', '17']);
  assert.equal(sizes.quote.size, 0);
  assert.ok(extractProtectedTokens('She said "17".').quote.has('17'));
});

test('preserves digits embedded in identifiers and parenthesized amounts', () => {
  for (const [before, after] of [['version v1', 'version v2'], ['Model X5', 'Model X6'], ['Balance (50)', 'Balance 50']]) {
    const diff = compareTokens(before, after);
    assert.ok(diff.missing.length && diff.added.length, `${before} -> ${after}`);
  }
});

test('preserves code indentation and numeric signs', () => {
  assert.notDeepEqual(compareTokens('```py\nif x:\n  go()\n```', '```py\nif x:\ngo()\n```'), { missing: [], added: [] });
  assert.notDeepEqual(compareTokens('Balance -5', 'Balance 5'), { missing: [], added: [] });
  assert.notDeepEqual(compareTokens('Balance -$50', 'Balance $50'), { missing: [], added: [] });
  assert.notDeepEqual(compareTokens('```js\nx()\n```', '```py\nx()\n```'), { missing: [], added: [] });
});

test('extraction finds every protected token class', () => {
  const tokens = extractProtectedTokens(SAMPLE);
  assert.deepEqual([...tokens.date.keys()], ['2026-11-04']);
  assert.ok(tokens.url.has('https://example.com/docs?x=1'));
  assert.ok(tokens.inlineCode.has('npm test'));
  assert.ok(tokens.quote.has('ship it'));
  assert.ok(tokens.quote.has('aman'));
  assert.deepEqual([...tokens.code.keys()], ['```js\nconst retries = 2;\n```']);
  assert.ok(tokens.currency.has('$50'));
  assert.ok(tokens.number.has('15%'));
  assert.ok(tokens.number.has('3'));
});

test('identical text passes including CRLF-only differences', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'preserve-check-'));
  try {
    const { before, after } = await writePair(directory, 'a.md', 'b.md', SAMPLE, SAMPLE.replaceAll('\n', '\r\n'));
    const result = runPreserveCheck(['--before', before, '--after', after]);
    assert.equal(result.exitCode, 0);
    const json = runPreserveCheck(['--before', before, '--after', after, '--json']);
    assert.deepEqual(JSON.parse(json.message), { ok: true, missing: [], added: [] });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('a dropped number fails with the missing token listed', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'preserve-check-'));
  try {
    const { before, after } = await writePair(directory, 'a.md', 'b.md', SAMPLE, SAMPLE.replace('Released 3 fixes', 'Released fixes'));
    const result = runPreserveCheck(['--before', before, '--after', after, '--json']);
    assert.equal(result.exitCode, 1);
    const parsed = JSON.parse(result.message);
    assert.equal(parsed.ok, false);
    assert.ok(parsed.missing.some((entry) => entry.class === 'number' && entry.token === '3'));
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('multiset counts: one of two occurrences removed fails', () => {
  const { missing, added } = compareTokens('run 3 and 3 more', 'run 3 and 4 more');
  assert.deepEqual(missing, [{ class: 'number', token: '3', beforeCount: 2, afterCount: 1 }]);
  assert.deepEqual(added, [{ class: 'number', token: '4', beforeCount: 0, afterCount: 1 }]);
});

test('a newly added URL fails as a possibly invented fact', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'preserve-check-'));
  try {
    const { before, after } = await writePair(directory, 'a.md', 'b.md', SAMPLE, `${SAMPLE}Reference https://invented.example.net/page.\n`);
    const result = runPreserveCheck(['--before', before, '--after', after, '--json']);
    assert.equal(result.exitCode, 1);
    assert.ok(JSON.parse(result.message).added.some((entry) => entry.class === 'url' && entry.token === 'https://invented.example.net/page'));
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('a changed quotation fails', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'preserve-check-'));
  try {
    const { before, after } = await writePair(directory, 'a.md', 'b.md', SAMPLE, SAMPLE.replace('"ship it"', '"deliver it"'));
    const result = runPreserveCheck(['--before', before, '--after', after, '--json']);
    const parsed = JSON.parse(result.message);
    assert.equal(result.exitCode, 1);
    assert.ok(parsed.missing.some((entry) => entry.class === 'quote' && entry.token === 'ship it'));
    assert.ok(parsed.added.some((entry) => entry.class === 'quote' && entry.token === 'deliver it'));
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('a changed fenced code block fails', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'preserve-check-'));
  try {
    const { before, after } = await writePair(directory, 'a.md', 'b.md', SAMPLE, SAMPLE.replace('const retries = 2;', 'const retries = 3;'));
    const result = runPreserveCheck(['--before', before, '--after', after, '--json']);
    const parsed = JSON.parse(result.message);
    assert.equal(result.exitCode, 1);
    assert.ok(parsed.missing.some((entry) => entry.class === 'code' && entry.token.includes('const retries = 2;')));
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('currency, percent and ISO date tokens must survive', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'preserve-check-'));
  try {
    const kept = await writePair(directory, 'a.md', 'b.md', SAMPLE, SAMPLE.replace('$50 per seat', 'fifty dollars per seat').replace('15%', 'fifteen percent'));
    const keptResult = runPreserveCheck(['--before', kept.before, '--after', kept.after, '--json']);
    assert.equal(keptResult.exitCode, 1);
    const parsed = JSON.parse(keptResult.message);
    assert.ok(parsed.missing.some((entry) => entry.class === 'currency' && entry.token === '$50'));
    assert.ok(parsed.missing.some((entry) => entry.class === 'number' && entry.token === '15%'));
    const dateDropped = await writePair(directory, 'c.md', 'd.md', SAMPLE, SAMPLE.replace('2026-11-04', 'November 4'));
    const dateResult = runPreserveCheck(['--before', dateDropped.before, '--after', dateDropped.after, '--json']);
    assert.ok(JSON.parse(dateResult.message).missing.some((entry) => entry.class === 'date'));
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('a removed inline code token fails', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'preserve-check-'));
  try {
    const { before, after } = await writePair(directory, 'a.md', 'b.md', SAMPLE, SAMPLE.replace('or run `npm test`', 'or run the test suite'));
    const result = runPreserveCheck(['--before', before, '--after', after, '--json']);
    assert.ok(JSON.parse(result.message).missing.some((entry) => entry.class === 'inlineCode' && entry.token === 'npm test'));
    assert.equal(result.exitCode, 1);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('invalid arguments and unreadable files exit 2', async () => {
  assert.equal(runPreserveCheck(['--before', 'a.md']).exitCode, 2);
  assert.equal(runPreserveCheck(['--wat']).exitCode, 2);
  assert.equal(runPreserveCheck(['--before', 'definitely-missing-a.md', '--after', 'also-missing.md']).exitCode, 2);
});

test('handles indented fenced code blocks and language changes', () => {
  const indentedBefore = '  ```js\n  const x = 1;\n  ```';
  const indentedAfter = '  ```js\n  const x = 2;\n  ```';
  const diff = compareTokens(indentedBefore, indentedAfter);
  assert.equal(diff.missing.length, 1);
  assert.equal(diff.added.length, 1);
  assert.equal(diff.missing[0].class, 'code');
  assert.equal(diff.added[0].class, 'code');

  const langBefore = '```js\nx();\n```';
  const langAfter = '```ts\nx();\n```';
  const langDiff = compareTokens(langBefore, langAfter);
  assert.equal(langDiff.missing[0].class, 'code');
  assert.equal(langDiff.added[0].class, 'code');

  const tildeBefore = '~~~python\ny = 1\n~~~';
  const tildeAfter = '~~~python\ny = 1\n~~~';
  assert.deepEqual(compareTokens(tildeBefore, tildeAfter), { missing: [], added: [] });
});

test('handles multi-backtick inline code and avoids token leaking', () => {
  const textBefore = 'Run ``npm ` test`` with 3 retries.';
  const textAfter = 'Run ``npm ` run`` with 3 retries.';
  const diff = compareTokens(textBefore, textAfter);
  assert.deepEqual(diff.missing, [{ class: 'inlineCode', token: 'npm ` test', beforeCount: 1, afterCount: 0 }]);
  assert.deepEqual(diff.added, [{ class: 'inlineCode', token: 'npm ` run', beforeCount: 0, afterCount: 1 }]);
});

test('handles multiline quotes within a paragraph and catches changes', () => {
  const quoteBefore = 'He said "first line\nsecond line" to us.';
  const quoteReflow = 'He said "first line second line" to us.';
  assert.notDeepEqual(compareTokens(quoteBefore, quoteReflow), { missing: [], added: [] });
  assert.notDeepEqual(compareTokens('"pay  50"', '"pay 50"'), { missing: [], added: [] });
  assert.notDeepEqual(compareTokens('` x`', '`x`'), { missing: [], added: [] });

  const quoteChanged = 'He said "first line third line" to us.';
  const diff = compareTokens(quoteBefore, quoteChanged);
  assert.equal(diff.missing[0].class, 'quote');
  assert.equal(diff.missing[0].token, 'first line\nsecond line');
  assert.equal(diff.added[0].class, 'quote');
  assert.equal(diff.added[0].token, 'first line third line');
});

test('handles signed currency, thousand grouping and accounting parens', () => {
  const before = 'A: -$1,234.56, B: ($50), C: -Rp 1.000.000,00, D: 50 USD, E: +EUR 100';
  const after = 'A: -$1,234.56, B: ($50), C: -Rp 1.000.000,00, D: 50 USD, E: +EUR 100';
  assert.deepEqual(compareTokens(before, after), { missing: [], added: [] });

  const signMismatch = compareTokens('Balance -$50', 'Balance $50');
  assert.notDeepEqual(signMismatch, { missing: [], added: [] });

  const modified = 'A: -$1,234.99, B: $50, C: -Rp 2.000.000,00, D: 60 USD, E: -EUR 100';
  const diff = compareTokens(before, modified);
  assert.ok(diff.missing.some((e) => e.class === 'currency' && e.token === '-$1,234.56'));
  assert.ok(diff.missing.some((e) => e.class === 'currency' && e.token === '($50)'));
  assert.ok(diff.missing.some((e) => e.class === 'currency' && e.token === '-Rp 1.000.000,00'));
});

test('handles ISO datetimes, URLs with parens, grouped numbers and ranges', () => {
  const before = 'Event at 2026-11-04T12:00:00Z, see https://en.wikipedia.org/wiki/Rust_(programming_language) for 1,000,000 users across 10-15 nodes with .5% error.';
  const tokens = extractProtectedTokens(before);
  assert.ok(tokens.date.has('2026-11-04T12:00:00Z'));
  assert.ok(tokens.url.has('https://en.wikipedia.org/wiki/Rust_(programming_language)'));
  assert.ok(tokens.number.has('1,000,000'));
  assert.ok(tokens.number.has('10'));
  assert.ok(tokens.number.has('15'));
  assert.ok(tokens.number.has('.5%'));

  const after = 'Event at 2026-11-04T13:00:00Z, see https://en.wikipedia.org/wiki/Rust_(programming_language) for 2,000,000 users across 10-15 nodes with .5% error.';
  const diff = compareTokens(before, after);
  assert.ok(diff.missing.some((e) => e.class === 'date' && e.token === '2026-11-04T12:00:00Z'));
  assert.ok(diff.added.some((e) => e.class === 'date' && e.token === '2026-11-04T13:00:00Z'));
  assert.ok(diff.missing.some((e) => e.class === 'number' && e.token === '1,000,000'));
  assert.ok(diff.added.some((e) => e.class === 'number' && e.token === '2,000,000'));
});

test('regression: detects signed numbers and ranges in markdown/delimiters', () => {
  // Case 1: **-5** vs **5**
  const boldDiff = compareTokens('**-5**', '**5**');
  assert.deepEqual(boldDiff.missing, [{ class: 'number', token: '-5', beforeCount: 1, afterCount: 0 }]);
  assert.deepEqual(boldDiff.added, [{ class: 'number', token: '5', beforeCount: 0, afterCount: 1 }]);

  // Case 2: loss:-5 vs loss:5
  const colonDiff = compareTokens('loss:-5', 'loss:5');
  assert.deepEqual(colonDiff.missing, [{ class: 'number', token: '-5', beforeCount: 1, afterCount: 0 }]);
  assert.deepEqual(colonDiff.added, [{ class: 'number', token: '5', beforeCount: 0, afterCount: 1 }]);

  // Case 3: Range: 10--15 vs Range: 10-15
  const rangeDiff = compareTokens('Range: 10--15', 'Range: 10-15');
  assert.deepEqual(rangeDiff.missing, [{ class: 'number', token: '-15', beforeCount: 1, afterCount: 0 }]);
  assert.deepEqual(rangeDiff.added, [{ class: 'number', token: '15', beforeCount: 0, afterCount: 1 }]);
});

test('regression: detects currency changes with signs, parens, and prefixes', () => {
  // Case 4: **-50 USD** vs **50 USD**
  const boldCurrDiff = compareTokens('**-50 USD**', '**50 USD**');
  assert.deepEqual(boldCurrDiff.missing, [{ class: 'currency', token: '-50 USD', beforeCount: 1, afterCount: 0 }]);
  assert.deepEqual(boldCurrDiff.added, [{ class: 'currency', token: '50 USD', beforeCount: 0, afterCount: 1 }]);

  // Case 5: Balance (50 USD) vs Balance 50 USD
  const parenCurrDiff = compareTokens('Balance (50 USD)', 'Balance 50 USD');
  assert.deepEqual(parenCurrDiff.missing, [{ class: 'currency', token: '(50 USD)', beforeCount: 1, afterCount: 0 }]);
  assert.deepEqual(parenCurrDiff.added, [{ class: 'currency', token: '50 USD', beforeCount: 0, afterCount: 1 }]);

  // Case 6: Rp. 50.000 vs 50.000
  const rpDiff = compareTokens('Rp. 50.000', '50.000');
  assert.deepEqual(rpDiff.missing, [{ class: 'currency', token: 'Rp. 50.000', beforeCount: 1, afterCount: 0 }]);
  assert.deepEqual(rpDiff.added, [{ class: 'number', token: '50.000', beforeCount: 0, afterCount: 1 }]);

  // Case 11: 50% USD vs 50% EUR
  const pctCurrDiff = compareTokens('50% USD', '50% EUR');
  assert.deepEqual(pctCurrDiff.missing, [{ class: 'currency', token: '50% USD', beforeCount: 1, afterCount: 0 }]);
  assert.deepEqual(pctCurrDiff.added, [{ class: 'currency', token: '50% EUR', beforeCount: 0, afterCount: 1 }]);
});

test('regression: detects quotes with escaped quotes, multiline code, and multi-paragraph quotes', () => {
  // Case 7: escaped quotes containing changed text
  const escQuoteDiff = compareTokens('"He said \\"foo\\" and left."', '"He said \\"bar\\" and left."');
  assert.deepEqual(escQuoteDiff.missing, [{ class: 'quote', token: 'He said \\"foo\\" and left.', beforeCount: 1, afterCount: 0 }]);
  assert.deepEqual(escQuoteDiff.added, [{ class: 'quote', token: 'He said \\"bar\\" and left.', beforeCount: 0, afterCount: 1 }]);

  const bareEscQuoteDiff = compareTokens('He said \\"foo\\" today', 'He said \\"bar\\" today');
  assert.deepEqual(bareEscQuoteDiff.missing, [{ class: 'quote', token: 'foo', beforeCount: 1, afterCount: 0 }]);
  assert.deepEqual(bareEscQuoteDiff.added, [{ class: 'quote', token: 'bar', beforeCount: 0, afterCount: 1 }]);

  // Case 8: multiline inline code changed
  const multilineCodeDiff = compareTokens('`foo\nbar`', '`baz\nbar`');
  assert.deepEqual(multilineCodeDiff.missing, [{ class: 'inlineCode', token: 'foo\nbar', beforeCount: 1, afterCount: 0 }]);
  assert.deepEqual(multilineCodeDiff.added, [{ class: 'inlineCode', token: 'baz\nbar', beforeCount: 0, afterCount: 1 }]);

  // Case 13: changed multi-paragraph quote
  const multiParaDiff = compareTokens('"First para.\n\nSecond para."', '"First para.\n\nChanged para."');
  assert.deepEqual(multiParaDiff.missing, [{ class: 'quote', token: 'First para.\n\nSecond para.', beforeCount: 1, afterCount: 0 }]);
  assert.deepEqual(multiParaDiff.added, [{ class: 'quote', token: 'First para.\n\nChanged para.', beforeCount: 0, afterCount: 1 }]);
});

test('regression: protects backtick-delimited text containing blank lines', () => {
  const before = '`npm test\n\n--json`';
  const after = '`npm run\n\n--json`';
  const diff = compareTokens(before, after);
  assert.deepEqual(diff.missing, [{ class: 'inlineCode', token: 'npm test\n\n--json', beforeCount: 1, afterCount: 0 }]);
  assert.deepEqual(diff.added, [{ class: 'inlineCode', token: 'npm run\n\n--json', beforeCount: 0, afterCount: 1 }]);
  assert.deepEqual(compareTokens(before, before.replaceAll('\n', '\r\n')), { missing: [], added: [] });
});

test('regression: detects scientific notation, percent spacing, fractions, dates, time and query URLs', () => {
  // Case 9: 1.5e-3 vs 1.5e+3
  const sciDiff = compareTokens('1.5e-3', '1.5e+3');
  assert.deepEqual(sciDiff.missing, [{ class: 'number', token: '1.5e-3', beforeCount: 1, afterCount: 0 }]);
  assert.deepEqual(sciDiff.added, [{ class: 'number', token: '1.5e+3', beforeCount: 0, afterCount: 1 }]);

  // Case 10: 50 % vs 50
  const pctDiff = compareTokens('50 %', '50');
  assert.deepEqual(pctDiff.missing, [{ class: 'number', token: '50 %', beforeCount: 1, afterCount: 0 }]);
  assert.deepEqual(pctDiff.added, [{ class: 'number', token: '50', beforeCount: 0, afterCount: 1 }]);

  // Case 12: https://example.com/search? vs without ?
  const urlDiff = compareTokens('https://example.com/search?', 'https://example.com/search');
  assert.deepEqual(urlDiff.missing, [{ class: 'url', token: 'https://example.com/search?', beforeCount: 1, afterCount: 0 }]);
  assert.deepEqual(urlDiff.added, [{ class: 'url', token: 'https://example.com/search', beforeCount: 0, afterCount: 1 }]);

  // Case 14: numeric fractions 1/2 vs 2/1
  const fracDiff = compareTokens('1/2', '2/1');
  assert.deepEqual(fracDiff.missing, [{ class: 'number', token: '1/2', beforeCount: 1, afterCount: 0 }]);
  assert.deepEqual(fracDiff.added, [{ class: 'number', token: '2/1', beforeCount: 0, afterCount: 1 }]);

  // Case 15: dates 2026/11/04 vs 2026/04/11
  const slashDateDiff = compareTokens('2026/11/04', '2026/04/11');
  assert.deepEqual(slashDateDiff.missing, [{ class: 'date', token: '2026/11/04', beforeCount: 1, afterCount: 0 }]);
  assert.deepEqual(slashDateDiff.added, [{ class: 'date', token: '2026/04/11', beforeCount: 0, afterCount: 1 }]);

  // Case 16: time 12:00:00 vs 00:12:00
  const timeDiff = compareTokens('12:00:00', '00:12:00');
  assert.deepEqual(timeDiff.missing, [{ class: 'date', token: '12:00:00', beforeCount: 1, afterCount: 0 }]);
  assert.deepEqual(timeDiff.added, [{ class: 'date', token: '00:12:00', beforeCount: 0, afterCount: 1 }]);
});
