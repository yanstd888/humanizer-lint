const projectRoot = '..';
const scriptModule = (...segments) => new URL([projectRoot, 'scripts', ...segments].join('/'), import.meta.url);
const { createAnalyzer } = await import(scriptModule('core', 'analyzer-core.mjs'));
const { createMetrics, deterministicDeflateRaw } = await import(scriptModule('utils', 'metrics-core.mjs'));
const metrics = createMetrics({ encode: (text) => new TextEncoder().encode(text), deflateRaw: deterministicDeflateRaw });

export function createBrowserAnalyzer({ rules, defaultProfile }) {
  return createAnalyzer({
    rules,
    defaultProfile,
    calculateMetrics: () => {
      throw new Error('Browser analyzer requires analyzeTextAsync.');
    },
    calculateMetricsAsync: async (tokenized, normalizedText) => metrics.calculateMetrics(tokenized, normalizedText),
  });
}