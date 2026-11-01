import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
const { analyzeText, runAnalyzeCli } = await import(new URL(['..', 'scripts', 'analyze.mjs'].join('/'), import.meta.url));
const { runBenchmark } = await import(new URL(['..', 'scripts', 'benchmark.mjs'].join('/'), import.meta.url));

const sentence = 'The project team reviewed the deployment plan and confirmed that every service remained available during testing.';

test('rhythm gate skips fewer than eight sentences even above 80 words', () => {
  const result = analyzeText(Array(7).fill(sentence).join(' '), { language: 'en' });
  assert.equal(result.metrics.sentenceCount, 7);
  assert.equal(result.targets.minSentencesForStats, 8);
  assert.equal(result.targets.cvMin, 0.45);
  assert.ok(result.metrics.wordCount >= 80);
  assert.match(result.deliveryGate.rhythmAndStylometry.status, /^SKIP/);
  assert.equal(result.violations.some((v) => ['LOW_BURSTINESS', 'LOW_ADJACENT_DELTA', 'FLAT_PARAGRAPH_RHYTHM'].includes(v.type)), false);
});

test('short source with a missing alt still fails the quality gate', () => {
  const result = analyzeText('<img src="cat.jpg">', { language: 'en', sourcePath: 'card.html' });
  assert.equal(result.status, 'FAIL');
  assert.ok(result.violations.some((v) => v.type === 'MISSING_IMG_ALT'));
  assert.match(result.deliveryGate.rhythmAndStylometry.status, /^SKIP/);
});

test('explicit domain routing and CLI no-domain-lint are respected', async () => {
  const input = '<img src="cat.jpg">';
  assert.ok(analyzeText(input, { domain: 'ui' }).violations.some((v) => v.type === 'MISSING_IMG_ALT'));
  assert.equal(analyzeText(input, { domain: 'prose', sourcePath: 'card.html' }).violations.some((v) => v.type === 'MISSING_IMG_ALT'), false);
  let output = '';
  const io = { stdin: async () => input, stdout: (s) => { output += s; }, stderr: () => {} };
  assert.equal(await runAnalyzeCli(['--stdin', '--domain', 'ui', '--no-domain-lint', '--json'], io), 0);
  assert.equal(JSON.parse(output).violations.length, 0);
  assert.equal(await runAnalyzeCli(['--stdin', '--domain', 'invalid'], io), 2);
});

test('allowlist suppresses exact findings in profiles and CLI', async () => {
  const input = 'This is a game changer.';
  assert.ok(analyzeText(input, { language: 'en' }).violations.some((v) => v.match === 'game changer'));
  assert.equal(analyzeText(input, { language: 'en', profile: { allowlist: ['GAME CHANGER'] } }).violations.some((v) => v.match === 'game changer'), false);
  let output = '';
  const status = await runAnalyzeCli(['--stdin', '--lang', 'en', '--allow', 'game changer', '--json'], { stdin: async () => input, stdout: (s) => { output += s; }, stderr: () => {} });
  assert.equal(status, 0);
  assert.equal(JSON.parse(output).violations.some((v) => v.match === 'game changer'), false);
});

test('warnings do not cause failure, while missing alt is an error', () => {
  const warning = analyzeText('Click here', { language: 'en', domain: 'copywriting' });
  assert.equal(warning.violations.find((v) => v.type === 'WEAK_CTA').severity, 'warn');
  assert.notEqual(warning.status, 'FAIL');
  const error = analyzeText('<img src="cat.jpg">', { domain: 'ui' });
  assert.equal(error.violations.find((v) => v.type === 'MISSING_IMG_ALT').severity, 'error');
  assert.equal(error.status, 'FAIL');
});

test('CLI analyzes multiple files and validates minimum score', async () => {
  const base = new URL(['..', 'tests', 'fixtures', ''].join('/'), import.meta.url);
  const first = decodeURIComponent(new URL('human-sample-en.txt', base).pathname).replace(/^\/(?=[A-Za-z]:)/, '');
  const second = decodeURIComponent(new URL('ai-sample-en.txt', base).pathname).replace(/^\/(?=[A-Za-z]:)/, '');
  let output = '';
  const io = { stdout: (s) => { output += s; }, stderr: () => {} };
  assert.equal(await runAnalyzeCli([first, second, '--lang', 'en', '--json', '--min-score', '80'], io), 1);
  const results = JSON.parse(output);
  assert.equal(results.length, 2);
  assert.equal(results[0].file, first);
  assert.equal(results[1].result.status, 'FAIL');
  assert.equal(await runAnalyzeCli([first, '--min-score', '101'], io), 2);
});

test('CLI expands quoted glob patterns and rejects no matches', async () => {
  const dir = decodeURIComponent(new URL(['..', 'tests', 'fixtures', ''].join('/'), import.meta.url).pathname).replace(/^\/(?=[A-Za-z]:)/, '');
  let output = '';
  const io = { stdout: (s) => { output += s; }, stderr: () => {} };
  assert.equal(await runAnalyzeCli([`${dir}human-sample-*.txt`, '--json'], io), 0);
  assert.ok(JSON.parse(output).length >= 2);
  assert.equal(await runAnalyzeCli([`${dir}not-a-fixture-*.txt`], io), 2);
});

test('inline ignore directives suppress only the targeted line', () => {
  const input = '<!-- humanizer-ignore -->\nThis is a game changer.\nThis is a game changer.';
  const report = analyzeText(input, { language: 'en' });
  assert.equal(report.violations.filter((v) => v.match === 'game changer').length, 1);
  const code = '// humanizer-ignore\n// Import dependencies\n// ... rest of code';
  const result = analyzeText(code, { domain: 'code' });
  assert.equal(result.violations.some((v) => v.type === 'TAUTOLOGICAL_CODE_COMMENT'), false);
  assert.equal(result.violations.some((v) => v.type === 'LAZY_AI_PLACEHOLDER'), true);
  const ignored = analyzeText('<!-- humanizer-ignore-file -->\nThis is a game changer.', { language: 'en' });
  assert.equal(ignored.violations.length, 0);
  const literal = '```html\n<!-- humanizer-ignore-file -->\n```\nThis is a game changer.';
  assert.ok(analyzeText(literal, { language: 'en' }).violations.some((v) => v.match === 'game changer'));
  const inString = 'const note = "// humanizer-ignore";\n// ... rest of code';
  assert.ok(analyzeText(inString, { domain: 'code' }).violations.some((v) => v.type === 'LAZY_AI_PLACEHOLDER'));
});

test('domain findings retain exact UTF-16 offsets even with repeated markup', () => {
  const source = '🙂<h1>Heading</h1><h3>Subheading</h3><img src="x"><img src="x"><div style="width: 900px" class="bg-gradient-to-r"></div>';
  const findings = analyzeText(source, { domain: 'ui' }).violations;
  assert.ok(findings.length >= 4);
  for (const item of findings) {
    assert.equal(item.ruleId, item.type);
    assert.equal(source.slice(item.charOffset.start, item.charOffset.end), item.match);
  }
  assert.deepEqual(findings.map((v) => v.charOffset.start), findings.map((v) => v.charOffset.start).sort((a, b) => a - b));
  const images = findings.filter((v) => v.type === 'MISSING_IMG_ALT');
  assert.equal(images.length, 2);
  assert.ok(images[0].charOffset.start < images[1].charOffset.start);
});

test('recursive glob handles nested directories, question marks, and nonexistent suffixes', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'humanizer-glob-'));
  try {
    await mkdir(path.join(dir, 'nested'));
    await writeFile(path.join(dir, 'a1.txt'), 'Simple note.');
    await writeFile(path.join(dir, 'nested', 'a2.txt'), 'Another note.');
    let output = '';
    const io = { stdout: (s) => { output += s; }, stderr: () => {} };
    assert.equal(await runAnalyzeCli([path.join(dir, '**', 'a?.txt'), '--json'], io), 0);
    assert.equal(JSON.parse(output).length, 2);
    assert.equal(await runAnalyzeCli([path.join(dir, '*', 'absent.txt')], io), 2);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('benchmark reports denominators for independent corpus without inventing labels', () => {
  const report = runBenchmark(1);
  assert.equal(report.realWorldCorpus.total, 5);
  assert.equal(report.realWorldCorpus.falsePositives, report.realWorldCorpus.results.filter((entry) => entry.status === 'FAIL').length);
  assert.equal(report.realWorldCorpus.evaluated + report.realWorldCorpus.skipped, report.realWorldCorpus.total);
  assert.equal(report.realWorldCorpus.falsePositiveRate, report.realWorldCorpus.falsePositives / report.realWorldCorpus.evaluated);
  assert.equal(report.realWorldCorpus.complete, false);
});

test('benchmark includes synthetic domain checks with explicit expectations', () => {
  const report = runBenchmark(1);
  assert.equal(report.syntheticDomainFixtures, 4);
  assert.equal(report.fixtures, 20);
  for (const item of report.results.filter((row) => row.id.startsWith('domain-'))) assert.equal(item.actual, item.expected, item.id);
});

test('mixed technical loanwords are not counted as Indonesian morphology', () => {
  const terms = ['performance', 'development', 'deployment', 'permission', 'keychain', 'component', 'authentication'];
  const text = Array(3).fill(`Tim dan pengguna melihat ${terms.join(' ')} dengan server pada sistem ini.`).join(' ');
  const report = analyzeText(text, { language: 'id' });
  assert.equal(report.metrics.nominalizationRatio, 0);
  assert.equal(report.metrics.passiveRatio, 0);
  assert.equal(report.violations.some((v) => ['EXCESSIVE_NOMINALIZATION', 'PASSIVE_BLOATING'].includes(v.type)), false);
});

test('isolated minor transition is a warning and repeated transitions are errors', () => {
  const once = analyzeText('Moreover, the system remains online.', { language: 'en' });
  assert.equal(once.violations.find((v) => v.ruleId === 'EN017')?.severity, 'warn');
  assert.notEqual(once.status, 'FAIL');
  const repeated = analyzeText('Moreover, it stays online. Moreover, it stays available.', { language: 'en' });
  assert.ok(repeated.violations.filter((v) => v.ruleId === 'EN017').every((v) => v.severity === 'error'));
  assert.equal(repeated.status, 'FAIL');
});

test('Markdown setext headings and rules do not trigger repeated dash prose rule', () => {
  const input = 'Installation\n------------\n\nThe package runs locally and reads configuration from the current project directory. The user can provide an existing profile for their own writing style. The analyzer returns a diagnostic report without uploading the original text.';
  const report = analyzeText(input, { language: 'en' });
  assert.equal(report.violations.some((v) => v.ruleId === 'EN044'), false);
});

test('plain prose lexical offsets point to distinct repeated matches after astral characters', () => {
  const source = '🙂 This is a game changer. Another game changer appears.';
  const matches = analyzeText(source, { language: 'en' }).violations.filter((v) => v.ruleId === 'EN015');
  assert.equal(matches.length, 2);
  for (const item of matches) assert.equal(source.slice(item.charOffset.start, item.charOffset.end), item.match);
  assert.notEqual(matches[0].charOffset.start, matches[1].charOffset.start);
});

test('transformed Markdown lexical offsets skip fences and map link text to original UTF-16', () => {
  const source = '```txt\r\ngame changer\r\n```\r\n\r\n🙂 A [game changer](https://example.com) works. Another game changer follows.';
  const found = analyzeText(source, { language: 'en' }).violations.filter((v) => v.ruleId === 'EN015');
  assert.equal(found.length, 2);
  for (const item of found) {
    assert.equal(source.slice(item.charOffset.start, item.charOffset.end), item.match);
    assert.ok(item.charOffset.start > source.indexOf('```\r\n\r\n'));
  }
  assert.notEqual(found[0].charOffset.start, found[1].charOffset.start);
});

test('auto domain remains prose-first without a known filename', () => {
  const source = 'Click here\n// Import dependencies\n<img src="x">';
  const auto = analyzeText(source, { language: 'en' });
  assert.equal(auto.violations.some((v) => ['WEAK_CTA', 'TAUTOLOGICAL_CODE_COMMENT', 'MISSING_IMG_ALT'].includes(v.type)), false);
  const ui = analyzeText(source, { language: 'en', domain: 'ui' });
  assert.ok(ui.violations.some((v) => v.type === 'MISSING_IMG_ALT'));
});

test('all statistical and structural findings carry exact, source-scoped metadata', () => {
  const source = '# Report\r\n\r\n🙂 ' + Array(9).fill('Every sentence uses similar words for this example.').join(' ');
  const report = analyzeText(source, { language: 'en' });
  assert.ok(report.violations.some((v) => v.type === 'MONOTONOUS_RHYTHM'));
  for (const finding of report.violations) {
    assert.ok(finding.ruleId);
    assert.ok(['warn', 'error'].includes(finding.severity));
    assert.equal(source.slice(finding.charOffset.start, finding.charOffset.end), finding.match);
  }
  assert.deepEqual(report.violations.map((v) => v.charOffset.start), report.violations.map((v) => v.charOffset.start).sort((a, b) => a - b));
});

test('auto routing does not lint code examples in prose files or copy inside code files', () => {
  const prose = analyzeText('A guide says click here.\n// Import dependencies', { language: 'en', sourcePath: 'guide.md' });
  assert.equal(prose.violations.some((v) => v.type === 'TAUTOLOGICAL_CODE_COMMENT'), false);
  const code = analyzeText('const label = "click here";\n// Import dependencies', { sourcePath: 'app.js' });
  assert.equal(code.violations.some((v) => v.type === 'WEAK_CTA'), false);
  assert.ok(code.violations.some((v) => v.type === 'TAUTOLOGICAL_CODE_COMMENT'));
});

test('short text retains non-slop lexical findings even with a custom minimum', () => {
  const text = 'This is a solution, ensuring that every user benefits.';
  for (const profile of [undefined, { thresholds: { minimumSentences: 1 } }]) {
    const result = analyzeText(text, { language: 'en', profile });
    assert.ok(result.violations.some((v) => v.type === 'STRUCTURAL_CLICHE'));
    assert.match(result.deliveryGate.rhythmAndStylometry.status, /^SKIP/);
  }
});

test('same-line HTML ignore suppresses only that line and preserves UTF-16 offsets', () => {
  const source = '🙂 This is a game changer. <!-- humanizer-ignore -->\r\nThis is a game changer.';
  const matches = analyzeText(source, { language: 'en' }).violations.filter((v) => v.ruleId === 'EN015');
  assert.equal(matches.length, 1);
  assert.equal(source.slice(matches[0].charOffset.start, matches[0].charOffset.end), 'game changer');
  assert.ok(matches[0].charOffset.start > source.indexOf('\r\n'));
});

test('same-line code ignore affects comments only, not string literals', () => {
  const source = '// ... rest of code // humanizer-ignore\n// ... rest of code /* humanizer-ignore */\n// ... rest of code\nconst value = "// humanizer-ignore";\n// Import dependencies';
  const findings = analyzeText(source, { domain: 'code' }).violations;
  assert.equal(findings.filter((v) => v.type === 'TAUTOLOGICAL_CODE_COMMENT').length, 1);
  assert.equal(findings.filter((v) => v.type === 'LAZY_AI_PLACEHOLDER').length, 1);
  for (const finding of findings) assert.equal(source.slice(finding.charOffset.start, finding.charOffset.end), finding.match);
});

test('ignore markers inside a longer fence cannot escape through a shorter fence', () => {
  const source = '````md\n```\n<!-- humanizer-ignore-file -->\n```\n````\nThis is a game changer.';
  const findings = analyzeText(source, { language: 'en' }).violations;
  assert.ok(findings.some((v) => v.match === 'game changer'));
});

test('ignore directives inside multiline JavaScript template strings are not active', () => {
  const source = 'const example = `\n<!-- humanizer-ignore-file -->\n`;\n// ... rest of code';
  const findings = analyzeText(source, { domain: 'code', sourcePath: 'app.js' }).violations;
  assert.ok(findings.some((v) => v.type === 'LAZY_AI_PLACEHOLDER'));
});

test('ignore-file text inside multiline code comments is not active', () => {
  const source = '/* Example:\n<!-- humanizer-ignore-file -->\n*/\n// ... rest of code';
  const findings = analyzeText(source, { domain: 'code', sourcePath: 'app.js' }).violations;
  assert.ok(findings.some((v) => v.type === 'LAZY_AI_PLACEHOLDER'));
});

test('code containing templates does not apply ambiguous ignore directives', () => {
  const source = 'const example = `text`;\n// humanizer-ignore\n// ... rest of code';
  const result = analyzeText(source, { domain: 'code', sourcePath: 'app.js' });
  assert.ok(result.violations.some((v) => v.type === 'LAZY_AI_PLACEHOLDER'));
  assert.match(result.ignoreWarning, /disabled.*backticks/i);
});

test('Markdown fences require matching delimiter and hide unclosed code', () => {
  for (const source of [
    '````js\n// game changer\n```\n// game changer\n````\nThis is a game changer.',
    '```js\n// game changer\n~~~\n// game changer',
  ]) {
    const matches = analyzeText(source, { language: 'en' }).violations.filter((v) => v.ruleId === 'EN015');
    assert.equal(matches.length, source.includes('This is') ? 1 : 0);
    for (const v of matches) assert.equal(source.slice(v.charOffset.start, v.charOffset.end), v.match);
  }
});

test('rhythm gate evaluates eight sentences', () => {
  const result = analyzeText(Array(8).fill(sentence).join(' '), { language: 'en' });
  assert.equal(result.metrics.sentenceCount, 8);
  assert.equal(result.deliveryGate.rhythmAndStylometry.status, 'EVALUATED');
  assert.ok(result.violations.some((v) => v.type === 'LOW_BURSTINESS'));
});
