import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const read = (file) => readFile(path.join(root, file), 'utf8');

test('canonical product position, version and experimental scope stay synchronized', async () => {
  const [canonical, manifest, skill, readme, source, llms, full, built, skillsConfig, indonesianPage] = await Promise.all([
    read('meta/canonical.json').then(JSON.parse), read('package.json').then(JSON.parse),
    read('SKILL.md'), read('README.md'), read('demo/index.html'),
    read('demo/public/llms.txt'), read('demo/public/llms-full.md'), read('.pages-dist/index.html'),
    read('skills.sh.json').then(JSON.parse), read('.pages-dist/id/index.html'),
  ]);
  assert.ok(skillsConfig.groupings.some((group) => group.description === canonical.canonicalEn), 'skills.sh description');
  for (const [name, text] of Object.entries({ skill, readme, llms, full, indonesianPage, builtLlms: await read('.pages-dist/llms.txt'), builtFull: await read('.pages-dist/llms-full.txt') })) assert.ok(text.includes(canonical.canonicalId), `${name}: Indonesian canonical position`);
  assert.equal(canonical.canonicalEn, 'A local, zero-dependency prose linter that flags stiff, AI-sounding writing (stock phrases, flat sentence rhythm, repeated wording) and tells you what to revise. A style checker, not an AI detector.');
  const description = skill.match(/^description: >-\n((?:  .*\n)+)/m)?.[1].trim().replace(/\s*\n\s*/g, ' ');
  assert.ok(description?.includes(canonical.canonicalEn), 'skill frontmatter canonical position');
  assert.ok(description.length <= 1024, 'skill description length');
  assert.equal(manifest.description, canonical.canonicalEn);
  assert.ok(readme.slice(0, readme.indexOf('[![skills.sh]')).includes(canonical.canonicalEn), 'README lead must include canonical position');
  for (const [name, text] of Object.entries({ skill, readme, source, llms, full, built })) {
    assert.ok(text.includes(canonical.canonicalEn), `${name}: canonical position`);
    assert.ok(text.includes('Experimental rhythm diagnostics (uncalibrated thresholds)'), `${name}: experimental scope`);
  }
  for (const [name, text] of Object.entries({ skill, readme, source, llms, full, built, i18n: await read('demo/i18n.mjs'), faq: await read('demo/seo-copy.mjs'), build: await read('demo/build.mjs') })) {
    assert.doesNotMatch(text, /(?:100\+|(?:más de|mais de|plus de|über|lebih)\s+100|100\s*多种)/iu, `${name}: unsupported language-count claim`);
  }
  const workflow = readme.match(/For a closed-loop agent workflow,[^\n]+/)?.[0];
  assert.ok(workflow?.includes('node <skill_dir>/scripts/analyze.mjs --stdin --json'));
  assert.doesNotMatch(workflow, /\bnpx\b|It works with Claude Code/);
  assert.ok(workflow.includes('should be verified in the target agent'));
  assert.doesNotMatch(readme, /lexical finding even though its score is 100/);
  assert.ok(readme.includes('Chinese rules use `Intl.Segmenter` word boundaries'));
  for (const phrase of ['stylometric analyzer', 'sentence burstiness checker', 'markdown prose linter', 'hilangkan kata klise AI', '提升文章可读性']) {
    assert.ok(readme.toLocaleLowerCase('und').includes(phrase.toLocaleLowerCase('und')), `README missing SEO intent: ${phrase}`);
  }
  const coverage = [readme, source, await read('demo/i18n.mjs'), llms, full].join('\n').toLocaleLowerCase('und');
  for (const phrase of ['ai humanizer', 'ai text humanizer', 'prose linter', 'ai writing style editor', 'anti-slop linter', 'stylometric analyzer', 'sentence burstiness checker', 'markdown prose linter', 'humanizer-lint', 'humanizer bahasa indonesia', 'perbaiki tulisan AI yang kaku', 'hilangkan kata klise AI', 'humanizer teks bahasa melayu', 'humanizador de texto IA', 'humaniseur de texte IA', 'corriger le style robotique', 'KI-Floskeln entfernen', 'remover clichês de IA', 'AI文章润色与人性化', '消除AI写作腔', '提升文章可读性', 'skills.sh humanizer', 'sentence length variation', 'coefficient of variation (CV)', 'adjacent sentence rhythm delta', 'moving-average type-token ratio (MATTR)', 'remove LLM clichés and stock phrases', 'fix robotic AI writing tone', 'author voice fingerprinting', 'copywriting and CTA linter', 'AI code comment linter', 'claude code writing skill', 'cursor prose skill', 'codex writing skill', 'windsurf skill', 'gemini cli skill', 'ubah tulisan AI jadi natural', 'editor gaya bahasa dan ritme kalimat', 'audit artikel SEO dan dokumentasi teknis', 'semak ritma ayat dan frasa klise', 'perbaiki gaya penulisan AI yang kaku', 'editor de estilo y corrector de ritmo', 'quitar clichés de escritura IA', 'éditeur de prose et analyseur stylométrique', 'KI-Text humanisieren', 'Satzrhythmus und Stil prüfen', 'editor de estilo e corretor de ritmo textual', '句式节奏与词汇多样性分析']) {
    assert.ok(coverage.includes(phrase.toLocaleLowerCase('und')), `missing SEO intent: ${phrase}`);
  }
  const version = manifest.version.replaceAll('.', '\\.');
  assert.match(skill, new RegExp(`^  version: ${version}$`, 'm'));
  for (const text of [source, llms, full]) assert.match(text, new RegExp(`\\b[vV]ersion ${version}\\b|\\bv${version}\\b`));
  const json = built.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1];
  const graph = JSON.parse(json)['@graph'];
  assert.equal(graph.find((node) => [node['@type']].flat().includes('SoftwareApplication')).softwareVersion, manifest.version);
});
