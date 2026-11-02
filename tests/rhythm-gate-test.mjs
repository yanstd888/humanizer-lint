import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
const { analyzeText, runAnalyzeCli } = await import(new URL(['..', 'scripts', 'analyze.mjs'].join('/'), import.meta.url));
const { runBenchmark } = await import(new URL(['..', 'scripts', 'benchmark.mjs'].join('/'), import.meta.url));

const sentence = 'The project team reviewed the deployment plan and confirmed that every service remained available during testing.';

test('each of the 26 taxonomy categories has a triggering example', () => {
  const longLead = `${Array(3).fill('The project team reviewed the deployment plan and confirmed that every service remained available during testing.').join(' ')} We recommend the first option.`;
  const examples = [
    ['NOT_X_BUT_Y', "It's not just speed, it's reliability."],
    ['DRAMATIC_ONE_LINE_CLOSER', 'Let that sink in.'],
    ['DEEP_SOUNDING_SAYING', 'At its core, what really matters is trust.'],
    ['STAGED_RUN_UP', "Here's the kicker: the build failed."],
    ['ARGUING_WITH_NO_ONE', 'A tempting approach would be to skip testing.'],
    ['FORCED_TRIAD', 'We value innovation, inspiration, and insights.'],
    ['REPEATED_SENTENCE_OPENING', 'The workers checked the logs. The workers restarted the service.'],
    ['EM_DASH_OVERUSE', 'One fact — one detail — one result.'],
    ['STACKED_QUALIFIERS', 'It could potentially possibly be argued.'],
    ['OVER_HYPHENATION', 'It uses an end-to-end-cloud-ready system.'],
    ['PASSIVE_MISSING_SUBJECT', 'It was decided that the project should proceed.'],
    ['SLOP_PHRASE', 'The team will delve into the subject.'],
    ['INFLATED_SIGNIFICANCE', 'The company continues to thrive.'],
    ['VAGUE_CONNECTION', 'This is in connection with the project.'],
    ['SHALLOW_PARTICIPLE_TAIL', 'The team shipped the update, reflecting the outcome.'],
    ['HYPERBOLIC_CLAIM', 'Supercharge your workflow.'],
    ['BORROWED_AUTHORITY', 'Experts believe this result matters.'],
    ['COPULA_AVOIDANCE', 'The platform serves as a hub.'],
    ['DECORATIVE_BOLD_LIST', '- **Speed:** Fast delivery.\n- **Cost:** Lower expense.\n- **Safety:** Protected access.'],
    ['DECORATIVE_HEADING', '# 🚀 Release notes\nA routine update follows.'],
    ['INCONSISTENT_QUOTES', 'The labels "alpha" and “beta” are shown.'],
    ['CHATBOT_RESIDUE', 'Great question! The task is ready.'],
    ['KNOWLEDGE_LIMIT_DISCLAIMER', 'While details are limited in available sources, it appears possible.'],
    ['HEADING_REPEATED_IN_OPENING', '# Deployment steps\nDeployment steps. Start by checking the logs.'],
    ['META_DOCUMENT_TALK', 'The table below compares the results.'],
    ['DELAYED_DECISION_LEAD', longLead],
  ];
  assert.equal(new Set(examples.map(([type]) => type)).size, 26);
  const weak = new Set(['FORCED_TRIAD', 'REPEATED_SENTENCE_OPENING', 'EM_DASH_OVERUSE', 'STACKED_QUALIFIERS', 'OVER_HYPHENATION', 'PASSIVE_MISSING_SUBJECT', 'VAGUE_CONNECTION', 'SHALLOW_PARTICIPLE_TAIL', 'DECORATIVE_BOLD_LIST', 'DECORATIVE_HEADING', 'INCONSISTENT_QUOTES', 'HEADING_REPEATED_IN_OPENING', 'META_DOCUMENT_TALK', 'DELAYED_DECISION_LEAD']);
  for (const [type, text] of examples) {
    const matches = analyzeText(text, { language: 'en', sourcePath: 'draft.md' }).violations.filter((v) => v.type === type);
    assert.ok(matches.length, type);
    assert.ok(matches.every((v) => v.severity === (weak.has(type) ? 'warn' : 'error')), `${type} severity`);
  }
});

test('explicit T17 blueprint examples match their categories', async () => {
  const examples = JSON.parse(await readFile(new URL('./fixtures/t17-blueprint.json', import.meta.url), 'utf8'));
  assert.equal(examples.length, 54);
  for (const [language, type, text] of examples) {
    const report = analyzeText(text, { language, sourcePath: 'draft.md' });
    assert.ok(report.violations.some((v) => v.type === type), `${language}: ${type}: ${text}`);
  }
});

test('hyphenated Creative Commons license identifiers are not style findings', () => {
  for (const text of ['Licensed under CC-BY-NC-SA 4.0.', 'Licensed under CC-BY-NC-ND 4.0.']) {
    assert.ok(!analyzeText(text, { language: 'en' }).violations.some((v) => v.type === 'OVER_HYPHENATION'));
  }
  assert.ok(analyzeText('An end-to-end-cloud-ready system.', { language: 'en' }).violations.some((v) => v.type === 'OVER_HYPHENATION'));
});

test('sales hyperbole flags a life-changing guarantee but not a directly negated claim', () => {
  const text = '🙂 This product is guaranteed to change your life forever.';
  const report = analyzeText(text, { language: 'en', domain: 'copywriting' });
  const finding = report.violations.find((item) => item.type === 'HYPERBOLIC_CLAIM');
  assert.ok(finding);
  assert.equal(finding.severity, 'error');
  assert.ok(report.score < 100, 'a strong finding must deduct points even when rhythm is skipped');
  assert.match(report.deliveryGate.rhythmAndStylometry.status, /^SKIP\b/);
  const suppressed = analyzeText(text, { language: 'en', domain: 'copywriting', allowlist: [finding.match] });
  assert.equal(suppressed.score, 100);
  assert.equal(suppressed.status, 'SKIP');
  assert.ok(suppressed.suppressed.some((item) => item.type === 'HYPERBOLIC_CLAIM'));
  assert.equal(text.slice(finding.charOffset.start, finding.charOffset.end), finding.match);
  assert.ok(analyzeText(text, { language: 'en', sourcePath: 'draft.md' }).violations.some((item) => item.type === 'HYPERBOLIC_CLAIM'));
  assert.equal(analyzeText(text, { language: 'en', domain: 'prose' }).violations.some((item) => item.type === 'HYPERBOLIC_CLAIM'), false);
  assert.equal(analyzeText('This product is not guaranteed to change your life forever.', { language: 'en', domain: 'copywriting' }).violations.some((item) => item.type === 'HYPERBOLIC_CLAIM'), false);
});

test('short slop findings deduct points without enabling rhythm statistics', () => {
  const report = analyzeText('We will delve into the details.', { language: 'en' });
  assert.ok(report.violations.some((item) => item.type === 'SLOP_PHRASE' && item.severity === 'error'));
  assert.equal(report.score, 95);
  assert.match(report.deliveryGate.rhythmAndStylometry.status, /^SKIP\b/);
});

test('specified multilingual taxonomy examples trigger their named categories', () => {
  const examples = [
    ['en', 'NOT_X_BUT_Y', "This doesn't mean the service failed. It means the test failed."],
    ['id', 'NOT_X_BUT_Y', 'Bukan sekadar cepat, melainkan aman.'],
    ['zh', 'NOT_X_BUT_Y', '不仅是速度，更是可靠性。'],
    ['en', 'DRAMATIC_ONE_LINE_CLOSER', 'No prior. No nostalgia.'],
    ['id', 'DRAMATIC_ONE_LINE_CLOSER', 'Dan itulah kunci utamanya.'],
    ['id', 'DEEP_SOUNDING_SAYING', 'Pada intinya, yang terpenting adalah kepercayaan.'],
    ['id', 'STAGED_RUN_UP', 'Rahasianya sederhana: lakukan pengujian.'],
    ['id', 'ARGUING_WITH_NO_ONE', 'Bukan berarti kecepatan tidak penting, namun keamanan penting.'],
    ['id', 'FORCED_TRIAD', 'Kami memilih cepat, aman, dan terpercaya.'],
    ['en', 'INFLATED_SIGNIFICANCE', 'The future looks bright.'],
    ['id', 'VAGUE_CONNECTION', 'Hal ini berkaitan erat dengan dinamika proyek.'],
    ['id', 'SHALLOW_PARTICIPLE_TAIL', 'Tim merilis pembaruan, memastikan keamanan.'],
    ['id', 'BORROWED_AUTHORITY', 'Para ahli menyebut hasil ini penting.'],
    ['id', 'COPULA_AVOIDANCE', 'Layanan hadir sebagai penghubung.'],
    ['id', 'CHATBOT_RESIDUE', 'Tentu, berikut adalah jawabannya.'],
    ['id', 'CHATBOT_RESIDUE', 'Semoga membantu!'],
    ['id', 'META_DOCUMENT_TALK', 'Bagian berikut akan menjelaskan hasilnya.'],
    ['en', 'VAGUE_CONNECTION', 'This is associated with the leadership of Alice.'],
    ['en', 'COPULA_AVOIDANCE', 'The building stands as a monument.'],
    ['en', 'CHATBOT_RESIDUE', 'I hope this helps!'],
    ['en', 'SLOP_PHRASE', 'This testament describes the landscape.'],
    ['id', 'STACKED_QUALIFIERS', 'Ini mungkin cenderung dapat dikatakan penting.'],
    ['en', 'STAGED_RUN_UP', 'Let’s dive in.'],
    ['en', 'INFLATED_SIGNIFICANCE', 'This marks a pivotal moment.'],
  ];
  for (const [language, type, text] of examples) {
    assert.ok(analyzeText(text, { language, sourcePath: 'draft.md' }).violations.some((v) => v.type === type), `${language}: ${type}: ${text}`);
  }
});

test('long sentences and markup retain diagnostics and original offsets', async () => {
  const text = `${'A'.repeat(50000)}   game changer.`;
  const finding = analyzeText(text, { language: 'en' }).violations.find((v) => v.type === 'SLOP_PHRASE');
  assert.ok(finding);
  assert.equal(text.slice(finding.charOffset.start, finding.charOffset.end), 'game changer');
  const html = `<img src="${'a'.repeat(50000)}">`;
  let output = ''; let error = '';
  const code = await runAnalyzeCli(['--stdin', '--domain', 'ui', '--json'], { stdin: async () => html, stdout: (s) => { output += s; }, stderr: (s) => { error += s; } });
  assert.equal(code, 1, error);
  const img = JSON.parse(output).violations.find((v) => v.type === 'MISSING_IMG_ALT');
  assert.equal(html.slice(img.charOffset.start, img.charOffset.end), html);
  let briefOutput = '';
  assert.equal(await runAnalyzeCli(['--stdin', '--domain', 'ui', '--json', '--brief'], { stdin: async () => html, stdout: (s) => { briefOutput += s; }, stderr: (s) => { error += s; } }), 1, error);
  const briefImg = JSON.parse(briefOutput).violations.find((v) => v.type === 'MISSING_IMG_ALT');
  assert.equal(briefImg.match, img.match);
  assert.deepEqual(briefImg.charOffset, img.charOffset);
});

test('borrowed-authority flags unnamed experts but recognizes explicit same-sentence attribution', () => {
  for (const [language, text] of [
    ['en', 'Experts believe the treatment works, according to WHO.'],
    ['en', 'Experts believe the treatment works, according to Dr. Maya Chen.'],
    ['id', 'Para ahli menyebut tindakan ini aman, menurut Dr. Maya Putri.'],
  ]) assert.equal(analyzeText(text, { language }).violations.some((v) => v.type === 'BORROWED_AUTHORITY'), false, text);
  for (const [language, text] of [
    ['en', 'Experts believe the treatment works, according to local reports.'],
    ['en', 'Experts believe the treatment works. According to WHO, the issue needs study.'],
    ['id', 'Para ahli menyebut tindakan ini aman, menurut laporan setempat.'],
  ]) {
    const finding = analyzeText(text, { language }).violations.find((v) => v.type === 'BORROWED_AUTHORITY');
    assert.ok(finding, text);
    assert.equal(text.slice(finding.charOffset.start, finding.charOffset.end), finding.match);
  }
});

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

test('report satisfies required JSON schema fields for findings and suppression', async () => {
  const schema = JSON.parse(await readFile(new URL(['..', 'schemas', 'report.schema.json'].join('/'), import.meta.url), 'utf8'));
  const result = analyzeText('This is a game changer.', { language: 'en', allowlist: ['game changer'] });
  const validate = (value, definition, where = '$') => {
    if (definition.$ref) return validate(value, schema.$defs[definition.$ref.split('/').at(-1)], where);
    if (definition.const !== undefined) assert.equal(value, definition.const, where);
    if (definition.enum) assert.ok(definition.enum.includes(value), where);
    if (definition.type === 'object') {
      assert.ok(value && typeof value === 'object' && !Array.isArray(value), where);
      for (const field of definition.required ?? []) assert.ok(field in value, `${where}.${field}`);
      for (const [field, rule] of Object.entries(definition.properties ?? {})) if (field in value) validate(value[field], rule, `${where}.${field}`);
    } else if (definition.type === 'array') {
      assert.ok(Array.isArray(value), where);
      for (const [index, item] of value.entries()) validate(item, definition.items, `${where}[${index}]`);
    } else if (definition.type === 'integer') assert.ok(Number.isInteger(value), where);
    else if (definition.type) assert.equal(typeof value, definition.type, where);
    if (definition.minimum !== undefined) assert.ok(value >= definition.minimum, where);
    if (definition.maximum !== undefined) assert.ok(value <= definition.maximum, where);
  };
  validate(result, schema);
  validate(analyzeText('This is a game changer.', { language: 'en' }), schema);
});

test('brief output is an explicit JSON-only projection', async () => {
  let output = '';
  const io = { stdin: async () => 'This is a game changer.', stdout: (s) => { output += s; }, stderr: () => {} };
  assert.equal(await runAnalyzeCli(['--stdin', '--lang', 'en', '--json', '--brief'], io), 1);
  const value = JSON.parse(output);
  let full = '';
  await runAnalyzeCli(['--stdin', '--lang', 'en', '--json'], { ...io, stdout: (s) => { full += s; } });
  assert.ok(Buffer.byteLength(output) <= Buffer.byteLength(full) * 0.4, 'this fixture should meet the brief size goal');
  for (const name of ['schemaVersion', 'status', 'score', 'deliveryGate', 'targets', 'violations']) assert.ok(name in value, name);
  assert.equal('metrics' in value, false);
  assert.equal(await runAnalyzeCli(['--stdin', '--brief'], io), 2);
});

test('brief suppression-heavy output keeps essential details within the size target', async () => {
  const text = Array(50).fill('<!-- humanizer-ignore -->\nThis game changer is a game changer.').join('\n');
  const outputs = [];
  for (const flag of [[], ['--brief']]) {
    let output = '';
    await runAnalyzeCli(['--stdin', '--lang', 'en', '--json', ...flag], { stdin: async () => text, stdout: (s) => { output += s; }, stderr: () => {} });
    outputs.push(output);
  }
  const full = JSON.parse(outputs[0]);
  const brief = JSON.parse(outputs[1]);
  assert.ok(Buffer.byteLength(outputs[1]) <= Buffer.byteLength(outputs[0]) * 0.4);
  assert.equal(brief.suppressed.length, full.suppressed.length);
  for (let i = 0; i < full.suppressed.length; i += 1) {
    for (const key of ['type', 'ruleId', 'location', 'charOffset', 'directive', 'match', 'sourceScope']) {
      assert.deepEqual(brief.suppressed[i][key], full.suppressed[i][key], key);
    }
  }
});

test('finding coordinates use original UTF-16 offsets for CRLF, emoji and links', () => {
  const input = 'Intro 🙂.\r\n[game changer](https://example.org).';
  const result = analyzeText(input, { language: 'en' });
  const finding = result.violations.find((item) => item.match === 'game changer');
  assert.equal(result.schemaVersion, 1);
  assert.ok(finding);
  assert.equal(input.slice(finding.charOffset.start, finding.charOffset.end), finding.match);
  assert.equal(finding.line, 2);
  assert.equal(finding.column, 2);
  assert.equal(finding.endLine, 2);
  assert.equal(finding.endColumn, 14);
});

test('exact finding offsets survive BOM, frontmatter, code and links', () => {
  for (const input of [
    '\uFEFF---\r\ntitle: Example\r\n---\r\n🙂 [game changer](https://example.org).',
    'Ignore `game changer`. This is a game changer. This is a game changer.',
  ]) {
    const matches = analyzeText(input, { language: 'en' }).violations.filter((finding) => finding.ruleId === 'EN015');
    assert.ok(matches.length);
    for (const finding of matches) assert.equal(input.slice(finding.charOffset.start, finding.charOffset.end), finding.match);
  }
});

test('stdin filename routes domain checks like file input, with explicit override', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'humanizer-stdin-'));
  try {
    const file = path.join(dir, 'component.tsx');
    const input = '<img src="cat.jpg">';
    await writeFile(file, input, 'utf8');
    let fromFile = '';
    let fromStdin = '';
    const fileStatus = await runAnalyzeCli(['--file', file, '--json'], { stdout: (s) => { fromFile += s; }, stderr: () => {} });
    const stdinStatus = await runAnalyzeCli(['--stdin', '--stdin-filename', file, '--json'], { stdin: async () => input, stdout: (s) => { fromStdin += s; }, stderr: () => {} });
    assert.equal(stdinStatus, fileStatus);
    assert.deepEqual(JSON.parse(fromStdin), JSON.parse(fromFile));
    let override = '';
    await runAnalyzeCli(['--stdin', '--stdin-filename', file, '--domain', 'prose', '--json'], { stdin: async () => input, stdout: (s) => { override += s; }, stderr: () => {} });
    assert.ok(!JSON.parse(override).violations.some((finding) => finding.type === 'MISSING_IMG_ALT'));
    assert.equal(await runAnalyzeCli(['--file', file, '--stdin-filename', 'x.tsx'], { stdout: () => {}, stderr: () => {} }), 2);
  } finally { await rm(dir, { recursive: true, force: true }); }
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

test('file ignore applies only within the first 10 physical lines', () => {
  const prefix = Array(10).fill('Neutral line.').join('\n');
  const ignored = `---\ntitle: Sample\n---\n${'\n'.repeat(6)}<!-- humanizer-ignore-file -->\nThis is a game changer.`;
  const late = `${prefix}\n<!-- humanizer-ignore-file -->\nThis is a game changer.`;
  assert.equal(analyzeText(ignored, { language: 'en' }).violations.length, 0);
  const lateResult = analyzeText(late, { language: 'en' });
  assert.ok(lateResult.violations.some((v) => v.match === 'game changer'));
  assert.ok(lateResult.ignoreWarnings.some((warning) => /10/u.test(warning)));
  const typo = analyzeText('<!-- humanizer-ignroe -->\nThis is a game changer.', { language: 'en' });
  assert.ok(typo.violations.some((v) => v.match === 'game changer'));
  assert.ok(typo.ignoreWarnings.length);
  const invalid = analyzeText('<!-- humanizer-ignore bad-rule -->\nThis is a game changer.', { language: 'en' });
  assert.ok(invalid.violations.some((v) => v.match === 'game changer'));
  assert.ok(invalid.ignoreWarnings.length);
});

test('ambiguous Markdown inline directives fail closed with warnings', () => {
  for (const prefix of ['- ', '> ', '| ']) {
    const result = analyzeText(`${prefix}This is a game changer. <!-- humanizer-ignore -->`, { language: 'en' });
    assert.ok(result.violations.some((v) => v.match === 'game changer'), prefix);
    assert.ok(result.ignoreWarnings.length, prefix);
  }
});

test('blanket and allowlist suppression is reported accurately', () => {
  const input = '<!-- humanizer-ignore -->\nThis is a game changer.\nThis is a game changer.';
  const result = analyzeText(input, { language: 'en' });
  assert.equal(result.violations.filter((finding) => finding.match === 'game changer').length, 1);
  assert.equal(result.suppressed.filter((finding) => finding.match === 'game changer').length, 1);
  assert.equal(result.suppressed.length, 1);
  assert.equal(result.suppressed[0].directive.line, 1);
  const allowed = analyzeText('This is a game changer.', { language: 'en', allowlist: ['game changer'] });
  assert.deepEqual(allowed.allowlistApplied, ['game changer']);
  assert.equal(allowed.suppressed[0].match, 'game changer');
  const code = analyzeText('// humanizer-ignore\n// Import dependencies\n// ... rest of code', { domain: 'code' });
  assert.ok(code.suppressed.some((v) => v.type === 'TAUTOLOGICAL_CODE_COMMENT'));
  assert.ok(code.violations.some((v) => v.type === 'LAZY_AI_PLACEHOLDER'));
  const full = analyzeText('<!-- humanizer-ignore-file -->\nThis is a game changer.', { language: 'en' });
  assert.ok(full.suppressed.some((v) => v.match === 'game changer' && v.directive.kind === 'file'));
  const fenced = analyzeText('```html\n<!-- humanizer-ignore SLOP_PHRASE -->\n```\nThis is a game changer.', { language: 'en' });
  assert.ok(fenced.violations.some((v) => v.match === 'game changer'));
  assert.equal(fenced.suppressed.length, 0);
  assert.ok(fenced.ignoreWarnings.some((warning) => /line 2.*ignore.*inactive/i.test(warning)));
  assert.match(fenced.ignoreWarning, /line 2.*ignore.*inactive/i);
});

test('scoped ignore reports only matching findings and strict audit restores them', () => {
  const input = '<!-- humanizer-ignore SLOP_PHRASE -->\nThis is a game changer. <img src="x">';
  const result = analyzeText(input, { language: 'en', domain: 'ui' });
  assert.ok(result.suppressed.some((v) => v.type === 'SLOP_PHRASE' && v.directive.line === 1));
  assert.ok(result.violations.some((v) => v.type === 'MISSING_IMG_ALT'));
  assert.equal(result.violations.some((v) => v.type === 'SLOP_PHRASE'), false);
  assert.ok(analyzeText(input, { language: 'en', domain: 'ui', noIgnore: true }).violations.some((v) => v.type === 'SLOP_PHRASE'));
});

test('strict no-ignore audit restores inline and allowlisted findings', async () => {
  const input = '<!-- humanizer-ignore -->\nThis is a game changer.';
  let output = '';
  const status = await runAnalyzeCli(['--stdin', '--lang', 'en', '--allow', 'game changer', '--no-ignore', '--json'], {
    stdin: async () => input, stdout: (value) => { output += value; }, stderr: () => {},
  });
  assert.equal(status, 1);
  assert.ok(JSON.parse(output).violations.some((finding) => finding.match === 'game changer'));
  const clean = analyzeText('<!-- humanizer-ignore -->\nA clear sentence.', { language: 'en', noIgnore: true });
  assert.ok(!clean.violations.some((finding) => finding.type === 'STRUCTURAL_CLICHE'));
  const profileAudit = analyzeText('This is a game changer.', { language: 'en', profile: { allowlist: ['game changer'] }, noIgnore: true });
  assert.ok(profileAudit.violations.some((finding) => finding.match === 'game changer'));
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
    assert.ok(result.violations.some((v) => v.type === 'SHALLOW_PARTICIPLE_TAIL' && v.severity === 'warn'));
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

test('MDX template text cannot apply file ignore outside the template', () => {
  const source = 'export const example = `\n<!-- humanizer-ignore-file -->\n`;\n\nThis is a game changer.';
  const result = analyzeText(source, { language: 'en', sourcePath: 'example.mdx' });
  assert.ok(result.violations.some((v) => v.match === 'game changer'));
  assert.equal(result.suppressed.length, 0);
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

test('rhythm gate boundary handles abbreviations, decimals and CJK punctuation', () => {
  for (const [language, unit] of [['en', 'Dr. Lee measured 3.14 units.'], ['zh', '这是一个测试句子。']]) {
    for (const count of [7, 8]) {
      const result = analyzeText(Array(count).fill(unit).join(' '), { language });
      assert.equal(result.metrics.sentenceCount, count, language);
      assert.equal(result.deliveryGate.rhythmAndStylometry.status.startsWith('SKIP'), count === 7, language);
      assert.equal(result.violations.some((v) => ['FLAT_PARAGRAPH_RHYTHM', 'UNIFORM_CLAUSE_STRUCTURE'].includes(v.type)), count === 8, language);
    }
  }
});

test('strong staging tells are actionable and carry exact source offsets', () => {
  for (const [language, text, type] of [
    ['en', "It's not just speed, it's reliability.", 'NOT_X_BUT_Y'],
    ['en', "Here's the kicker: the build failed.", 'STAGED_RUN_UP'],
    ['en', 'Here is the thing: the build failed.', 'STAGED_RUN_UP'],
    ['en', 'Here is the kicker: the build failed.', 'STAGED_RUN_UP'],
    ['en', 'At its core, what really matters is trust.', 'DEEP_SOUNDING_SAYING'],
    ['id', 'Bukan sekadar cepat, melainkan aman.', 'NOT_X_BUT_Y'],
    ['id', 'Rahasianya sederhana: tim menguji kode.', 'STAGED_RUN_UP'],
  ]) {
    const result = analyzeText(text, { language });
    const finding = result.violations.find((item) => item.type === type);
    assert.ok(finding, `${language}: ${type}`);
    assert.equal(finding.severity, 'error');
    assert.equal(result.status, 'FAIL');
    assert.ok(result.score < 100);
    assert.ok(result.deliveryGate.lexicalAndMorphology.morphology.some((item) => item.type === type));
    assert.equal(text.slice(finding.charOffset.start, finding.charOffset.end), finding.match);
  }
  assert.ok(!analyzeText('Here is the thing you requested.', { language: 'en' }).violations.some((item) => item.type === 'STAGED_RUN_UP'));
});

test('selected strong editorial tells are errors in English and Indonesian', () => {
  for (const [language, text, type] of [
    ['en', 'Let that sink in.', 'DRAMATIC_ONE_LINE_CLOSER'],
    ['en', 'Great question! The task is ready.', 'CHATBOT_RESIDUE'],
    ['en', 'Here is the revised draft.', 'CHATBOT_RESIDUE'],
    ['id', 'Tentu, berikut adalah hasilnya.', 'CHATBOT_RESIDUE'],
    ['en', 'Experts believe this result matters.', 'BORROWED_AUTHORITY'],
    ['id', 'Semoga membantu!', 'CHATBOT_RESIDUE'],
    ['id', 'Para ahli menyebut hal ini penting.', 'BORROWED_AUTHORITY'],
  ]) {
    const result = analyzeText(text, { language });
    const finding = result.violations.find((item) => item.type === type);
    assert.ok(finding, `${language}: ${type}`);
    assert.equal(finding.severity, 'error');
    assert.equal(result.status, 'FAIL');
    assert.ok(result.score < 100);
  }
});

test('additional multilingual strong tells provide actionable exact matches', () => {
  for (const [language, text, type] of [
    ['en', "I'm not saying testing is useless, but it takes time.", 'ARGUING_WITH_NO_ONE'],
    ['en', 'A tempting approach would be to skip testing.', 'ARGUING_WITH_NO_ONE'],
    ['en', 'That is the real win.', 'DRAMATIC_ONE_LINE_CLOSER'],
    ['en', 'Honestly? The build failed.', 'STAGED_RUN_UP'],
    ['en', 'The company continues to thrive.', 'INFLATED_SIGNIFICANCE'],
    ['en', 'The launch marks a pivotal moment.', 'INFLATED_SIGNIFICANCE'],
    ['en', 'The future looks bright.', 'INFLATED_SIGNIFICANCE'],
    ['en', 'This does not mean the build failed. It means the test failed.', 'NOT_X_BUT_Y'],
    ['id', 'Pada intinya, yang terpenting adalah kepercayaan.', 'DEEP_SOUNDING_SAYING'],
    ['id', 'Produk ini berfungsi sebagai alat.', 'COPULA_AVOIDANCE'],
    ['en', 'The platform serves as a hub.', 'COPULA_AVOIDANCE'],
    ['en', 'While details are limited in available sources, it appears possible.', 'KNOWLEDGE_LIMIT_DISCLAIMER'],
    ['id', 'Bukan berarti pengujian tidak penting, namun waktu terbatas.', 'ARGUING_WITH_NO_ONE'],
    ['id', 'Proyek ini menandai tonggak sejarah penting.', 'INFLATED_SIGNIFICANCE'],
    ['zh', '这不仅是速度，更是可靠性。', 'NOT_X_BUT_Y'],
  ]) {
    const report = analyzeText(text, { language });
    const finding = report.violations.find((v) => v.type === type);
    assert.ok(finding, `${language}: ${type}`);
    assert.equal(finding.severity, 'error');
    assert.equal(report.status, 'FAIL');
    assert.ok(report.score < 100);
    assert.equal(text.slice(finding.charOffset.start, finding.charOffset.end), finding.match);
  }
});

test('participial tails are weak signals in English and Indonesian', () => {
  for (const [language, text] of [
    ['en', 'The team shipped the update, reflecting the outcome.'],
    ['en', 'The work improved the service, showcasing innovation.'],
    ['en', 'The work changed the process, symbolizing progress.'],
    ['id', 'Tim mengirim pembaruan, mencerminkan hasil kerja.'],
    ['id', 'Tim mengirim pembaruan, memastikan keamanan.'],
  ]) {
    const report = analyzeText(text, { language });
    const finding = report.violations.find((item) => item.type === 'SHALLOW_PARTICIPLE_TAIL');
    assert.ok(finding, language);
    assert.equal(finding.severity, 'warn');
    assert.equal(finding.weakAlone, true);
    assert.equal(text.slice(finding.charOffset.start, finding.charOffset.end), finding.match);
    assert.equal(report.score, 100);
  }
});

test('decorative Markdown headings are weak findings outside code fences', () => {
  const source = '```md\r\n# 🚀 Example\r\n```\r\n\r\n# 🚀 Release notes\r\nA routine update follows.';
  const report = analyzeText(source, { language: 'en', sourcePath: 'notes.md' });
  const findings = report.violations.filter((v) => v.type === 'DECORATIVE_HEADING');
  assert.equal(findings.length, 1);
  assert.equal(findings[0].severity, 'warn');
  assert.equal(source.slice(findings[0].charOffset.start, findings[0].charOffset.end), '# 🚀 Release notes');
  const suppressed = analyzeText('<!-- humanizer-ignore DECORATIVE_HEADING -->\n# 🚀 Release notes\nA routine update follows.', { language: 'en', sourcePath: 'notes.md' });
  assert.ok(!suppressed.violations.some((v) => v.type === 'DECORATIVE_HEADING'));
  assert.ok(suppressed.suppressed.some((v) => v.type === 'DECORATIVE_HEADING'));
  for (const text of ['---\ntitle: notes\n# 🚀 metadata\n---\nNormal content.', '<!--\n# 🚀 hidden comment\n-->\nNormal content.']) {
    assert.ok(!analyzeText(text, { language: 'en', sourcePath: 'notes.md' }).violations.some((v) => v.type === 'DECORATIVE_HEADING'));
  }
  const separated = analyzeText('# 🚀 First\n# Plain\nIt could potentially possibly be argued. This is in connection with work.', { language: 'en', sourcePath: 'notes.md' });
  assert.equal(separated.violations.find((v) => v.type === 'DECORATIVE_HEADING').severity, 'warn');
  const clustered = analyzeText('# 🚀 First\nIt could potentially possibly be argued. This is in connection with work.', { language: 'en', sourcePath: 'notes.md' });
  assert.equal(clustered.violations.find((v) => v.type === 'DECORATIVE_HEADING').severity, 'error');
  assert.equal(clustered.score, 85);
});

test('three consecutive bold-label list items produce one weak finding', () => {
  const lines = ['- **Speed:** Fast delivery.', '- **Cost:** Lower expense.', '- **Safety:** Protected access.'];
  const source = `😀 intro\r\n\r\n${lines.join('\r\n')}`;
  const finding = analyzeText(source, { language: 'en', sourcePath: 'notes.md' }).violations.find((v) => v.type === 'DECORATIVE_BOLD_LIST');
  assert.ok(finding);
  assert.equal(finding.severity, 'warn');
  assert.equal(source.slice(finding.charOffset.start, finding.charOffset.end), lines.join('\r\n'));
  for (const text of [lines.slice(0, 2).join('\n'), `${lines[0]}\n\n${lines[1]}\n${lines[2]}`, '```md\n' + lines.join('\n') + '\n```', '<!--\n' + lines.join('\n') + '\n-->']) {
    assert.ok(!analyzeText(text, { language: 'en', sourcePath: 'notes.md' }).violations.some((v) => v.type === 'DECORATIVE_BOLD_LIST'));
  }
  const ignored = analyzeText(`<!-- humanizer-ignore DECORATIVE_BOLD_LIST -->\n${lines.join('\n')}`, { language: 'en', sourcePath: 'notes.md' });
  assert.ok(!ignored.violations.some((v) => v.type === 'DECORATIVE_BOLD_LIST'));
  assert.ok(ignored.suppressed.some((v) => v.type === 'DECORATIVE_BOLD_LIST'));
  const strict = analyzeText(`<!-- humanizer-ignore DECORATIVE_BOLD_LIST -->\n${lines.join('\n')}`, { language: 'en', sourcePath: 'notes.md', noIgnore: true });
  assert.ok(strict.violations.some((v) => v.type === 'DECORATIVE_BOLD_LIST'));
  const clustered = '- **One:** It could potentially possibly be argued. This is in connection with work.\n- **Two:** A plain second line follows.\n- **Three:** A plain third line follows.';
  const report = analyzeText(clustered, { language: 'en', sourcePath: 'notes.md' });
  assert.equal(report.violations.find((v) => v.type === 'DECORATIVE_BOLD_LIST').severity, 'error');
});

test('heading repeated in the following opening is a weak finding', () => {
  const source = '# Deployment steps\nDeployment steps. Start by checking the logs.';
  const finding = analyzeText(source, { language: 'en', sourcePath: 'notes.md' }).violations.find((v) => v.type === 'HEADING_REPEATED_IN_OPENING');
  assert.ok(finding);
  assert.equal(finding.severity, 'warn');
  assert.equal(source.slice(finding.charOffset.start, finding.charOffset.end), finding.match);
  const ignored = '<!-- humanizer-ignore HEADING_REPEATED_IN_OPENING -->\r\n# Deployment steps\r\nDeployment steps.';
  const result = analyzeText(ignored, { language: 'en', sourcePath: 'notes.md' });
  assert.ok(result.suppressed.some((v) => v.type === 'HEADING_REPEATED_IN_OPENING'));
  assert.ok(analyzeText(ignored, { language: 'en', sourcePath: 'notes.md', noIgnore: true }).violations.some((v) => v.type === 'HEADING_REPEATED_IN_OPENING'));
  for (const text of ['# Deployment steps\nStart by checking the logs.', '# Deployment steps\n# Other\nDeployment steps.', '```md\n# Deployment steps\nDeployment steps.\n```']) {
    assert.ok(!analyzeText(text, { language: 'en', sourcePath: 'notes.md' }).violations.some((v) => v.type === 'HEADING_REPEATED_IN_OPENING'));
  }
});

test('mixed double-quote styles in a paragraph are a weak signal', () => {
  const source = '🙂 The labels "alpha" and “beta” are shown.';
  const report = analyzeText(source, { language: 'en' });
  const finding = report.violations.find((v) => v.type === 'INCONSISTENT_QUOTES');
  assert.ok(finding);
  assert.equal(finding.severity, 'warn');
  assert.equal(source.slice(finding.charOffset.start, finding.charOffset.end), finding.match);
  assert.ok(!analyzeText(source, { language: 'en', sourcePath: 'sample.ts' }).violations.some((v) => v.type === 'INCONSISTENT_QUOTES'));
  assert.ok(analyzeText(source, { language: 'en', sourcePath: 'sample.ts', domain: 'prose' }).violations.some((v) => v.type === 'INCONSISTENT_QUOTES'));
  for (const text of ['The labels "alpha" and "beta" are shown.', 'The labels “alpha” and “beta” are shown.', 'The label "alpha" is shown.\n\nThe label “beta” is shown.', 'The label "alpha" is shown and `“beta”` is code.', '```md\n"alpha" and “beta”\n```\nNormal prose.']) {
    assert.ok(!analyzeText(text, { language: 'en' }).violations.some((v) => v.type === 'INCONSISTENT_QUOTES'));
  }
  const ignored = '<!-- humanizer-ignore INCONSISTENT_QUOTES -->\nThe labels "alpha" and “beta” are shown.';
  assert.ok(analyzeText(ignored, { language: 'en' }).suppressed.some((v) => v.type === 'INCONSISTENT_QUOTES'));
  assert.ok(analyzeText(ignored, { language: 'en', noIgnore: true }).violations.some((v) => v.type === 'INCONSISTENT_QUOTES'));
  const clustered = 'The labels "alpha" and “beta” are shown. It could potentially possibly be argued. This is in connection with work.';
  const result = analyzeText(clustered, { language: 'en' });
  assert.equal(result.violations.find((v) => v.type === 'INCONSISTENT_QUOTES').severity, 'error');
  assert.equal(result.score, 85);
  const allowed = analyzeText(clustered, { language: 'en', allowlist: ['“beta”'] });
  assert.ok(allowed.suppressed.some((v) => v.type === 'INCONSISTENT_QUOTES'));
  assert.equal(allowed.violations.find((v) => v.type === 'VAGUE_CONNECTION').severity, 'warn');
});

test('a late explicit decision after a long opening is a weak signal', () => {
  const preamble = 'The project requires review because the available evidence describes several operational constraints and multiple possible implementation paths. The team considered how each path would affect maintenance, reliability, delivery timing, and the effort required from existing contributors. Several alternatives have different benefits, costs, and risks that need to be weighed against the stated project requirements.';
  const decision = 'We recommend the first option.';
  const source = `${preamble} ${decision}`;
  const finding = analyzeText(source, { language: 'en' }).violations.find((v) => v.type === 'DELAYED_DECISION_LEAD');
  assert.ok(finding);
  assert.equal(finding.severity, 'warn');
  assert.equal(source.slice(finding.charOffset.start, finding.charOffset.end), finding.match);
  for (const text of [`${decision} ${preamble}`, `The team reviewed options. ${decision}`, `${preamble}\n\n${decision}`, `${preamble} No decision was made.`]) {
    assert.ok(!analyzeText(text, { language: 'en' }).violations.some((v) => v.type === 'DELAYED_DECISION_LEAD'));
  }
  const sentence = (count) => `${Array(count).fill('word').join(' ')}.`;
  for (const [lengths, expected] of [[[15, 15, 14], false], [[15, 15, 15], true], [[23, 22], false]]) {
    const text = `${lengths.map(sentence).join(' ')} ${decision}`;
    assert.equal(analyzeText(text, { language: 'en' }).violations.some((v) => v.type === 'DELAYED_DECISION_LEAD'), expected);
  }
  const id = `${preamble} Kami merekomendasikan opsi pertama.`;
  assert.ok(analyzeText(id, { language: 'id' }).violations.some((v) => v.type === 'DELAYED_DECISION_LEAD'));
  const ignored = `${preamble}\r\n<!-- humanizer-ignore DELAYED_DECISION_LEAD -->\r\n${decision}`;
  const scoped = analyzeText(ignored, { language: 'en' });
  const suppressed = scoped.suppressed.find((v) => v.type === 'DELAYED_DECISION_LEAD');
  assert.ok(suppressed);
  assert.equal(ignored.slice(suppressed.charOffset.start, suppressed.charOffset.end), decision);
  assert.ok(analyzeText(ignored, { language: 'en', noIgnore: true }).violations.some((v) => v.type === 'DELAYED_DECISION_LEAD'));
  const separate = `${preamble}\r\n\r\n<!-- humanizer-ignore DELAYED_DECISION_LEAD -->\r\n${decision}`;
  assert.ok(!analyzeText(separate, { language: 'en', noIgnore: true }).violations.some((v) => v.type === 'DELAYED_DECISION_LEAD'));
  assert.ok(analyzeText(source, { language: 'en', allowlist: [decision] }).suppressed.some((v) => v.type === 'DELAYED_DECISION_LEAD'));
  assert.ok(analyzeText(source, { language: 'en', allowlist: [decision], noIgnore: true }).violations.some((v) => v.type === 'DELAYED_DECISION_LEAD'));
});

test('additional weak signals remain warnings when isolated', () => {
  for (const [language, text, type] of [
    ['id', 'Mungkin cenderung dapat dikatakan bahwa hal ini penting.', 'STACKED_QUALIFIERS'],
    ['id', 'Bagian berikut akan menjelaskan hasil uji.', 'META_DOCUMENT_TALK'],
    ['id', 'Hal itu berkaitan erat dengan dinamika pasar.', 'VAGUE_CONNECTION'],
    ['en', 'The result is associated with the leadership of the team.', 'VAGUE_CONNECTION'],
    ['en', 'We value innovation, inspiration, and insights.', 'FORCED_TRIAD'],
    ['id', 'Layanan ini cepat, aman, dan terpercaya.', 'FORCED_TRIAD'],
    ['en', 'It uses an end-to-end-cloud-ready system.', 'OVER_HYPHENATION'],
    ['en', 'It was decided that the project should proceed.', 'PASSIVE_MISSING_SUBJECT'],
  ]) {
    const result = analyzeText(text, { language });
    const finding = result.violations.find((v) => v.type === type);
    assert.ok(finding, `${language}: ${type}`);
    assert.equal(finding.severity, 'warn');
    assert.equal(finding.weakAlone, true);
    assert.equal(text.slice(finding.charOffset.start, finding.charOffset.end), finding.match);
  }
});

test('scoped directives preserve paragraph context for sequence findings', () => {
  const first = "This doesn't mean delays are unavoidable 🙂.";
  const second = 'It means the team needs a plan.';
  const marker = '<!-- humanizer-ignore NOT_X_BUT_Y -->';
  const source = `${first}\r\n${marker}\r\n${second}`;
  const strict = analyzeText(source, { language: 'en', noIgnore: true });
  const finding = strict.violations.find((v) => v.type === 'NOT_X_BUT_Y');
  assert.ok(finding);
  assert.equal(source.slice(finding.charOffset.start, finding.charOffset.end), finding.match);
  const separate = `🙂 ${first}\r\n\r\n${marker}\r\n${second}`;
  assert.ok(!analyzeText(separate, { language: 'en', noIgnore: true }).violations.some((v) => v.type === 'NOT_X_BUT_Y'));
});

test('paired contrast statements are detected across adjacent sentences only', () => {
  const close = 'No prior. No nostalgia.';
  const closeFinding = analyzeText(close, { language: 'en' }).violations.find((v) => v.type === 'DRAMATIC_ONE_LINE_CLOSER');
  assert.equal(closeFinding?.severity, 'error');
  assert.equal(closeFinding?.sourceScope, 'sentence-range');
  assert.equal(close.slice(closeFinding.charOffset.start, closeFinding.charOffset.end), closeFinding.match);
  for (const safe of ['No prior. We have no nostalgia.', 'No prior.\n\nNo nostalgia.', '```text\nNo prior. No nostalgia.\n```']) assert.ok(!analyzeText(safe, { language: 'en' }).violations.some((v) => v.type === 'DRAMATIC_ONE_LINE_CLOSER'));
  const text = "This doesn't mean delays are unavoidable. It means the team needs a plan.";
  const finding = analyzeText(text, { language: 'en' }).violations.find((v) => v.type === 'NOT_X_BUT_Y');
  assert.ok(finding);
  assert.equal(finding.severity, 'error');
  assert.equal(finding.sourceScope, 'sentence-range');
  assert.equal(text.slice(finding.charOffset.start, finding.charOffset.end), finding.match);
  const separate = "This doesn't mean delays are unavoidable.\n\nIt means the team needs a plan.";
  assert.ok(!analyzeText(separate, { language: 'en' }).violations.some((v) => v.type === 'NOT_X_BUT_Y'));
  const example = "```text\nThis doesn't mean delays are unavoidable. It means the team needs a plan.\n```";
  assert.ok(!analyzeText(example, { language: 'en' }).violations.some((v) => v.type === 'NOT_X_BUT_Y'));
});

test('repeated sentence openings are consecutive, paragraph-local and weak alone', () => {
  const text = 'The workers checked the logs. The workers restarted the service.';
  const report = analyzeText(text, { language: 'en' });
  const finding = report.violations.find((v) => v.type === 'REPEATED_SENTENCE_OPENING');
  assert.ok(finding);
  assert.equal(finding.severity, 'warn');
  assert.equal(finding.weakAlone, true);
  assert.equal(finding.sourceScope, 'sentence-range');
  assert.equal(text.slice(finding.charOffset.start, finding.charOffset.end), finding.match);
  assert.equal(report.score, 100);
  for (const separate of ['The workers checked the logs. The system restarted the service. The workers verified the fix.', 'The workers checked the logs.\n\nThe workers restarted the service.']) {
    assert.ok(!analyzeText(separate, { language: 'en' }).violations.some((v) => v.type === 'REPEATED_SENTENCE_OPENING'));
  }
});

test('dash overuse is detected independently in each paragraph', () => {
  const text = 'One fact — one detail.\n\nAnother fact — another detail.';
  assert.equal(analyzeText(text, { language: 'en' }).violations.filter((v) => v.type === 'EM_DASH_OVERUSE').length, 0);
  const clustered = 'One fact — one detail — one result.\n\nAnother fact — another detail — another result.';
  const found = analyzeText(clustered, { language: 'en' }).violations.filter((v) => v.type === 'EM_DASH_OVERUSE');
  assert.equal(found.length, 2);
  assert.ok(found.some((v) => v.location.startsWith('Paragraph 1')));
  assert.ok(found.some((v) => v.location.startsWith('Paragraph 2')));
  for (const finding of found) assert.equal(clustered.slice(finding.charOffset.start, finding.charOffset.end), finding.match);
});

test('dash frequency follows a matching custom voice profile', () => {
  const input = 'The server restarted — then recovered — and the queue cleared.';
  const baseline = analyzeText(input, { language: 'en' });
  assert.ok(baseline.violations.some((v) => v.ruleId === 'EN044' && v.type === 'EM_DASH_OVERUSE' && v.severity === 'warn'));
  const dashRate = 2 / baseline.metrics.wordCount;
  const matched = analyzeText(input, { language: 'en', profile: { targets: { punctuationRates: { dash: dashRate } } } });
  assert.ok(!matched.violations.some((v) => v.ruleId === 'EN044'));
  const fingerprint = analyzeText(input, { language: 'en', profile: { metrics: { punctuationRates: { dash: dashRate } } } });
  assert.ok(!fingerprint.violations.some((v) => v.ruleId === 'EN044'));
  const lower = analyzeText(input, { language: 'en', profile: { targets: { punctuationRates: { dash: dashRate / 2 } } } });
  assert.ok(lower.violations.some((v) => v.ruleId === 'EN044'));
});

test('dash voice baseline survives fingerprint rounding', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'humanizer-dash-profile-'));
  try {
    const text = 'One two three four — five six — seven eight. Nine ten eleven twelve thirteen fourteen fifteen sixteen. Seventeen eighteen nineteen twenty twentyone twentytwo twentythree twentyfour.';
    const sample = path.join(dir, 'sample.txt');
    await writeFile(sample, text);
    const { fingerprintSamples } = await import(new URL(['..', 'scripts', 'fingerprint.mjs'].join('/'), import.meta.url));
    const profile = await fingerprintSamples([sample], { language: 'en' });
    assert.ok(analyzeText(text, { language: 'en' }).violations.some((v) => v.ruleId === 'EN044'));
    assert.ok(!analyzeText(text, { language: 'en', profile }).violations.some((v) => v.ruleId === 'EN044'));
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('weak signals warn without penalty until three occur in a paragraph', () => {
  const signals = ['It could potentially possibly be argued.', 'This is in connection with the project.', 'The table below compares the results.'];
  for (const count of [1, 2, 3]) {
    const result = analyzeText(signals.slice(0, count).join(' '), { language: 'en' });
    const weak = result.violations.filter((v) => v.weakAlone);
    assert.equal(weak.length, count);
    assert.ok(weak.every((v) => v.severity === (count < 3 ? 'warn' : 'error')));
    assert.equal(result.score, count < 3 ? 100 : 85);
  }
  const scoped = analyzeText(signals.join(' '), { language: 'en', allowlist: ['in connection with'] });
  assert.equal(scoped.suppressed.length, 1);
  assert.ok(scoped.violations.filter((v) => v.weakAlone).every((v) => v.severity === 'warn'));
  const separated = analyzeText(signals.join('\n\n'), { language: 'en' });
  assert.ok(separated.violations.filter((v) => v.weakAlone).every((v) => v.severity === 'warn'));
  const allowed = analyzeText(signals.join('\n\n'), { language: 'en', allowlist: separated.violations.filter((v) => v.weakAlone).map((v) => v.match) });
  assert.equal(separated.score, allowed.score);
});

test('rhythm gate evaluates eight sentences', () => {
  const result = analyzeText(Array(8).fill(sentence).join(' '), { language: 'en' });
  assert.equal(result.metrics.sentenceCount, 8);
  assert.equal(result.deliveryGate.rhythmAndStylometry.status, 'EVALUATED');
  assert.ok(result.violations.some((v) => v.type === 'LOW_BURSTINESS'));
});
