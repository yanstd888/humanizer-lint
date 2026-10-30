import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { sanitizeMarkdown } from '../scripts/utils/sanitizer.mjs';
import { tokenizeText } from '../scripts/utils/tokenizer.mjs';
import {
  adjacentDelta,
  compressionRatio,
  coefficientOfVariation,
  mattr,
  mean,
  standardDeviation,
} from '../scripts/utils/metrics.mjs';
import { analyzeText, runAnalyzeCli } from '../scripts/analyze.mjs';
import { fingerprintSamples, runFingerprintCli } from '../scripts/fingerprint.mjs';

let rootPath = decodeURIComponent(new URL('../', import.meta.url).pathname);
if (/^\/[A-Za-z]:/.test(rootPath)) rootPath = rootPath.slice(1);
const root = path.resolve(rootPath);
const fixture = async (name) => readFile(path.join(root, 'tests', 'fixtures', name), 'utf8');

test('sanitizer removes non-prose and preserves prose paragraphs', () => {
  const input = `---\ntitle: Sample\n---\n# Heading\n\nA real sentence has enough words to remain here.\n\n\`inline code\` and https://example.com/a?q=1 remain entities.\n\n\`\`\`js\nconst ignored = 'Tidak dapat dipungkiri';\n\`\`\`\n\n| A | B |\n|---|---|\n| 1 | 2 |\n\n- fragment only\n- This list item contains a complete sentence with enough words.\n`;
  const output = sanitizeMarkdown(input);
  assert.doesNotMatch(output, /title: Sample|Heading|ignored|\| A \|/);
  assert.match(output, /A real sentence/);
  assert.match(output, /TOKEN_ENTITY and TOKEN_ENTITY remain entities/);
  assert.doesNotMatch(output, /fragment only/);
  assert.match(output, /This list item contains a complete sentence/);
});

test('sanitizer preserves URL punctuation and complete wrapped list prose', () => {
  const output = sanitizeMarkdown('- This complete list item wraps onto\n  a second line and ends with punctuation.\n\nRead the [annual report](https://example.com/report). See https://example.com/docs. Then continue.\n\n| A | B |   ');
  assert.match(output, /This complete list item wraps onto a second line and ends with punctuation\./);
  assert.match(output, /Read the annual report\./);
  assert.doesNotMatch(output, /\[annual report\]|TOKEN_ENTITY\)/);
  assert.match(output, /See TOKEN_ENTITY\. Then continue\./);
  assert.doesNotMatch(output, /\| A \|/);
});

test('tokenizer protects abbreviations, casing, quotes, and brackets', () => {
  const result = tokenizeText('Dr. Rina berkata, "Saya setuju." Mereka pun pergi. Mr. Cole left (quickly.) Everyone noticed.', 'auto');
  assert.equal(result.sentences.length, 4);
  assert.match(result.sentences[0].text, /^Dr\./);
  assert.deepEqual(result.sentences.map((sentence) => sentence.paragraphIndex), [1, 1, 1, 1]);
});

test('tokenizer preserves reduplication and protects decimals and ellipses', () => {
  const result = tokenizeText('Anak-anak membaca undang-undang itu... Nilainya 3.5 persen. Biayanya Rp 10.000 sekarang.', 'id');
  assert.deepEqual(result.sentences[0].words.slice(0, 4), ['anak-anak', 'membaca', 'undang-undang', 'itu']);
  assert.equal(result.sentences.length, 2);
  assert.ok(result.sentences.some((sentence) => sentence.text.includes('3.5')));
  assert.ok(result.sentences.some((sentence) => sentence.text.includes('10.000')));
});

test('automatic language detection favors Indonesian function words over technical loanwords', () => {
  const result = analyzeText('Framework cloud ini berjalan di server dan digunakan untuk deployment yang aman dengan konfigurasi dari tim. Operator memeriksa log setelah proses selesai. Catatan terakhir menjelaskan perubahan yang dibuat.', { language: 'auto' });
  assert.equal(result.language, 'id');
});

test('metrics implement the specified formulas', () => {
  const values = [2, 10, 4, 20];
  assert.equal(mean(values), 9);
  assert.equal(standardDeviation(values), 7);
  assert.equal(coefficientOfVariation(values), 7 / 9);
  assert.equal(adjacentDelta(values), 10);
  assert.ok(Math.abs(mattr(['a', 'b', 'a', 'c'], 3) - (2.5 / 3)) < 1e-12);
  assert.equal(compressionRatio(''), 0);
});

test('short prose skips statistical scoring without NaN values', () => {
  const result = analyzeText('Kalimat pendek. Selesai.', { language: 'id' });
  assert.equal(result.status, 'SKIP');
  assert.match(result.warning, /too short/i);
  for (const value of Object.values(result.metrics)) {
    if (typeof value === 'number') assert.ok(Number.isFinite(value));
  }
});

test('Markdown code and Indonesian whitelist words do not create false positives', () => {
  const text = `Perusahaan menjaga kesehatan anak-anak melalui diskusi distribusi dan digitalisasi rutin.\n\n\`\`\`txt\nTidak dapat dipungkiri bahwa pengimplementasian dilakukan.\n\`\`\`\n\nDiskriminasi dibahas tanpa distorsi oleh tim setelah pertemuan selesai. Undang-undang itu memberi dasar yang jauh lebih rinci untuk evaluasi berikutnya.`;
  const result = analyzeText(text, { language: 'id' });
  assert.equal(result.violations.some((v) => v.type === 'SLOP_PHRASE'), false);
  assert.equal(result.violations.some((v) => v.type === 'EXCESSIVE_NOMINALIZATION'), false);
  assert.equal(result.violations.some((v) => v.type === 'PASSIVE_BLOATING'), false);
});

test('custom voice profile creates a capped profile penalty when mean sentence length drifts', () => {
  const text = 'Rina membuka laporan pagi. Tim membaca catatan baru dengan teliti. Setelah data selesai diperiksa, mereka menyusun daftar perubahan yang cukup panjang untuk rapat siang dan membagikan tugas kepada setiap pemilik layanan.';
  const baseline = analyzeText(text, { language: 'id' });
  const result = analyzeText(text, {
    language: 'id',
    profile: { targets: { meanSentenceLength: 40 } },
  });
  assert.ok(result.violations.some((violation) => violation.type === 'VOICE_PROFILE_DEVIATION'));
  assert.equal(baseline.score - result.score, 5);
});

test('translationese openings trigger only when consecutive within one paragraph', () => {
  const sameParagraph = analyzeText('Dengan menggunakan data baru, tim memperbaiki jadwal kerja. Guna memastikan hasilnya stabil, operator memeriksa setiap catatan sebelum rapat dimulai. Mereka lalu mengirim laporan yang jauh lebih panjang kepada pemilik layanan.', { language: 'id' });
  assert.ok(sameParagraph.violations.some((violation) => violation.type === 'PASSIVE_BLOATING' && /consecutive sentences/i.test(violation.match)));

  const separateParagraphs = analyzeText('Dengan menggunakan data baru, tim memperbaiki jadwal kerja.\n\nGuna memastikan hasilnya stabil, operator memeriksa setiap catatan sebelum rapat dimulai. Kalimat terakhir dibuat jauh lebih panjang agar pemeriksaan statistik tetap berjalan tanpa mengubah tujuan pengujian ini.', { language: 'id' });
  assert.equal(separateParagraphs.violations.some((violation) => violation.type === 'PASSIVE_BLOATING' && /consecutive sentences/i.test(violation.match)), false);
});

test('statistical gate failures always include actionable diagnostics', () => {
  const text = [
    'Anna checked the morning report before the meeting started.',
    'Bram reviewed the latest figures before the meeting started.',
    'Clara opened the shared notes before the meeting started.',
    'Dimas tested the backup process before the meeting started.',
    'Elena verified the release checklist before the meeting started.',
    'Farid inspected the server logs before the meeting started.',
    'Grace compared the final totals before the meeting started.',
    'Hana updated the project board before the meeting started.',
  ].join(' ');
  const result = analyzeText(text, { language: 'en' });
  assert.equal(result.status, 'FAIL');
  const types = new Set(result.violations.map((violation) => violation.type));
  assert.ok(types.has('LOW_BURSTINESS'));
  assert.ok(types.has('MISSING_SENTENCE_RANGE'));
  assert.ok(types.has('LOW_ADJACENT_DELTA'));
  assert.ok(result.violations.every((violation) => violation.location && violation.fixInstruction));
});

test('required rule edge cases are detected', () => {
  const english = analyzeText('The change reduced delays, ensuring that the team could ship today. The first path--although old--still worked for several users. Another sentence is deliberately much longer because the analyzer needs enough prose to run its statistical and structural checks without using the short-text fallback.', { language: 'en' });
  assert.ok(english.violations.some((violation) => violation.type === 'STRUCTURAL_CLICHE' && /ensuring that/i.test(violation.match)));
  assert.ok(english.violations.some((violation) => violation.type === 'STRUCTURAL_CLICHE' && /--/.test(violation.match)));

  const indonesian = analyzeText('Pengembangan perangkat lunak terintegrasi adalah sebuah sistem yang menghubungkan pekerjaan lintas tim secara langsung. Tim menguji alurnya. Setelah pemeriksaan selesai, operator mencatat hasil yang jauh lebih rinci untuk bahan evaluasi berikutnya.', { language: 'id' });
  assert.ok(indonesian.violations.some((violation) => violation.type === 'DEFINITIONAL_OPENING'));
});

test('AI fixtures fail below 70 with actionable violations', async () => {
  for (const [name, language] of [['ai-sample-id.txt', 'id'], ['ai-sample-en.txt', 'en']]) {
    const result = analyzeText(await fixture(name), { language });
    assert.equal(result.status, 'FAIL', name);
    assert.ok(result.score < 70, `${name}: ${result.score}`);
    assert.ok(result.violations.length > 0, name);
    assert.ok(result.violations.every((v) => v.location && v.fixInstruction), name);
  }
});

test('human fixtures pass at 85 or above', async () => {
  for (const [name, language] of [['human-sample-id.txt', 'id'], ['human-sample-en.txt', 'en']]) {
    const result = analyzeText(await fixture(name), { language });
    assert.equal(result.status, 'PASS', `${name}: ${JSON.stringify(result, null, 2)}`);
    assert.ok(result.score >= 85, `${name}: ${result.score}`);
  }
});

test('CLI runners cover PASS, SKIP, FAIL, stdin, and invalid arguments', async () => {
  const failedOutput = [];
  const failCode = await runAnalyzeCli(
    ['--file', path.join(root, 'tests', 'fixtures', 'ai-sample-en.txt'), '--lang', 'en', '--json'],
    { stdout: (value) => failedOutput.push(value), stderr: (value) => failedOutput.push(value), stdin: async () => '' },
  );
  assert.equal(failCode, 1);
  assert.equal(JSON.parse(failedOutput.join('')).status, 'FAIL');

  const passedOutput = [];
  const passCode = await runAnalyzeCli(
    ['--stdin', '--lang', 'en', '--json'],
    { stdout: (value) => passedOutput.push(value), stderr: (value) => passedOutput.push(value), stdin: async () => fixture('human-sample-en.txt') },
  );
  assert.equal(passCode, 0);
  assert.equal(JSON.parse(passedOutput.join('')).status, 'PASS');

  const skippedOutput = [];
  const skipCode = await runAnalyzeCli(
    ['--stdin', '--lang', 'id', '--json'],
    { stdout: (value) => skippedOutput.push(value), stderr: (value) => skippedOutput.push(value), stdin: async () => 'Pendek. Selesai.' },
  );
  assert.equal(skipCode, 0);
  assert.equal(JSON.parse(skippedOutput.join('')).status, 'SKIP');

  const humanOutput = [];
  assert.equal(await runAnalyzeCli(
    ['--stdin', '--lang', 'id'],
    { stdout: (value) => humanOutput.push(value), stderr: (value) => humanOutput.push(value), stdin: async () => 'Pendek. Selesai.' },
  ), 0);
  assert.match(humanOutput.join(''), /Status:\s+SKIP[\s\S]*Metrics:/);

  const errors = [];
  assert.equal(await runAnalyzeCli([], { stdout: () => {}, stderr: (value) => errors.push(value), stdin: async () => '' }), 2);
  assert.match(errors.join(''), /exactly one input/i);
});

test('fingerprint aggregates one to five samples and writes a loadable profile', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'humanizer-lint-'));
  try {
    const first = path.join(dir, 'one.txt');
    const second = path.join(dir, 'two.txt');
    const output = path.join(dir, 'profile.json');
    await writeFile(first, await fixture('human-sample-id.txt'));
    await writeFile(second, await fixture('human-sample-en.txt'));
    const profile = await fingerprintSamples([first, second], { output });
    assert.equal(profile.sampleCount, 2);
    assert.ok(profile.metrics.burstinessCV > 0);
    assert.ok(profile.metrics.punctuationRates.comma >= 0);
    assert.deepEqual(JSON.parse(await readFile(output, 'utf8')), profile);

    const cliOutput = path.join(dir, 'cli-profile.json');
    const cliMessages = [];
    const cliCode = await runFingerprintCli(
      ['--input', first, '--output', cliOutput, '--name', 'cli-test', '--lang', 'id'],
      { stdout: (value) => cliMessages.push(value), stderr: (value) => cliMessages.push(value) },
    );
    assert.equal(cliCode, 0);
    assert.equal(JSON.parse(cliMessages.join('')).sampleCount, 1);
    assert.equal(JSON.parse(await readFile(cliOutput, 'utf8')).name, 'cli-test');

    const singleProfile = await fingerprintSamples([first]);
    const selfAnalysis = analyzeText(await readFile(first, 'utf8'), { language: 'id', profile: singleProfile });
    assert.equal(selfAnalysis.metrics.voiceProfileDeviation, 0);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('package metadata and rule catalogs match the public contract', async () => {
  const packageSource = await readFile(path.join(root, 'package.json'), 'utf8');
  const packageJson = JSON.parse(packageSource);
  const idRules = JSON.parse(await readFile(path.join(root, 'rules', 'id-slop.json'), 'utf8'));
  const enRules = JSON.parse(await readFile(path.join(root, 'rules', 'en-slop.json'), 'utf8'));
  const skill = await readFile(path.join(root, 'SKILL.md'), 'utf8');
  const readme = await readFile(path.join(root, 'README.md'), 'utf8');
  const workflow = await readFile(path.join(root, '.github', 'workflows', 'ci.yml'), 'utf8');
  const license = await readFile(path.join(root, 'LICENSE'), 'utf8');
  assert.equal(packageJson.type, 'module');
  assert.equal(packageJson.engines.node, '>=18.3.0');
  assert.equal(packageJson.name, 'humanizer-lint');
  assert.equal(packageJson.version, '0.2.3');
  assert.equal(packageJson.bin['humanizer-lint'], './scripts/analyze.mjs');
  assert.equal(packageJson.bin['humanizer-fingerprint'], './scripts/fingerprint.mjs');
  assert.equal((packageSource.match(/"files"\s*:/g) ?? []).length, 1);
  assert.ok(idRules.patterns.length >= 40);
  assert.ok(enRules.patterns.length >= 40);
  assert.match(skill, /^---\nname: humanizer-lint\n/);
  assert.match(skill, /compatibility: Node\.js >= 18\.3\.0/);
  assert.match(skill, /allowed-tools: Bash\(node:\*\) Read Write/);
  assert.match(skill, /metadata:\n  version: "0\.2\.3"\n  author: "yanstd888"/);
  assert.match(skill, /Mandatory deterministic verification|Run deterministic verification/i);
  assert.match(readme, /\[!\[skills\.sh\]\(https:\/\/skills\.sh\/b\/yanstd888\/humanizer-lint\)\]\(https:\/\/skills\.sh\/yanstd888\/humanizer-lint\)/);
  assert.doesNotMatch(readme, /skills\.sh\/yanstd888\/humanizer-lint\/humanizer-lint/);
  assert.match(readme, /humanizer-lint --file draft\.md --lang auto/);
  assert.doesNotMatch(readme, /\p{Extended_Pictographic}/u);
  assert.match(workflow, /npm test/);
  assert.match(workflow, /npm pack --dry-run/);
  assert.match(license, /MIT License/);

  const rootMarkdown = (await readdir(root)).filter((name) => name.toLowerCase().endsWith('.md')).sort();
  assert.deepEqual(rootMarkdown, ['README.md', 'SKILL.md']);
});

test('production scripts use only approved built-ins and forbidden APIs are absent', async () => {
  const scriptsRoot = path.join(root, 'scripts');
  const files = [];
  const visit = async (dir) => {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) await visit(file);
      else if (entry.name.endsWith('.mjs')) files.push(file);
    }
  };
  await visit(scriptsRoot);
  const allowed = new Set(['node:fs', 'node:path', 'node:os', 'node:zlib', 'node:util']);
  for (const file of files) {
    const source = await readFile(file, 'utf8');
    assert.doesNotMatch(source, /child_process|\beval\s*\(|\bFunction\s*\(|\bfetch\s*\(/, file);
    for (const match of source.matchAll(/from\s+['"](node:[^'"]+)['"]/g)) {
      assert.ok(allowed.has(match[1]), `${file} imports ${match[1]}`);
    }
  }
});
