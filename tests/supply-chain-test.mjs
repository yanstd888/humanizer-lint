import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (...parts) => readFile(path.join(root, ...parts), 'utf8');

test('workflow actions are pinned to full commit SHAs', async () => {
  const directory = path.join(root, '.github', 'workflows');
  for (const name of (await readdir(directory)).filter((entry) => /\.ya?ml$/i.test(entry))) {
    const source = await readFile(path.join(directory, name), 'utf8');
    for (const match of source.matchAll(/^\s*(?:-\s*)?uses:\s*([^\s#]+)/gm)) {
      if (!match[1].startsWith('./')) assert.match(match[1], /@[0-9a-f]{40}$/, `${name}: ${match[1]}`);
    }
  }
});

test('npm exclusion is configured for the evaluation corpus', async () => {
  const ignore = await read('benchmark', '.npmignore');
  assert.match(ignore, /^corpus\/$/m);
});

test('lockfile and plugin metadata match package metadata', async () => {
  const pkg = JSON.parse(await read('package.json'));
  const lock = JSON.parse(await read('package-lock.json'));
  assert.equal(lock.name, pkg.name);
  assert.equal(lock.version, pkg.version);
  assert.deepEqual(Object.keys(lock.packages), ['']);
  assert.equal(lock.packages[''].dependencies, undefined);
  assert.equal(lock.packages[''].devDependencies, undefined);
  for (const dir of ['.claude-plugin', '.cursor-plugin']) {
    const plugin = JSON.parse(await read(dir, 'plugin.json'));
    assert.equal(plugin.homepage, pkg.homepage);
    assert.equal(plugin.repository, 'https://github.com/yanstd888/humanizer-lint');
    assert.deepEqual(plugin.keywords, pkg.keywords);
  }
});
