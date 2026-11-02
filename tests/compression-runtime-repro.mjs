const { analyzeText } = await import(new URL(['..', 'index.mjs'].join('/'), import.meta.url));

let state = 5;
const words = Array.from({ length: 240 }, () => {
  state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
  return state % 100 < 14 ? 'common' : `word${state.toString(36).slice(0, 5)}`;
});
const text = Array.from({ length: 20 }, (_, i) => `${words.slice(i * 12, i * 12 + 12).join(' ')}.`).join(' ');
const report = analyzeText(text, { language: 'en' });
console.log(JSON.stringify({
  node: process.version,
  zlib: process.versions.zlib,
  compressionRatio: report.metrics.compressionRatio,
  score: report.score,
  lowEntropy: report.violations.some((violation) => violation.type === 'LOW_ENTROPY_REPETITION'),
}));
