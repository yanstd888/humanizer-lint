import {
  adjacentDelta,
  coefficientOfVariation,
  createMetrics,
  deterministicDeflateRaw,
  mattr,
  mean,
  punctuationRates,
  standardDeviation,
} from './metrics-core.mjs';

const metrics = createMetrics({
  encode: (text) => Buffer.from(text, 'utf8'),
  deflateRaw: deterministicDeflateRaw,
});

export {
  adjacentDelta,
  coefficientOfVariation,
  mattr,
  mean,
  punctuationRates,
  standardDeviation,
};

export const compressionRatio = metrics.compressionRatio;
export const calculateMetrics = metrics.calculateMetrics;
