import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

const parentDirectory = '..';
const { runAnalyzeCli } = await import(new URL([parentDirectory, 'scripts', 'analyze.mjs'].join('/'), import.meta.url));

test('directory input recursively selects visible prose files in deterministic order', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'humanizer-dir-'));
  try {
    for (const dir of ['nested folder', '.hidden', 'node_modules', '.git', 'empty']) await mkdir(path.join(root, dir));
    for (const file of ['z.md', 'a.txt', '.visible-file.md', 'nested folder/b.mdx', 'ignore.png', '.hidden/secret.md', 'node_modules/skip.md', '.git/skip.md']) {
      await writeFile(path.join(root, file), 'A short note.');
    }
    let output = '', error = '';
    const io = { stdout: (s) => { output += s; }, stderr: (s) => { error += s; } };
    assert.equal(await runAnalyzeCli([root, '--json'], io), 0, error);
    assert.deepEqual(JSON.parse(output).map((row) => path.relative(root, row.file)), ['.visible-file.md', 'a.txt', path.join('nested folder', 'b.mdx'), 'z.md']);
    output = ''; error = '';
    assert.equal(await runAnalyzeCli([path.join(root, 'empty')], io), 2);
    assert.match(error, /no.*(?:file|match)/i);
  } finally { await rm(root, { recursive: true, force: true }); }
});
