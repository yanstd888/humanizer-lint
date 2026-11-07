const parentDirectory = '..';
const utilityModule = (...segments) => new URL([parentDirectory, 'utils', ...segments].join('/'), import.meta.url);
const { mean, punctuationRates, MIN_SENTENCES_FOR_RHYTHM } = await import(utilityModule('metrics-core.mjs'));

const STRONG_STAGING = new Set(['NOT_X_BUT_Y', 'STAGED_RUN_UP', 'DEEP_SOUNDING_SAYING', 'DRAMATIC_ONE_LINE_CLOSER', 'CHATBOT_RESIDUE', 'BORROWED_AUTHORITY', 'ARGUING_WITH_NO_ONE', 'INFLATED_SIGNIFICANCE', 'COPULA_AVOIDANCE', 'KNOWLEDGE_LIMIT_DISCLAIMER']);

export { STRONG_STAGING };

export function voiceDeviation(metrics, tokenized, text, profile) {
  const targets = profile?.targets ?? profile?.metrics;
  if (!targets) return 0;
  const actual = {
    meanSentenceLength: metrics.meanSentenceLength,
    burstinessCV: metrics.burstinessCV,
    adjacentDelta: metrics.adjacentDelta,
    mattr: metrics.mattr,
    averageParagraphSentenceCount: mean(tokenized.paragraphs.map((paragraph) => paragraph.sentences.length)),
  };
  const deviations = [];
  for (const key of Object.keys(actual)) {
    if (typeof targets[key] !== 'number') continue;
    deviations.push(Math.min(3, Math.abs(actual[key] - targets[key]) / Math.max(Math.abs(targets[key]), 0.01)));
  }
  const targetPunctuation = targets.punctuationRates;
  if (targetPunctuation) {
    const actualPunctuation = punctuationRates(text, metrics.wordCount);
    for (const key of Object.keys(targetPunctuation)) {
      deviations.push(Math.min(3, Math.abs(actualPunctuation[key] - targetPunctuation[key]) / Math.max(Math.abs(targetPunctuation[key]), 0.01)));
    }
  }
  const result = deviations.length ? mean(deviations) : 0;
  return result < 0.0005 ? 0 : result;
}

export function lexicalPenalty(violations) {
  return Math.min(30, violations.reduce((total, violation) => {
    if (violation.severity === 'warn') return total;
    if (violation.type === 'SLOP_PHRASE' || violation.type === 'DEFINITIONAL_OPENING' || STRONG_STAGING.has(violation.type) || violation.weakAlone) return total + 5;
    if (violation.type === 'STRUCTURAL_CLICHE') return total + 4;
    if (['RHETORICAL_SLOP', 'WEAK_CTA', 'HYPERBOLIC_CLAIM', 'TAUTOLOGICAL_CODE_COMMENT', 'DECORATIVE_COMMENT_BANNER', 'LAZY_AI_PLACEHOLDER', 'MISSING_ACCESSIBLE_NAME', 'MISSING_IMG_ALT', 'HEADING_ORDER_SKIP', 'AI_GRADIENT_CLICHE', 'NON_RESPONSIVE_FIXED_WIDTH'].includes(violation.type)) return total + 4;
    return total;
  }, 0));
}

export function scoreResult(metrics, violations, thresholds, mattrTarget) {
  const cvTarget = metrics.sentenceCount >= MIN_SENTENCES_FOR_RHYTHM ? thresholds.burstinessCVLong : thresholds.burstinessCVShort;
  let burstinessPenalty = metrics.sentenceCount >= MIN_SENTENCES_FOR_RHYTHM && metrics.burstinessCV < cvTarget ? Math.min(25, Math.round((cvTarget - metrics.burstinessCV) * 100)) : 0;
  if (metrics.sentenceCount >= MIN_SENTENCES_FOR_RHYTHM && (metrics.shortSentenceRatio < thresholds.shortSentenceRatio || metrics.longSentenceRatio < thresholds.longSentenceRatio)) {
    burstinessPenalty = Math.min(25, burstinessPenalty + 8);
  }
  if (violations.some((violation) => violation.type === 'FLAT_PARAGRAPH_RHYTHM')) burstinessPenalty = Math.min(25, burstinessPenalty + 5);
  const rhythmPenalty = Math.min(20, violations.reduce((total, violation) => {
    if (violation.type === 'MONOTONOUS_RHYTHM') return total + 6;
    if (violation.type === 'UNIFORM_CLAUSE_STRUCTURE') return total + 5;
    return total;
  }, 0));
  const morphologyPenalty = Math.min(15,
    (violations.some((violation) => violation.type === 'EXCESSIVE_NOMINALIZATION') ? 7.5 : 0)
    + Math.min(15, violations.filter((violation) => violation.type === 'PASSIVE_BLOATING').length * 7.5));
  const vocabularyPenalty = metrics.mattr < mattrTarget ? 5 : 0;
  const entropyPenalty = violations.some((violation) => ['LOW_ENTROPY_REPETITION', 'SYMMETRIC_PARAGRAPHS', 'REPETITIVE_STARTERS', 'REPETITIVE_NGRAM'].includes(violation.type)) ? 5 : 0;
  const profilePenalty = violations.some((violation) => violation.type === 'VOICE_PROFILE_DEVIATION') ? 5 : 0;
  const vocabularyAndProfilePenalty = Math.min(10, vocabularyPenalty + entropyPenalty + profilePenalty);
  return Math.max(0, Math.round(100 - burstinessPenalty - rhythmPenalty - lexicalPenalty(violations) - morphologyPenalty - vocabularyAndProfilePenalty));
}

export function withSeverity(violations, tokenized, source) {
  const warnings = new Set(['WEAK_CTA', 'AI_GRADIENT_CLICHE', 'NON_RESPONSIVE_FIXED_WIDTH', 'DECORATIVE_COMMENT_BANNER']);
  const minorTransitions = new Set(['EN017', 'EN018', 'ID009', 'ID010', 'ID011']);
  const counts = new Map();
  for (const violation of violations) counts.set(violation.ruleId, (counts.get(violation.ruleId) ?? 0) + 1);
  const lineStarts = [0];
  for (const match of source.matchAll(/\r\n|\r|\n/gu)) lineStarts.push(match.index + match[0].length);
  const position = (offset) => {
    let low = 0;
    let high = lineStarts.length;
    while (low + 1 < high) {
      const mid = Math.floor((low + high) / 2);
      if (lineStarts[mid] <= offset) low = mid;
      else high = mid;
    }
    return { line: low + 1, column: offset - lineStarts[low] + 1 };
  };
  return violations.map((violation) => {
    const severity = warnings.has(violation.type) || (minorTransitions.has(violation.ruleId) && (violation.occurrenceCount ?? counts.get(violation.ruleId)) === 1) ? 'warn' : 'error';
    if (violation.charOffset) return { ...violation, severity, ruleId: violation.ruleId ?? violation.type, sourceScope: 'match' };
    const location = violation.location ?? '';
    const sentenceRange = /Sentences? (\d+)(?:-(\d+))?/u.exec(location);
    const paragraphRange = /Paragraphs? (\d+)(?:-(\d+))?/u.exec(location);
    const selected = tokenized.sentences.filter((sentence) => {
      if (sentenceRange) return sentence.sentenceIndex >= Number(sentenceRange[1]) && sentence.sentenceIndex <= Number(sentenceRange[2] ?? sentenceRange[1]);
      if (paragraphRange) return sentence.paragraphIndex >= Number(paragraphRange[1]) && sentence.paragraphIndex <= Number(paragraphRange[2] ?? paragraphRange[1]);
      return false;
    });
    const positions = selected.flatMap((sentence) => sentence.sourceMap ?? []).filter((position) => position >= 0);
    const start = positions.length ? positions[0] : 0;
    const end = positions.length ? positions[positions.length - 1] + 1 : Math.min(source.length, 200);
    const match = source.slice(start, end);
    return { ...violation, ...(violation.match && violation.match !== match ? { detail: violation.match } : {}), ruleId: violation.ruleId ?? violation.type, severity, match, charOffset: { start, end }, sourceScope: positions.length ? 'sentence-range' : 'document-excerpt' };
  })
    .map((violation) => {
      const start = position(violation.charOffset.start);
      const end = position(violation.charOffset.end);
      return { ...violation, line: start.line, column: start.column, endLine: end.line, endColumn: end.column };
    })
    .sort((left, right) => (left.charOffset?.start ?? Infinity) - (right.charOffset?.start ?? Infinity));
}

export function deliveryGate({ metrics, violations, language, rulePack, score, status }) {
  const types = (names) => violations.filter((violation) => names.includes(violation.type));
  const prioritizedFixes = violations.slice(0, 8).map((violation) => ({
    type: violation.type,
    location: violation.location,
    fixInstruction: violation.fixInstruction,
    ...(violation.suggestedReplacement ? { suggestedReplacement: violation.suggestedReplacement } : {}),
    ...(violation.splitSuggestion ? { splitSuggestion: violation.splitSuggestion } : {}),
  }));
  return {
    rhythmAndStylometry: {
      status: metrics.sentenceCount < MIN_SENTENCES_FOR_RHYTHM ? `SKIP (insufficient sentence count <${MIN_SENTENCES_FOR_RHYTHM} for statistical variance)` : 'EVALUATED',
      burstinessCV: metrics.burstinessCV,
      paragraphBurstinessCV: metrics.paragraphBurstinessCV,
      adjacentDelta: metrics.adjacentDelta,
      clauseSymmetry: types(['UNIFORM_CLAUSE_STRUCTURE']),
      rhythmFindings: types(['LOW_BURSTINESS', 'FLAT_PARAGRAPH_RHYTHM', 'MONOTONOUS_RHYTHM', 'MISSING_SENTENCE_RANGE', 'LOW_ADJACENT_DELTA']),
    },
    lexicalAndMorphology: {
      language,
      rulePack,
      mode: rulePack === 'universal' ? 'Universal stylometry' : '8 language-specific lexical pack',
      ngrams: types(['REPETITIVE_NGRAM']),
      morphology: violations.filter((violation) => ['SLOP_PHRASE', 'EXCESSIVE_NOMINALIZATION', 'PASSIVE_BLOATING', 'DEFINITIONAL_OPENING'].includes(violation.type) || STRONG_STAGING.has(violation.type)),
    },
    domainHygiene: {
      copywritingAndCta: types(['WEAK_CTA', 'HYPERBOLIC_CLAIM']),
      codeComments: types(['TAUTOLOGICAL_CODE_COMMENT', 'DECORATIVE_COMMENT_BANNER', 'LAZY_AI_PLACEHOLDER']),
      uiAccessibilityResponsive: types(['MISSING_ACCESSIBLE_NAME', 'MISSING_IMG_ALT', 'HEADING_ORDER_SKIP', 'AI_GRADIENT_CLICHE', 'NON_RESPONSIVE_FIXED_WIDTH']),
    },
    finalVerdict: { score, status, prioritizedFixes },
  };
}
