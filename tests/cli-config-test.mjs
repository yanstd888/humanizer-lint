import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

const parentDirectory = '..';
const projectRoot = path.resolve(decodeURIComponent(new URL(parentDirectory, import.meta.url).pathname).replace(/^\/(?=[A-Za-z]:)/, ''));
const { runAnalyzeCli } = await import(new URL([parentDirectory, 'scripts', 'analyze.mjs'].join('/'), import.meta.url));

test('explicit CLI domain overrides config noDomainLint', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'humanizer-domain-'));
  try {
    await writeFile(path.join(root, '.humanizerrc.json'), JSON.stringify({ noDomainLint: true }));
    let output = '';
    const io = { cwd: root, stdin: async () => '<img src="pic.jpg"> Clear prose.', stdout: (s) => { output += s; }, stderr: () => {} };
    await runAnalyzeCli(['--stdin', '--domain', 'ui', '--json'], io);
    assert.ok(JSON.parse(output).violations.some((v) => v.type === 'MISSING_IMG_ALT'));
    output = '';
    await runAnalyzeCli(['--stdin', '--domain', 'ui', '--no-domain-lint', '--json'], io);
    assert.ok(!JSON.parse(output).violations.some((v) => v.type === 'MISSING_IMG_ALT'));
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('config discovery walks ancestor chain and CLI flags override config', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'humanizer-cfg-'));
  try {
    const sub = path.join(root, 'sub', 'deep');
    await mkdir(sub, { recursive: true });

    await writeFile(path.join(root, '.humanizerrc.json'), JSON.stringify({
      lang: 'id',
      minScore: 90,
    }));

    const legalText = await readFile(path.join(projectRoot, 'tests', 'corpus', 'id-formal-legal.txt'), 'utf8');
    const sample = path.join(sub, 'sample.txt');
    await writeFile(sample, legalText);

    let output = '';
    let error = '';
    const io = { cwd: sub, stdout: (s) => { output += s; }, stderr: (s) => { error += s; } };

    const code = await runAnalyzeCli([sample, '--json'], io);
    assert.equal(code, 1, error);
    const parsed = JSON.parse(output);
    assert.equal(parsed.language, 'id');
    assert.equal(parsed.score, 88);

    output = ''; error = '';
    const cliOverrideCode = await runAnalyzeCli([sample, '--json', '--min-score', '85'], io);
    assert.equal(cliOverrideCode, 0, error);

    output = ''; error = '';
    await runAnalyzeCli([sample, '--json', '--lang', 'en', '--min-score', '50'], io);
    assert.equal(JSON.parse(output).language, 'en');

    output = ''; error = '';
    const noConfigCode = await runAnalyzeCli([sample, '--json', '--no-config'], io);
    assert.equal(noConfigCode, 0, error);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('config discovery uses nearest ancestor when multiple exist', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'humanizer-cfg-nested-'));
  try {
    const parent = path.join(root, 'pkg');
    const child = path.join(parent, 'src');
    await mkdir(child, { recursive: true });

    await writeFile(path.join(root, '.humanizerrc.json'), JSON.stringify({ minScore: 90 }));
    await writeFile(path.join(parent, '.humanizerrc.json'), JSON.stringify({ minScore: 80 }));

    const legalText = await readFile(path.join(projectRoot, 'tests', 'corpus', 'id-formal-legal.txt'), 'utf8');
    const sample = path.join(child, 'doc.txt');
    await writeFile(sample, legalText);

    let output = '';
    let error = '';
    const io = { cwd: child, stdout: (s) => { output += s; }, stderr: (s) => { error += s; } };

    assert.equal(await runAnalyzeCli([sample, '--json'], io), 0, error);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('profile in config resolves relative to config file location', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'humanizer-cfg-profile-'));
  try {
    const configsDir = path.join(root, 'config');
    const workingDir = path.join(root, 'app', 'nested');
    await mkdir(configsDir, { recursive: true });
    await mkdir(workingDir, { recursive: true });

    const profileFile = path.join(configsDir, 'custom-profile.json');
    await writeFile(profileFile, JSON.stringify({
      version: 1,
      language: 'en',
      allowlist: ['game changer'],
    }));

    const configFile = path.join(configsDir, '.humanizerrc.json');
    await writeFile(configFile, JSON.stringify({
      profile: './custom-profile.json',
    }));

    const sample = path.join(workingDir, 'sample.txt');
    await writeFile(sample, 'This is a game changer.');

    let output = '';
    let error = '';
    const io = { cwd: workingDir, stdout: (s) => { output += s; }, stderr: (s) => { error += s; } };

    assert.equal(await runAnalyzeCli([sample, '--config', configFile, '--json'], io), 0, error);
    const parsed = JSON.parse(output);
    assert.ok(parsed.allowlistApplied.includes('game changer'));

    const emptyProfileFile = path.join(workingDir, 'empty-profile.json');
    await writeFile(emptyProfileFile, JSON.stringify({ version: 1, language: 'en', allowlist: [] }));
    output = ''; error = '';
    const overrideCode = await runAnalyzeCli([sample, '--config', configFile, '--profile', emptyProfileFile, '--json'], io);
    assert.equal(overrideCode, 1);
    assert.deepEqual(JSON.parse(output).allowlistApplied, []);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('allow and noDomainLint in config are applied and overridden by CLI', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'humanizer-cfg-allow-'));
  try {
    const configFile = path.join(root, '.humanizerrc.json');
    await writeFile(configFile, JSON.stringify({
      allow: ['game changer'],
      noDomainLint: true,
      domain: 'ui',
    }));

    const sample = path.join(root, 'sample.html');
    await writeFile(sample, '<img src="pic.jpg"> This is a game changer.');

    let output = '';
    let error = '';
    const io = { cwd: root, stdout: (s) => { output += s; }, stderr: (s) => { error += s; } };

    assert.equal(await runAnalyzeCli([sample, '--json'], io), 0, error);
    assert.ok(JSON.parse(output).allowlistApplied.includes('game changer'));

    output = ''; error = '';
    const cliOverrideCode = await runAnalyzeCli([sample, '--json', '--allow', 'different phrase'], io);
    assert.equal(cliOverrideCode, 1);
    assert.deepEqual(JSON.parse(output).allowlistApplied, []);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('invalid config, unknown keys and flag conflicts exit 2', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'humanizer-cfg-err-'));
  try {
    const sample = path.join(root, 'sample.txt');
    await writeFile(sample, 'Short text.');
    let error = '';
    const io = { cwd: root, stdout: () => {}, stderr: (s) => { error += s; } };

    error = '';
    assert.equal(await runAnalyzeCli([sample, '--config', 'x.json', '--no-config'], io), 2);
    assert.match(error, /Cannot combine --config and --no-config/);

    error = '';
    assert.equal(await runAnalyzeCli([sample, '--config', '   '], io), 2);
    assert.match(error, /--config requires a nonempty path/);

    error = '';
    assert.equal(await runAnalyzeCli([sample, '--config', path.join(root, 'nonexistent.json')], io), 2);
    assert.match(error, /Failed to read configuration file/);

    const malformed = path.join(root, 'bad.json');
    await writeFile(malformed, '{ "lang": "en" ');
    error = '';
    assert.equal(await runAnalyzeCli([sample, '--config', malformed], io), 2);
    assert.match(error, /Invalid JSON in configuration file/);

    const arrayConfig = path.join(root, 'array.json');
    await writeFile(arrayConfig, '["lang", "en"]');
    error = '';
    assert.equal(await runAnalyzeCli([sample, '--config', arrayConfig], io), 2);
    assert.match(error, /must be a JSON object/);

    const unknownKey = path.join(root, 'unknown.json');
    await writeFile(unknownKey, JSON.stringify({ lang: 'en', invalidKey: 123 }));
    error = '';
    assert.equal(await runAnalyzeCli([sample, '--config', unknownKey], io), 2);
    assert.match(error, /Unknown configuration key "invalidKey"/);

    for (const [key, val, expectedErr] of [
      ['lang', 123, /Invalid "lang"/],
      ['lang', 'bad-lang', /Invalid "lang"/],
      ['domain', 'unknown', /Invalid "domain"/],
      ['profile', 42, /Invalid "profile"/],
      ['profile', '  ', /Invalid "profile"/],
      ['allow', 'string-not-array', /Invalid "allow"/],
      ['allow', [123], /Invalid "allow"/],
      ['minScore', -1, /Invalid "minScore"/],
      ['minScore', 101, /Invalid "minScore"/],
      ['minScore', '80', /Invalid "minScore"/],
      ['noDomainLint', 'yes', /Invalid "noDomainLint"/],
    ]) {
      const cfgPath = path.join(root, `test-${key}.json`);
      await writeFile(cfgPath, JSON.stringify({ [key]: val }));
      error = '';
      assert.equal(await runAnalyzeCli([sample, '--config', cfgPath], io), 2);
      assert.match(error, expectedErr);
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('handles paths with spaces and CRLF line endings', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'humanizer cfg spaces '));
  try {
    const nested = path.join(root, 'deep space');
    await mkdir(nested, { recursive: true });

    await writeFile(path.join(root, '.humanizerrc.json'), '{\r\n  "lang": "en",\r\n  "minScore": 50\r\n}\r\n');
    const sample = path.join(nested, 'crlf sample.txt');
    await writeFile(sample, 'First line.\r\nSecond line.\r\nThird line.\r\n');

    let output = '';
    let error = '';
    const io = { cwd: nested, stdout: (s) => { output += s; }, stderr: (s) => { error += s; } };

    assert.equal(await runAnalyzeCli([sample, '--json'], io), 0, error);
    assert.equal(JSON.parse(output).language, 'en');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
