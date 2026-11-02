export { analyzeText } from './scripts/analyze.mjs';
export { MIN_SENTENCES_FOR_RHYTHM } from './scripts/utils/metrics-core.mjs';
import { fingerprintSamples } from './scripts/fingerprint.mjs';

export function createFingerprinter(options = {}) {
  return (files) => fingerprintSamples(files, options);
}
