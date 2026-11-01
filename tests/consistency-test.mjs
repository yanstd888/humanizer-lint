import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const read = (file) => readFile(path.join(root, file), 'utf8');

test('canonical product position, version and experimental scope stay synchronized', async () => {
  const [canonical, manifest, skill, readme, source, llms, full, built] = await Promise.all([
    read('meta/canonical.json').then(JSON.parse), read('package.json').then(JSON.parse),
    read('SKILL.md'), read('README.md'), read('demo/index.html'),
    read('demo/public/llms.txt'), read('demo/public/llms-full.md'), read('.pages-dist/index.html'),
  ]);
  for (const [name, text] of Object.entries({ skill, readme, source, llms, full, built })) {
    assert.ok(text.includes(canonical.canonicalEn), `${name}: canonical position`);
    assert.ok(text.includes('Experimental rhythm diagnostics (uncalibrated thresholds)'), `${name}: experimental scope`);
  }
  const version = manifest.version.replaceAll('.', '\\.');
  assert.match(skill, new RegExp(`^  version: ${version}$`, 'm'));
  for (const text of [source, llms, full]) assert.match(text, new RegExp(`\\b[vV]ersion ${version}\\b|\\bv${version}\\b`));
  const json = built.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1];
  const graph = JSON.parse(json)['@graph'];
  assert.equal(graph.find((node) => node['@type'] === 'SoftwareApplication').softwareVersion, manifest.version);
});
