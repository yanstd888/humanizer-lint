export const MIN_SENTENCES_FOR_RHYTHM = 8;

// Fixed DEFLATE blocks and bounded LZ77 matching: deterministic across runtimes.
export function deterministicDeflateRaw(bytes) {
  const lengthBase = [3,4,5,6,7,8,9,10,11,13,15,17,19,23,27,31,35,43,51,59,67,83,99,115,131,163,195,227,258];
  const lengthExtra = [0,0,0,0,0,0,0,0,1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,0];
  const distanceBase = [1,2,3,4,5,7,9,13,17,25,33,49,65,97,129,193,257,385,513,769,1025,1537,2049,3073,4097,6145,8193,12289,16385,24577];
  const distanceExtra = [0,0,0,0,1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11,12,12,13,13];
  const output = []; let buffer = 0; let pending = 0;
  const bits = (value, count) => {
    buffer |= value << pending; pending += count;
    while (pending >= 8) { output.push(buffer & 255); buffer >>>= 8; pending -= 8; }
  };
  const reverse = (value, count) => { let result = 0; for (let i = 0; i < count; i += 1) { result = (result << 1) | (value & 1); value >>>= 1; } return result; };
  const symbol = (value) => {
    const size = value < 144 ? 8 : value < 256 ? 9 : value < 280 ? 7 : 8;
    const code = value < 144 ? value + 48 : value < 256 ? value - 144 + 400 : value < 280 ? value - 256 : value - 280 + 192;
    bits(reverse(code, size), size);
  };
  const head = new Int32Array(65536).fill(-1); const previous = new Int32Array(bytes.length).fill(-1);
  const hash = (i) => (bytes[i] * 251 + bytes[i + 1] * 31 + bytes[i + 2]) & 65535;
  const insert = (i) => { if (i + 2 >= bytes.length) return; const key = hash(i); previous[i] = head[key]; head[key] = i; };
  bits(3, 3); // Final block, fixed Huffman codes.
  for (let i = 0; i < bytes.length;) {
    let best = 0; let distance = 0;
    if (i + 2 < bytes.length) {
      let candidate = head[hash(i)]; let scanned = 0;
      // ponytail: 64 candidates bounds worst-case cost; raise only with measured need.
      while (candidate >= 0 && i - candidate <= 32768 && scanned++ < 64) {
        let length = 0; const limit = Math.min(258, bytes.length - i);
        while (length < limit && bytes[candidate + length] === bytes[i + length]) length += 1;
        if (length >= 3 && length > best) { best = length; distance = i - candidate; if (best === limit) break; }
        candidate = previous[candidate];
      }
    }
    if (best < 3) { symbol(bytes[i]); insert(i); i += 1; continue; }
    let li = lengthBase.length - 1; while (lengthBase[li] > best) li -= 1;
    symbol(257 + li); bits(best - lengthBase[li], lengthExtra[li]);
    let di = distanceBase.length - 1; while (distanceBase[di] > distance) di -= 1;
    bits(reverse(di, 5), 5); bits(distance - distanceBase[di], distanceExtra[di]);
    for (let j = 0; j < best; j += 1) insert(i + j);
    i += best;
  }
  symbol(256); if (pending) output.push(buffer & 255);
  return Uint8Array.from(output);
}

export function mean(values) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

export function standardDeviation(values) {
  if (!values.length) return 0;
  const average = mean(values);
  return Math.sqrt(mean(values.map((value) => (value - average) ** 2)));
}

export function coefficientOfVariation(values) {
  const average = mean(values);
  return average ? standardDeviation(values) / average : 0;
}

export function adjacentDelta(values) {
  if (values.length < 2) return 0;
  let total = 0;
  for (let index = 1; index < values.length; index += 1) total += Math.abs(values[index] - values[index - 1]);
  return total / (values.length - 1);
}

export function mattr(words, requestedWindow) {
  if (!words.length) return 0;
  const window = Math.min(words.length, requestedWindow ?? Math.min(50, Math.max(10, Math.floor(words.length / 2))));
  if (words.length <= window) return new Set(words).size / words.length;
  let total = 0;
  let windows = 0;
  for (let index = 0; index <= words.length - window; index += 1) {
    total += new Set(words.slice(index, index + window)).size / window;
    windows += 1;
  }
  return total / windows;
}

export function punctuationRates(text, wordCount) {
  const denominator = wordCount || 1;
  const count = (pattern) => (String(text ?? '').match(pattern) ?? []).length / denominator;
  return {
    comma: count(/,/g),
    semicolon: count(/;/g),
    colon: count(/:/g),
    question: count(/\?/g),
    exclamation: count(/!/g),
    parentheses: count(/[()]/g) / 2,
    dash: count(/—|\s--\s/g),
  };
}

export function calculateMetricsFromCompressionRatio(tokenized, compressionRatio) {
  const lengths = tokenized.sentences.map((sentence) => sentence.wordCount);
  const paragraphCVs = tokenized.paragraphs
    .filter((paragraph) => paragraph.sentences.length >= 4)
    .map((paragraph) => coefficientOfVariation(paragraph.sentences.map((sentence) => sentence.wordCount)));
  const wordCount = tokenized.words.length;
  const sentenceCount = lengths.length;
  return {
    wordCount,
    sentenceCount,
    meanSentenceLength: mean(lengths),
    stdDev: standardDeviation(lengths),
    burstinessCV: coefficientOfVariation(lengths),
    paragraphBurstinessCV: paragraphCVs.length ? mean(paragraphCVs) : 0,
    adjacentDelta: adjacentDelta(lengths),
    shortSentenceRatio: sentenceCount ? lengths.filter((length) => length <= 6).length / sentenceCount : 0,
    longSentenceRatio: sentenceCount ? lengths.filter((length) => length >= 26).length / sentenceCount : 0,
    mattr: mattr(tokenized.words),
    compressionRatio,
  };
}

export function createMetrics({ encode, deflateRaw }) {
  if (typeof encode !== 'function' || typeof deflateRaw !== 'function') {
    throw new TypeError('createMetrics requires encode and deflateRaw functions');
  }

  const compressionRatio = (text) => {
    const bytes = encode(String(text ?? '').trim());
    return bytes.length ? deflateRaw(bytes).length / bytes.length : 0;
  };

  const calculateMetrics = (tokenized, normalizedText) => calculateMetricsFromCompressionRatio(
    tokenized,
    compressionRatio(normalizedText),
  );

  return { compressionRatio, calculateMetrics };
}
