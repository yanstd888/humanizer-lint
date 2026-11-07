const parentDirectory = '..';
const utilityModule = (...segments) => new URL([parentDirectory, 'utils', ...segments].join('/'), import.meta.url);
const { coefficientOfVariation, MIN_SENTENCES_FOR_RHYTHM } = await import(utilityModule('metrics-core.mjs'));

function round(value, places = 4) {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}

export function monotonyViolations(tokenized) {
  const violations = [];
  for (const paragraph of tokenized.paragraphs) {
    for (let index = 0; index <= paragraph.sentences.length - 3; index += 1) {
      const window = paragraph.sentences.slice(index, index + 3);
      const lengths = window.map((sentence) => sentence.wordCount);
      if (Math.abs(lengths[1] - lengths[0]) <= 3 && Math.abs(lengths[2] - lengths[1]) <= 3) {
        violations.push({
          type: 'MONOTONOUS_RHYTHM',
          location: `Paragraph ${paragraph.paragraphIndex}, Sentences ${window[0].sentenceIndex}-${window[2].sentenceIndex}`,
          lengths,
          fixInstruction: `Sentence lengths are uniform (${lengths.join(', ')} words). Split one sentence into a short statement or merge two into a longer clause.`,
        });
      }
    }
  }
  return violations;
}

export function paragraphRhythmViolations(tokenized) {
  const violations = [];
  for (const paragraph of tokenized.paragraphs) {
    if (paragraph.sentences.length < 4) continue;
    const lengths = paragraph.sentences.map((sentence) => sentence.wordCount);
    const paragraphCV = coefficientOfVariation(lengths);
    const range = Math.max(...lengths) - Math.min(...lengths);
    if (paragraphCV < 0.25 && range < 7) {
      violations.push({
        type: 'FLAT_PARAGRAPH_RHYTHM',
        location: `Paragraph ${paragraph.paragraphIndex}`,
        actual: round(paragraphCV),
        range,
        fixInstruction: 'Review the paragraph for uniform cadence; vary structure only where the meaning supports it.',
      });
    }

    for (let index = 0; index <= paragraph.sentences.length - 4; index += 1) {
      const window = paragraph.sentences.slice(index, index + 4);
      const windowLengths = window.map((sentence) => sentence.wordCount);
      const punctuationCounts = window.map((sentence) => (sentence.text.match(/[,;—，]/gu) ?? []).length);
      if (punctuationCounts.every((count) => count === 1 || count === 2) && Math.max(...windowLengths) - Math.min(...windowLengths) <= 5) {
        violations.push({
          type: 'UNIFORM_CLAUSE_STRUCTURE',
          location: `Paragraph ${paragraph.paragraphIndex}, Sentences ${window[0].sentenceIndex}-${window[3].sentenceIndex}`,
          lengths: windowLengths,
          fixInstruction: 'Change one clause pattern or punctuation shape where the ideas have a different relationship.',
        });
      }
    }
  }
  return violations;
}

export function repetitiveNgramViolations(tokenized, stopwords = []) {
  if (tokenized.words.length < 120) return [];
  const ignored = new Set(stopwords);
  const content = tokenized.words
    .map((word, index) => ({ word, index }))
    .filter(({ word }) => !ignored.has(word) && word !== 'token_entity');
  const violations = [];
  const seen = new Set();
  for (const size of [4, 3]) {
    const occurrences = new Map();
    for (let index = 0; index <= content.length - size; index += 1) {
      const phrase = content.slice(index, index + size).map(({ word }) => word).join(' ');
      const positions = occurrences.get(phrase) ?? [];
      positions.push(content[index].index);
      occurrences.set(phrase, positions);
    }
    for (const [phrase, positions] of occurrences) {
      if (seen.has(phrase)) continue;
      const repeated = positions.some((start, index) => positions[index + 2] != null && positions[index + 2] - start <= 400);
      if (!repeated) continue;
      seen.add(phrase);
      violations.push({
        type: 'REPETITIVE_NGRAM',
        location: 'Whole text',
        match: phrase,
        occurrences: positions.length,
        fixInstruction: 'Remove repeated wording or replace it with a precise reference that preserves the meaning.',
      });
      if (violations.length >= 5) return violations;
    }
  }
  return violations;
}

export function structuralViolations(tokenized, metrics) {
  const violations = [];
  if (metrics.wordCount >= 150 && metrics.compressionRatio < 0.64) {
    violations.push({
      type: 'LOW_ENTROPY_REPETITION',
      location: 'Whole text',
      fixInstruction: 'Remove repeated templates and vary concrete sentence structures.',
    });
  }

  for (let index = 0; index <= tokenized.paragraphs.length - 3; index += 1) {
    const window = tokenized.paragraphs.slice(index, index + 3);
    const counts = window.map((paragraph) => paragraph.sentences.length);
    if (counts[0] > 0 && counts.every((count) => count === counts[0])) {
      violations.push({
        type: 'SYMMETRIC_PARAGRAPHS',
        location: `Paragraphs ${window[0].paragraphIndex}-${window[2].paragraphIndex}`,
        counts,
        fixInstruction: 'Merge or split a paragraph where the content supports a different rhythm.',
      });
    }
  }

  for (const paragraph of tokenized.paragraphs) {
    const starters = new Map();
    for (const sentence of paragraph.sentences) {
      const starter = sentence.words[0];
      if (!starter) continue;
      const group = starters.get(starter) ?? [];
      group.push(sentence.sentenceIndex);
      starters.set(starter, group);
    }
    for (const [starter, indexes] of starters) {
      if (indexes.length >= 3) {
        violations.push({
          type: 'REPETITIVE_STARTERS',
          location: `Paragraph ${paragraph.paragraphIndex}, Sentences ${indexes.join(', ')}`,
          match: starter,
          fixInstruction: 'Change one sentence opening or combine sentences where the subject repeats.',
        });
      }
    }
  }
  return violations;
}

export function statisticalViolations(metrics, thresholds, mattrTarget) {
  const violations = [];
  const cvTarget = metrics.sentenceCount >= MIN_SENTENCES_FOR_RHYTHM ? thresholds.burstinessCVLong : thresholds.burstinessCVShort;
  if (metrics.sentenceCount >= MIN_SENTENCES_FOR_RHYTHM && metrics.burstinessCV < cvTarget) {
    violations.push({
      type: 'LOW_BURSTINESS',
      location: 'Whole text',
      actual: round(metrics.burstinessCV),
      target: cvTarget,
      fixInstruction: 'Vary sentence lengths by splitting one uniform sentence and merging another where the meaning supports it.',
    });
  }
  if (metrics.sentenceCount >= MIN_SENTENCES_FOR_RHYTHM && (metrics.shortSentenceRatio < thresholds.shortSentenceRatio || metrics.longSentenceRatio < thresholds.longSentenceRatio)) {
    violations.push({
      type: 'MISSING_SENTENCE_RANGE',
      location: 'Whole text',
      shortSentenceRatio: round(metrics.shortSentenceRatio),
      longSentenceRatio: round(metrics.longSentenceRatio),
      fixInstruction: 'Review sentence variety only where it improves clarity; preserve the intended meaning and register.',
    });
  }
  if (metrics.sentenceCount >= MIN_SENTENCES_FOR_RHYTHM && metrics.adjacentDelta < thresholds.adjacentDelta) {
    violations.push({
      type: 'LOW_ADJACENT_DELTA',
      location: 'Whole text',
      actual: round(metrics.adjacentDelta),
      target: thresholds.adjacentDelta,
      fixInstruction: 'Change neighboring sentence lengths by splitting or merging only where the content allows it.',
    });
  }
  if (metrics.mattr < mattrTarget) {
    violations.push({
      type: 'LOW_LEXICAL_DIVERSITY',
      location: 'Whole text',
      actual: round(metrics.mattr),
      target: mattrTarget,
      fixInstruction: 'Replace repeated generic wording with precise terms already supported by the source.',
    });
  }
  return violations;
}
