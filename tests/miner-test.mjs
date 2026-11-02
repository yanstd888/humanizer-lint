import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, cp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const projectModule = (...segments) => new URL(['..', ...segments].join('/'), import.meta.url);
const { createAnalyzer } = await import(projectModule('scripts', 'core', 'analyzer-core.mjs'));
const { calculateMetrics } = await import(projectModule('scripts', 'utils', 'metrics.mjs'));

const script = new URL(['..', 'scripts', 'mine-patterns.mjs'].join('/'), import.meta.url);
test('miner compares document frequencies without modifying rule packs', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'humanizer-miner-'));
  try {
    const ai = path.join(dir, 'ai'); const human = path.join(dir, 'human');
    await mkdir(ai); await mkdir(human);
    for (let i = 0; i < 3; i += 1) await writeFile(path.join(ai, `${i}.txt`), 'Magic purple dragon arrives. Another sentence has many words. Ábaco zebra. Zebra alpha. Solar, orbit stable. Ｓｏｌａｒ, ｏｒｂｉｔ stable. Café naïve.');
    await writeFile(path.join(human, 'human.txt'), 'Ordinary prose contains no unusual animals.');
    const output = execFileSync(process.execPath, [fileURLToPath(script), '--ai-dir', ai, '--human-dir', human, '--lang', 'en'], { encoding: 'utf8' });
    assert.equal(output, execFileSync(process.execPath, [fileURLToPath(script), '--ai-dir', ai, '--human-dir', human, '--lang', 'en'], { encoding: 'utf8' }));
    const report = JSON.parse(output);
    assert.equal(report.corpus.ai.documents, 3);
    assert.ok(report.candidates.some((item) => item.phrase === 'magic purple dragon' && item.aiDocuments === 3 && item.humanDocuments === 0));
    const zebra = report.candidates.findIndex((item) => item.phrase === 'zebra alpha');
    const abaco = report.candidates.findIndex((item) => item.phrase === 'ábaco zebra');
    assert.ok(zebra >= 0 && abaco >= 0 && zebra < abaco, 'tie order must not depend on locale collation');
    assert.ok(report.corpus.human.metrics.mattr.length);
    assert.equal(report.exploratoryBaseline.mattr.sampleCount, 1);
    assert.match(report.caveat, /not validated/);
    const isolated = path.join(dir, 'isolated');
    await mkdir(path.join(isolated, 'scripts'), { recursive: true });
    await mkdir(path.join(isolated, 'rules'));
    await cp(fileURLToPath(script), path.join(isolated, 'scripts', 'mine-patterns.mjs'));
    await cp(fileURLToPath(new URL(['..', 'scripts', 'utils'].join('/'), import.meta.url)), path.join(isolated, 'scripts', 'utils'), { recursive: true });
    const pack = path.join(isolated, 'rules', 'en-slop.json');
    await writeFile(pack, JSON.stringify({ language: 'en', patterns: [] }));
    const args = [path.join(isolated, 'scripts', 'mine-patterns.mjs'), '--ai-dir', ai, '--human-dir', human, '--lang', 'en', '--write'];
    const initialPack = await readFile(pack, 'utf8');
    const dryReport = JSON.parse(execFileSync(process.execPath, args.slice(0, -1), { encoding: 'utf8' }));
    assert.ok(dryReport.candidates.length > 0);
    assert.equal(await readFile(pack, 'utf8'), initialPack, 'mining without --write must not modify the rule pack');
    const first = JSON.parse(execFileSync(process.execPath, args, { encoding: 'utf8' }));
    const rules = JSON.parse(await readFile(pack, 'utf8')).patterns;
    assert.ok(first.writtenRules > 0);
    assert.ok(rules.some((rule) => new RegExp(rule.pattern, 'iu').test('Magic purple dragon arrives.')));
    const solar = report.candidates.find((item) => item.phrase === 'solar orbit');
    assert.equal(solar.aiDocuments, 3);
    assert.deepEqual(solar.variants, ['solar orbit', 'ｓｏｌａｒ ｏｒｂｉｔ']);
    const punctuationRule = rules.find((rule) => new RegExp(rule.pattern, 'iu').test('Solar, orbit'));
    assert.ok(punctuationRule, 'mined n-grams should match corpus punctuation');
    const defaultProfile = JSON.parse(await readFile(projectModule('profiles', 'default-human.json'), 'utf8'));
    const { analyzeText } = createAnalyzer({ rules: { en: { patterns: [punctuationRule] } }, defaultProfile, calculateMetrics });
    assert.ok(analyzeText('Solar, orbit stable.', { language: 'en' }).violations.some((v) => v.ruleId === punctuationRule.id));
    assert.ok(analyzeText('Ｓｏｌａｒ, ｏｒｂｉｔ stable.', { language: 'en' }).violations.some((v) => v.ruleId === punctuationRule.id), 'mined rule must match corpus Unicode variants');
    const accentRule = rules.find((rule) => rule.minedPhrase === 'café naïve');
    assert.ok(accentRule);
    const accentedAnalyzer = createAnalyzer({ rules: { en: { patterns: [accentRule] } }, defaultProfile, calculateMetrics });
    for (const text of ['Café naïve.', 'Cafe\u0301 nai\u0308ve.', 'Cafe\u0301 naïve.', 'Café nai\u0308ve.']) {
      const finding = accentedAnalyzer.analyzeText(text, { language: 'en' }).violations.find((v) => v.ruleId === accentRule.id);
      assert.ok(finding, `canonical variant should match: ${text}`);
      assert.equal(text.slice(finding.charOffset.start, finding.charOffset.end), finding.match);
    }
    assert.equal(accentedAnalyzer.analyzeText('Café naïve\u0301.', { language: 'en' }).violations.some((v) => v.ruleId === accentRule.id), false, 'do not match a prefix inside a combining sequence');
    const beforeRepeat = await readFile(pack, 'utf8');
    const second = JSON.parse(execFileSync(process.execPath, args, { encoding: 'utf8' }));
    assert.equal(second.writtenRules, 0);
    assert.equal(await readFile(pack, 'utf8'), beforeRepeat, 'no-op write must preserve the existing file');
    await writeFile(pack, beforeRepeat.trim());
    execFileSync(process.execPath, args, { encoding: 'utf8' });
    assert.equal(await readFile(pack, 'utf8'), beforeRepeat.trim(), 'no-op write must not reformat the pack');
    await writeFile(path.join(ai, '0.txt'), 'Solar, orbit stable. Ｓｏｌａｒ, ｏｒｂｉｔ stable. 𝐬𝐨𝐥𝐚𝐫 𝐨𝐫𝐛𝐢𝐭 stable.');
    const third = JSON.parse(execFileSync(process.execPath, args, { encoding: 'utf8' }));
    assert.ok(third.candidates.find((item) => item.phrase === 'solar orbit').variants.includes('𝐬𝐨𝐥𝐚𝐫 𝐨𝐫𝐛𝐢𝐭'));
    const afterNewVariant = JSON.parse(await readFile(pack, 'utf8')).patterns;
    assert.equal(afterNewVariant.filter((rule) => rule.minedPhrase === 'solar orbit').length, 1, 'new Unicode variants must not duplicate existing rules');
    const legacy = '(?<![\\p{L}\\p{N}])solar orbit(?![\\p{L}\\p{N}])';
    await writeFile(pack, JSON.stringify({ language: 'en', patterns: [{ id: 'MINED_EN_1', pattern: legacy }] }));
    execFileSync(process.execPath, args, { encoding: 'utf8' });
    const updated = JSON.parse(await readFile(pack, 'utf8')).patterns;
    assert.equal(updated.filter((rule) => rule.pattern === legacy || rule.pattern === '(?<![\\p{L}\\p{N}])solar[\\s\\p{P}]+orbit(?![\\p{L}\\p{N}])').length, 1);
    const zhAi = path.join(dir, 'zh-ai'); const zhHuman = path.join(dir, 'zh-human');
    await mkdir(zhAi); await mkdir(zhHuman);
    for (let i = 0; i < 3; i += 1) await writeFile(path.join(zhAi, `${i}.txt`), '苹果香蕉非常好。');
    await writeFile(path.join(zhHuman, '0.txt'), '普通文字保持变化。');
    const zhPack = path.join(isolated, 'rules', 'zh-slop.json');
    await writeFile(zhPack, JSON.stringify({ language: 'zh', patterns: [] }));
    const zhArgs = [args[0], '--ai-dir', zhAi, '--human-dir', zhHuman, '--lang', 'zh', '--write'];
    const zhReport = JSON.parse(execFileSync(process.execPath, zhArgs, { encoding: 'utf8' }));
    assert.ok(zhReport.candidates.some((item) => item.phrase === '苹果 香蕉 非常 好'));
    const zhRules = JSON.parse(await readFile(zhPack, 'utf8')).patterns;
    const zhRule = zhRules.find((rule) => new RegExp(rule.pattern, 'iu').test('苹果香蕉非常好'));
    assert.ok(zhRule, 'mined Chinese n-grams must match adjacent tokens');
    const zhAnalyzer = createAnalyzer({ rules: { zh: { patterns: [zhRule] } }, defaultProfile, calculateMetrics });
    assert.ok(zhAnalyzer.analyzeText('苹果香蕉非常好。', { language: 'zh' }).violations.some((v) => v.ruleId === zhRule.id));
    const prefixRule = zhRules.find((rule) => rule.minedPhrase === '苹果 香蕉');
    assert.ok(prefixRule);
    const prefixAnalyzer = createAnalyzer({ rules: { zh: { patterns: [prefixRule] } }, defaultProfile, calculateMetrics });
    for (const text of ['苹果香蕉皮。', '青苹果香蕉。']) {
      assert.ok(!prefixAnalyzer.analyzeText(text, { language: 'zh' }).violations.some((v) => v.ruleId === prefixRule.id), `partial word: ${text}`);
    }
    for (const text of ['苹果香蕉。', '🙂苹果，香蕉。']) {
      const match = prefixAnalyzer.analyzeText(text, { language: 'zh' }).violations.find((v) => v.ruleId === prefixRule.id);
      assert.ok(match, `whole words: ${text}`);
      assert.equal(text.slice(match.charOffset.start, match.charOffset.end), match.match);
    }
    const segmenter = Intl.Segmenter;
    try {
      Intl.Segmenter = undefined;
      assert.throws(() => prefixAnalyzer.analyzeText('苹果香蕉。', { language: 'zh' }), /Chinese mined rules require Intl\.Segmenter/);
    } finally { Intl.Segmenter = segmenter; }
  } finally { await rm(dir, { recursive: true, force: true }); }
});
