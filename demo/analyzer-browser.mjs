import { createAnalyzer } from '../scripts/core/analyzer-core.mjs';
import { calculateMetricsFromCompressionRatio } from '../scripts/utils/metrics-core.mjs';

async function compressionRatio(text) {
  const bytes = new TextEncoder().encode(String(text ?? '').trim());
  if (!bytes.length) return 0;
  if (typeof CompressionStream !== 'function') throw new Error('This browser does not support CompressionStream.');
  const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream('deflate-raw'));
  const compressed = await new Response(stream).arrayBuffer();
  return compressed.byteLength / bytes.length;
}

export function createBrowserAnalyzer({ rules, defaultProfile }) {
  return createAnalyzer({
    rules,
    defaultProfile,
    calculateMetrics: () => {
      throw new Error('Browser analyzer requires analyzeTextAsync.');
    },
    calculateMetricsAsync: async (tokenized, normalizedText) => calculateMetricsFromCompressionRatio(
      tokenized,
      await compressionRatio(normalizedText),
    ),
  });
}