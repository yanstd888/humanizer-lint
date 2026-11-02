import test from 'node:test';
import assert from 'node:assert/strict';
import { inflateRawSync } from 'node:zlib';
import { createHash } from 'node:crypto';
const { deterministicDeflateRaw } = await import(new URL(['..', 'scripts', 'utils', 'metrics-core.mjs'].join('/'), import.meta.url));
const { analyzeText } = await import(new URL(['..', 'index.mjs'].join('/'), import.meta.url));
const { DEMO_SAMPLES } = await import(new URL(['..', 'benchmark', 'fixtures.mjs'].join('/'), import.meta.url));

test('sample-derived repetition threshold retains the reference case and sample outcomes', () => {
  let state = 5;
  const words = Array.from({ length: 240 }, () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state % 100 < 14 ? 'common' : `word${state.toString(36).slice(0, 5)}`;
  });
  const text = Array.from({ length: 20 }, (_, i) => `${words.slice(i * 12, i * 12 + 12).join(' ')}.`).join(' ');
  assert.ok(analyzeText(text, { language: 'en' }).violations.some(v => v.type === 'LOW_ENTROPY_REPETITION'));
  for (const [id, sample] of Object.entries(DEMO_SAMPLES)) {
    const report = analyzeText(sample.text, { language: sample.language });
    assert.equal(report.status, id.startsWith('ai-') ? 'FAIL' : 'PASS', id);
    if (id.startsWith('human-')) assert.ok(!report.violations.some(v => v.type === 'LOW_ENTROPY_REPETITION'), id);
  }
});

test('deterministic DEFLATE round-trips mixed and repetitive bytes', () => {
  const encoder = new TextEncoder();
  const random = Uint8Array.from({ length: 40000 }, (_, i) => (Math.imul(i, 73) ^ (i >>> 4)) & 255);
  for (const input of [new Uint8Array(), encoder.encode('hello 🌏 世界'), encoder.encode('a'.repeat(12000)), random]) {
    const compressed = deterministicDeflateRaw(input);
    assert.deepEqual(new Uint8Array(inflateRawSync(compressed)), input);
    assert.deepEqual(compressed, deterministicDeflateRaw(input));
  }
  let state = 5;
  const mixed = Uint8Array.from({ length: 40000 }, (_, i) => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return i % 13 < 5 ? 65 : state >>> 24; });
  const compressed = deterministicDeflateRaw(mixed);
  assert.equal(createHash('sha256').update(compressed).digest('hex'), 'e5700ce6e90cb882ff14dab9ec3e66aa2f7d62b9ef684883565c932f082b6615');
  assert.deepEqual(new Uint8Array(inflateRawSync(compressed)), mixed);
});
