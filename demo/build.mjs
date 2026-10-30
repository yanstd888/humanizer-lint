import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(root, 'demo');
const output = path.join(root, '.pages-dist');

const copy = async (from, to = from) => {
  const destination = path.join(output, to);
  await mkdir(path.dirname(destination), { recursive: true });
  await cp(path.join(root, from), destination, { recursive: true });
};

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await Promise.all([
  copy('demo/index.html', 'index.html'),
  copy('demo/app.mjs', 'app.mjs'),
  copy('demo/styles.css', 'styles.css'),

  copy('scripts/core', 'scripts/core'),
  copy('scripts/utils/sanitizer.mjs', 'scripts/utils/sanitizer.mjs'),
  copy('scripts/utils/tokenizer.mjs', 'scripts/utils/tokenizer.mjs'),
  copy('scripts/utils/metrics-core.mjs', 'scripts/utils/metrics-core.mjs'),
  copy('rules', 'rules'),
  copy('profiles', 'profiles'),
]);

const browserAdapter = await readFile(path.join(source, 'analyzer-browser.mjs'), 'utf8');
await writeFile(
  path.join(output, 'analyzer-browser.mjs'),
  browserAdapter.replaceAll("'../scripts/", "'./scripts/"),
  'utf8',
);

console.log(`Built ${output}`);
