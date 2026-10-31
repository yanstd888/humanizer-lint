import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { I18N } from './i18n.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(root, 'demo');
const output = path.join(root, '.pages-dist');
const siteUrl = 'https://humanizer.aiclub.ai.id/';

const copy = async (from, to = from) => {
  const destination = path.join(output, to);
  await mkdir(path.dirname(destination), { recursive: true });
  await cp(path.join(root, from), destination, { recursive: true });
};

function jsonLd(version) {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'SoftwareApplication',
        name: 'humanizer-lint',
        url: siteUrl,
        applicationCategory: 'DeveloperApplication',
        operatingSystem: 'Cross-platform (Node.js >= 18.3, Web Browser)',
        softwareVersion: version,
        author: {
          '@type': 'Person',
          name: 'Muhammad Dian (yanstd888)',
          url: 'https://github.com/yanstd888',
        },
        codeRepository: 'https://github.com/yanstd888/humanizer-lint',
        installUrl: 'https://www.skills.sh/yanstd888/humanizer-lint/humanizer-lint',
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      },
      {
        '@type': 'FAQPage',
        mainEntity: [
          {
            '@type': 'Question',
            name: 'Why is prompt-only rewriting not enough?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'A prompt can request natural prose, but it does not measure the finished draft. humanizer-lint checks the exact output for configured lexical, rhythm, vocabulary, structural, and morphology signals before publication.',
            },
          },
          {
            '@type': 'Question',
            name: 'How do burstiness and adjacent rhythm delta work?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Burstiness is the coefficient of variation across sentence lengths. Adjacent rhythm delta is the mean word-count difference between neighboring sentences. The analyzer reports both values and its configured thresholds.',
            },
          },
          {
            '@type': 'Question',
            name: 'How do I install humanizer-lint as an agent skill?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Run npx skills add yanstd888/humanizer-lint, then use the local deterministic CLI during drafting and review.',
            },
          },
        ],
      },
    ],
  }).replaceAll('<', '\\u003c');
}

function renderTemplate(template, values) {
  return template.replace(/\{\{([A-Za-z0-9]+)\}\}/g, (match, key) => {
    if (typeof values[key] !== 'string') throw new Error(`Missing template value: ${key}`);
    return values[key];
  });
}

function renderIndex(template, version) {
  return renderTemplate(template, { ...I18N.en, jsonLd: jsonLd(version) });
}

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await Promise.all([
  copy('demo/app.mjs', 'app.mjs'),
  copy('demo/i18n.mjs', 'i18n.mjs'),
  copy('demo/samples.mjs', 'samples.mjs'),
  copy('demo/styles.css', 'styles.css'),
  copy('demo/public/favicon.svg', 'favicon.svg'),
  copy('demo/public/og-image.svg', 'og-image.svg'),
  copy('demo/public/robots.txt', 'robots.txt'),
  copy('demo/public/sitemap.xml', 'sitemap.xml'),
  copy('demo/public/llms.txt', 'llms.txt'),
  copy('scripts/core', 'scripts/core'),
  copy('scripts/utils/sanitizer.mjs', 'scripts/utils/sanitizer.mjs'),
  copy('scripts/utils/tokenizer.mjs', 'scripts/utils/tokenizer.mjs'),
  copy('scripts/utils/metrics-core.mjs', 'scripts/utils/metrics-core.mjs'),
  copy('rules', 'rules'),
  copy('profiles', 'profiles'),
]);

const ruleCodes = ['id', 'en', 'es', 'ms', 'fr', 'de', 'pt', 'zh'];
const [indexTemplate, fullReferenceTemplate, profile, packageJson, ruleEntries] = await Promise.all([
  readFile(path.join(source, 'index.html'), 'utf8'),
  readFile(path.join(source, 'public', 'llms-full.md'), 'utf8'),
  readFile(path.join(root, 'profiles', 'default-human.json'), 'utf8'),
  readFile(path.join(root, 'package.json'), 'utf8').then(JSON.parse),
  Promise.all(ruleCodes.map(async (code) => [code, JSON.parse(await readFile(path.join(root, 'rules', `${code}-slop.json`), 'utf8'))])),
]);
const ruleCatalog = Object.fromEntries(ruleEntries);
await Promise.all([
  writeFile(path.join(output, 'index.html'), renderIndex(indexTemplate, packageJson.version), 'utf8'),
  writeFile(path.join(output, 'llms-full.txt'), renderTemplate(fullReferenceTemplate, {
    ruleCatalog: JSON.stringify(ruleCatalog, null, 2),
    defaultProfile: JSON.stringify(JSON.parse(profile), null, 2),
  }), 'utf8'),
]);

for (const name of ['analyzer-browser.mjs', 'presentation.mjs']) {
  const browserModule = await readFile(path.join(source, name), 'utf8');
  await writeFile(path.join(output, name), browserModule.replaceAll("'../scripts/", "'./scripts/"), 'utf8');
}

console.log(`Built ${output}`);
