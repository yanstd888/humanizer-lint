const parentDirectory = '..';
const utilityModule = (...segments) => new URL([parentDirectory, 'utils', ...segments].join('/'), import.meta.url);
const { sanitizeMarkdownWithMap } = await import(utilityModule('sanitizer.mjs'));
const { coefficientOfVariation, mean, punctuationRates, MIN_SENTENCES_FOR_RHYTHM } = await import(utilityModule('metrics-core.mjs'));
const { isCJKText, tokenizeText } = await import(utilityModule('tokenizer.mjs'));
const { lintDomainHygiene } = await import(utilityModule('domain-linters.mjs'));

const HAN = /[\u4e00-\u9fff]/gu;
const STRONG_STAGING = new Set(['NOT_X_BUT_Y', 'STAGED_RUN_UP', 'DEEP_SOUNDING_SAYING', 'DRAMATIC_ONE_LINE_CLOSER', 'CHATBOT_RESIDUE', 'BORROWED_AUTHORITY', 'ARGUING_WITH_NO_ONE', 'INFLATED_SIGNIFICANCE', 'COPULA_AVOIDANCE', 'KNOWLEDGE_LIMIT_DISCLAIMER']);
const KANA = /[\u3040-\u30ff]/u;
const ARABIC = /[\u0600-\u06ff]/u;
const ID_EXCLUSIVE_WORDS = new Set(['tidak', 'karena', 'bisa', 'seperti', 'dari', 'bahwa']);
const MS_EXCLUSIVE_WORDS = new Set(['tak', 'kerana', 'boleh', 'bagi', 'daripada', 'bahawa', 'beliau']);

function round(value, places = 4) {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}

function detectLanguage(text, words, rules) {
  if (KANA.test(text)) return 'ja';
  if (ARABIC.test(text)) return 'ar';
  const hanCount = (text.match(HAN) ?? []).length;
  if (hanCount > 0 && isCJKText(text)) return 'zh';

  const scores = new Map();
  for (const [language, rule] of Object.entries(rules)) {
    let score = 0;
    const stopwords = new Set(rule.stopwords ?? []);
    for (const word of words) if (stopwords.has(word)) score += 1;
    scores.set(language, score);
  }
  if (scores.has('id') && scores.has('ms')) {
    const idExclusive = words.filter((word) => ID_EXCLUSIVE_WORDS.has(word)).length;
    const msExclusive = words.filter((word) => MS_EXCLUSIVE_WORDS.has(word)).length;
    scores.set('id', scores.get('id') + idExclusive * 2);
    scores.set('ms', scores.get('ms') + msExclusive * 2);
  }

  const [language, score] = [...scores.entries()].sort((left, right) => right[1] - left[1])[0] ?? ['universal', 0];
  return score >= Math.max(2, Math.ceil(words.length * 0.04)) ? language : 'universal';
}

function mattrThreshold(thresholds, language, tokenized) {
  if (typeof thresholds.mattr?.[language] === 'number') return thresholds.mattr[language];
  return isCJKText(tokenized.words.join('')) ? 0.68 : 0.72;
}

function locationFor(sentence) {
  return `Paragraph ${sentence.paragraphIndex}, Sentence ${sentence.sentenceIndex}`;
}

function regexFor(pattern) {
  return new RegExp(pattern, 'giu');
}

function mapSentenceOffsets(sentences, sanitized) {
  const normalized = sanitized.text.replace(/\s+/gu, ' ');
  const positions = [];
  for (let i = 0; i < sanitized.text.length; i += 1) {
    positions.push(sanitized.map[i]);
    if (/\s/u.test(sanitized.text[i])) while (/\s/u.test(sanitized.text[i + 1] ?? '')) i += 1;
  }
  let cursor = 0;
  for (const sentence of sentences) {
    const start = normalized.indexOf(sentence.text, cursor);
    if (start < 0) break;
    sentence.sourceMap = positions.slice(start, start + sentence.text.length);
    cursor = start + sentence.text.length;
  }
}

function suggestedReplacement(type, match, matches = []) {
  const value = String(match ?? matches[0] ?? '').toLowerCase();
  const replacements = [
    [/pengimplementasian/iu, 'penerapan / menerapkan'],
    [/\bdelve(?: into)?\b/iu, 'examine / explore'],
    [/tidak dapat dipungkiri(?: bahwa)?/iu, 'state the concrete claim directly'],
  ];
  const found = replacements.find(([pattern]) => pattern.test(value));
  if (found) return found[1];
  if (type === 'EXCESSIVE_NOMINALIZATION') return 'Replace the listed noun forms with a concrete actor and active verb.';
  if (type === 'PASSIVE_BLOATING') return 'Name the actor, then use the active verb.';
  if (type === 'SLOP_PHRASE') return 'Replace the stock phrase with the specific fact or action.';
  return undefined;
}

function patternViolations(tokenized, rules, wordCount, original, language) {
  if (!rules?.patterns) return [];
  const violations = [];
  const chineseBoundaries = new WeakMap();
  let chineseSegmenter;
  for (const rule of rules.patterns) {
    const candidates = [];
    const sentences = rule.scope === 'paragraph-start'
      ? tokenized.paragraphs.map((paragraph) => paragraph.sentences[0]).filter(Boolean)
      : tokenized.sentences;

    for (const sentence of sentences) {
      // ponytail: recognizes explicit EN/ID attribution only; use a citation parser for broader coverage.
      if (rule.type === 'BORROWED_AUTHORITY' && /\b(?:[Aa]ccording to|[Mm]enurut)\s+(?:(?:Dr|Prof)\.\s+)?(?!Dr\b|Prof\b)[A-Z][\p{L}\p{N}.-]+/u.test(sentence.text)) continue;
      const regex = regexFor(rule.pattern);
      for (const match of sentence.text.matchAll(regex)) {
        if (language === 'zh' && typeof rule.minedPhrase === 'string') {
          // ponytail: ICU word boundaries vary by runtime; review mined rules after runtime upgrades.
          if (!chineseBoundaries.has(sentence)) {
            if (typeof Intl.Segmenter !== 'function') throw new Error('Chinese mined rules require Intl.Segmenter for word boundaries.');
            chineseSegmenter ??= new Intl.Segmenter('zh', { granularity: 'word' });
            const words = [...chineseSegmenter.segment(sentence.text)].filter((part) => part.isWordLike);
            chineseBoundaries.set(sentence, { starts: new Set(words.map((part) => part.index)), ends: new Set(words.map((part) => part.index + part.segment.length)) });
          }
          const boundaries = chineseBoundaries.get(sentence);
          if (!boundaries.starts.has(match.index) || !boundaries.ends.has(match.index + match[0].length)) continue;
        }
        candidates.push({ sentence, match: match[0], offset: match.index });
      }
    }

    const allowed = rule.maxOccurrences == null
      ? 0
      : rule.maxOccurrences * Math.max(1, Math.ceil(wordCount / (rule.perWords || wordCount || 1)));
    const seenPerParagraph = new Map();
    const selected = rule.scope === 'paragraph-frequency' ? candidates.filter((candidate) => {
      const index = candidate.sentence.paragraphIndex;
      const count = (seenPerParagraph.get(index) ?? 0) + 1;
      seenPerParagraph.set(index, count);
      const size = tokenized.paragraphs.find((paragraph) => paragraph.paragraphIndex === index)?.words.length ?? 0;
      const limit = (rule.maxOccurrences ?? 0) * Math.max(1, Math.ceil(size / (rule.perWords || size || 1)));
      return count > limit;
    }) : candidates.slice(allowed);
    for (const candidate of selected) {
      const indices = candidate.sentence.sourceMap?.slice(candidate.offset, candidate.offset + candidate.match.length);
      const start = indices?.[0];
      const end = indices?.[indices.length - 1];
      const offset = start >= 0 && end >= start ? { start, end: end + 1 } : undefined;
      violations.push({
        type: rule.type,
        ruleId: rule.id,
        ...(rule.weakAlone === true ? { weakAlone: true } : {}),
        occurrenceCount: candidates.length,
        location: locationFor(candidate.sentence),
        match: offset ? original.slice(offset.start, offset.end) : candidate.match,
        ...(offset ? { charOffset: offset } : {}),
        fixInstruction: rule.fixInstruction,
        suggestedReplacement: suggestedReplacement(rule.type, candidate.match),
      });
    }
  }
  return violations;
}

function monotonyViolations(tokenized) {
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

function paragraphRhythmViolations(tokenized) {
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

function repetitiveNgramViolations(tokenized, stopwords = []) {
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

function rhetoricalViolations(tokenized) {
  const hooks = /^(?:mengapa demikian\?|menarik, bukan\?|here['’]s the kicker:|want to know the best part\?|let that sink in\.?)/iu;
  const shortQuestions = tokenized.sentences.filter((sentence) => sentence.text.endsWith('?') && sentence.wordCount <= 6);
  return tokenized.sentences
    .filter((sentence) => hooks.test(sentence.text) || (shortQuestions.length >= 3 && sentence.text.endsWith('?') && sentence.wordCount <= 6))
    .map((sentence) => ({
      type: 'RHETORICAL_SLOP',
      location: locationFor(sentence),
      match: sentence.text,
      fixInstruction: 'Remove the staged conversational hook and state the point directly.',
    }));
}

function pairedContrasts(tokenized, language, pack) {
  if (language !== 'en') return [];
  const contrasts = (pack?.editorial?.pairedContrasts ?? []).map(({ first, second }) => [new RegExp(first, 'iu'), new RegExp(second, 'iu')]);
  const findings = [];
  for (const paragraph of tokenized.paragraphs) {
    for (let i = 1; i < paragraph.sentences.length; i += 1) {
      const first = paragraph.sentences[i - 1];
      const second = paragraph.sentences[i];
      const firstToken = first.text.match(/^[\p{L}\p{N}]+/u)?.[0].toLocaleLowerCase();
      const secondToken = second.text.match(/^[\p{L}\p{N}]+/u)?.[0].toLocaleLowerCase();
      if (i === paragraph.sentences.length - 1 && first.wordCount <= 4 && second.wordCount <= 4 && firstToken && firstToken === secondToken) {
        findings.push({ type: 'DRAMATIC_ONE_LINE_CLOSER', weakAlone: true, location: `Paragraph ${paragraph.paragraphIndex}, Sentences ${first.sentenceIndex}-${second.sentenceIndex}`, fixInstruction: 'Review whether this staged ending adds a supported point.' });
      }
      if (contrasts.some(([left, right]) => left.test(first.text) && right.test(second.text))) {
        findings.push({ type: 'NOT_X_BUT_Y', location: `Paragraph ${paragraph.paragraphIndex}, Sentences ${first.sentenceIndex}-${second.sentenceIndex}`, fixInstruction: 'Review whether the contrast is needed; state the supported point directly.' });
      }
    }
  }
  return findings;
}

function delayedDecision(tokenized, pack) {
  const sentences = tokenized.paragraphs[0]?.sentences ?? [];
  // ponytail: explicit EN/ID decision openers after 3 sentences and 45 words only; use validated discourse analysis for broader coverage.
  const openers = (pack?.editorial?.decisionOpeners ?? []).map((pattern) => new RegExp(pattern, 'iu'));
  if (!openers.length) return [];
  const index = sentences.findIndex((sentence) => openers.some((opener) => opener.test(sentence.text)));
  if (index < 3 || sentences.slice(0, index).reduce((sum, sentence) => sum + sentence.wordCount, 0) < 45) return [];
  const sentence = sentences[index];
  return [{ type: 'DELAYED_DECISION_LEAD', weakAlone: true, location: locationFor(sentence), fixInstruction: 'Consider whether the decision should appear earlier; preserve context and evidence.' }];
}

function inconsistentQuotes(tokenized, source) {
  const findings = [];
  for (const paragraph of tokenized.paragraphs) {
    let style = '';
    // ponytail: paired double quotes within one sentence only; use a syntax-aware quote parser for nesting and multiline quotations.
    for (const sentence of paragraph.sentences) {
      for (const match of sentence.text.matchAll(/"[^"“”\n]+"|“[^“”"\n]+”/gu)) {
        const current = match[0][0];
        if (style && current !== style) {
          const positions = sentence.sourceMap?.slice(match.index, match.index + match[0].length);
          const start = positions?.[0];
          const end = positions?.[positions.length - 1];
          if (start >= 0 && end >= start && source.slice(start, end + 1) === match[0]) findings.push({ type: 'INCONSISTENT_QUOTES', weakAlone: true, location: locationFor(sentence), match: match[0], charOffset: { start, end: end + 1 }, fixInstruction: 'Review quote style without changing any quoted wording.' });
          break;
        }
        style = current;
      }
      if (findings.at(-1)?.location === locationFor(sentence)) break;
    }
  }
  return findings;
}

function markdownFormatting(source, active, tokenized) {
  const findings = [];
  let offset = 0;
  let listStart = 0;
  let listCount = 0;
  let comment = false;
  const frontmatter = /^---[ \t]*\r?\n[\s\S]*?\r?\n---[ \t]*(?:\r?\n|$)/u.exec(source)?.[0].length ?? 0;
  // ponytail: ATX headings and single-line unordered items only; O(items × sentences). Use a parser and indexed offsets for broader coverage or scale.
  for (const [index, line] of source.split(/(?<=\n)/u).entries()) {
    const heading = /^ {0,3}#{1,6}[ \t]+([^\r\n]+)/u.exec(line);
    if (active[index] && offset >= frontmatter && !comment && heading) {
      const next = tokenized.sentences.find((sentence) => sentence.sourceMap?.some((position) => position >= offset + line.length));
      const nextStart = next?.sourceMap?.find((position) => position >= offset + line.length);
      const interveningHeading = Number.isInteger(nextStart) && /^ {0,3}#{1,6}[ \t]/mu.test(source.slice(offset + line.length, nextStart));
      const location = next && !interveningHeading ? `Paragraph ${next.paragraphIndex}` : 'Heading';
      const charOffset = { start: offset, end: offset + heading[0].length };
      if (/[\p{Extended_Pictographic}←-⇿]/u.test(heading[1])) findings.push({ type: 'DECORATIVE_HEADING', weakAlone: true, location, match: heading[0], charOffset, fixInstruction: 'Review whether the decorative symbol helps readers navigate.' });
      const normalize = (value) => value.trim().replace(/[.!?]+$/u, '').trim().toLocaleLowerCase('und');
      if (next && !interveningHeading && normalize(heading[1]) === normalize(next.text)) findings.push({ type: 'HEADING_REPEATED_IN_OPENING', weakAlone: true, location, match: heading[0], charOffset, fixInstruction: 'Review whether the opening adds information beyond the heading.' });
    }
    const listItem = active[index] && offset >= frontmatter && !comment && /^ {0,3}[-*+][ \t]+\*\*[^*\r\n]+:\*\*[ \t]+\S[^\r\n]*/u.exec(line);
    if (listItem) {
      if (listCount++ === 0) listStart = offset;
      if (listCount === 3) {
        const end = offset + listItem[0].length;
        const sentence = tokenized.sentences.find((item) => item.sourceMap?.some((position) => position >= listStart && position < end));
        findings.push({ type: 'DECORATIVE_BOLD_LIST', weakAlone: true, location: sentence ? `Paragraph ${sentence.paragraphIndex}` : 'List', match: source.slice(listStart, end), charOffset: { start: listStart, end }, fixInstruction: 'Review whether repeated bold labels help readers navigate.' });
      }
    } else listCount = 0;
    if (active[index] && offset >= frontmatter) for (const marker of line.matchAll(/<!--|-->/gu)) {
      if (marker[0] === '<!--' && !comment) comment = true;
      else if (marker[0] === '-->' && comment) comment = false;
    }
    offset += line.length;
  }
  return findings;
}

function repeatedOpenings(tokenized) {
  const findings = [];
  for (const paragraph of tokenized.paragraphs) {
    let previous = '';
    for (let i = 1; i < paragraph.sentences.length; i += 1) {
      const first = paragraph.sentences[i - 1];
      const second = paragraph.sentences[i];
      const opening = first.words.length >= 3 ? first.words.slice(0, 2).join(' ') : '';
      const next = second.words.length >= 3 ? second.words.slice(0, 2).join(' ') : '';
      if (opening && opening === next && previous !== opening) findings.push({
        type: 'REPEATED_SENTENCE_OPENING', weakAlone: true,
        location: `Paragraph ${paragraph.paragraphIndex}, Sentences ${first.sentenceIndex}-${second.sentenceIndex}`,
        fixInstruction: 'Review repeated openings; vary them only where the meaning benefits.',
      });
      previous = opening === next ? opening : '';
    }
  }
  return findings;
}

function structuralViolations(tokenized, metrics) {
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

function statisticalViolations(metrics, thresholds, mattrTarget) {
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

function morphologyViolations(tokenized, morphology) {
  if (!morphology) return { violations: [], nominalizationRatio: 0, passiveRatio: 0 };
  const words = tokenized.words;
  const nominalizationPattern = new RegExp(morphology.nominalizationPattern, 'iu');
  const nominalizationWhitelist = new Set(morphology.nominalizationWhitelist);
  const nominalizations = words.filter((word) => nominalizationPattern.test(word) && !nominalizationWhitelist.has(word));
  const passivePattern = new RegExp(morphology.passivePattern, 'iu');
  const loanwordExclusion = new RegExp(morphology.loanwordExclusionPattern, 'iu');
  const loanwordSuffixExclusion = new RegExp(morphology.loanwordSuffixExclusionPattern ?? '$^', 'iu');
  const passives = words.filter((word) => passivePattern.test(word) && !loanwordExclusion.test(word) && !loanwordSuffixExclusion.test(word));
  const nominalizationRatio = words.length ? nominalizations.length / words.length : 0;
  const passiveRatio = words.length ? passives.length / words.length : 0;
  const violations = [];

  if (nominalizationRatio > morphology.nominalizationMaxRatio) {
    violations.push({
      type: 'EXCESSIVE_NOMINALIZATION',
      location: 'Whole text',
      ratio: round(nominalizationRatio),
      matches: [...new Set(nominalizations)],
      fixInstruction: 'Replace abstract nominalizations with concrete actors and verbs.',
      suggestedReplacement: suggestedReplacement('EXCESSIVE_NOMINALIZATION', '', nominalizations),
    });
  }
  if (passiveRatio > morphology.passiveMaxRatio) {
    violations.push({
      type: 'PASSIVE_BLOATING',
      location: 'Whole text',
      ratio: round(passiveRatio),
      matches: [...new Set(passives)],
      fixInstruction: 'Name the actor and use an active verb where the actor is known.',
      suggestedReplacement: suggestedReplacement('PASSIVE_BLOATING', '', passives),
    });
  }

  const openingPattern = new RegExp(morphology.subordinateOpeningPattern, 'iu');
  let foundConsecutiveOpening = false;
  for (const paragraph of tokenized.paragraphs) {
    for (let index = 1; index < paragraph.sentences.length; index += 1) {
      const previous = paragraph.sentences[index - 1];
      const current = paragraph.sentences[index];
      if (!openingPattern.test(previous.text) || !openingPattern.test(current.text)) continue;
      violations.push({
        type: 'PASSIVE_BLOATING',
        location: `Paragraph ${paragraph.paragraphIndex}, Sentences ${previous.sentenceIndex}-${current.sentenceIndex}`,
        match: 'Two or more consecutive sentences start with translationese subordinate clauses',
        fixInstruction: 'Rewrite to start directly with the active subject (Subjek + Predikat).',
      });
      foundConsecutiveOpening = true;
      break;
    }
    if (foundConsecutiveOpening) break;
  }
  return { violations, nominalizationRatio, passiveRatio };
}

function splitSuggestion(sentence) {
  if (!sentence || sentence.wordCount < 16) return undefined;
  const candidates = [...sentence.text.matchAll(/\b(?:sehingga|tetapi|namun|karena|however|because|while)\b|[;,]/giu)];
  if (!candidates.length) return undefined;
  const middle = sentence.text.length / 2;
  const best = candidates.sort((left, right) => Math.abs(left.index - middle) - Math.abs(right.index - middle))[0];
  return `Consider splitting near “${best[0]}” if both resulting sentences remain complete.`;
}

function attachSurgicalHints(violations, tokenized) {
  return violations.map((violation) => {
    const sentenceMatch = /Sentence (\d+)/u.exec(violation.location ?? '');
    const rangeMatch = /Sentences (\d+)-(\d+)/u.exec(violation.location ?? '');
    const sentence = sentenceMatch
      ? tokenized.sentences.find((item) => item.sentenceIndex === Number(sentenceMatch[1]))
      : rangeMatch
        ? tokenized.sentences.find((item) => item.sentenceIndex >= Number(rangeMatch[1]) && item.sentenceIndex <= Number(rangeMatch[2]) && item.wordCount >= 16)
        : undefined;
    const replacement = violation.suggestedReplacement ?? suggestedReplacement(violation.type, violation.match, violation.matches);
    const split = splitSuggestion(sentence);
    return {
      ...violation,
      ...(replacement ? { suggestedReplacement: replacement } : {}),
      ...(split ? { splitSuggestion: split } : {}),
    };
  });
}

function voiceDeviation(metrics, tokenized, text, profile) {
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

function lexicalPenalty(violations) {
  return Math.min(30, violations.reduce((total, violation) => {
    if (violation.severity === 'warn') return total;
    if (violation.type === 'SLOP_PHRASE' || violation.type === 'DEFINITIONAL_OPENING' || STRONG_STAGING.has(violation.type) || violation.weakAlone) return total + 5;
    if (violation.type === 'STRUCTURAL_CLICHE') return total + 4;
    if (['RHETORICAL_SLOP', 'WEAK_CTA', 'HYPERBOLIC_CLAIM', 'TAUTOLOGICAL_CODE_COMMENT', 'DECORATIVE_COMMENT_BANNER', 'LAZY_AI_PLACEHOLDER', 'MISSING_ACCESSIBLE_NAME', 'MISSING_IMG_ALT', 'HEADING_ORDER_SKIP', 'AI_GRADIENT_CLICHE', 'NON_RESPONSIVE_FIXED_WIDTH'].includes(violation.type)) return total + 4;
    return total;
  }, 0));
}

function scoreResult(metrics, violations, thresholds, mattrTarget) {
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

function withSeverity(violations, tokenized, source) {
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

function deliveryGate({ metrics, violations, language, rulePack, score, status }) {
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

function ambiguousTemplateSource(source, options) {
  return source.includes('`') && (/\.(?:[cm]?[jt]sx?|mdx)$/iu.test(options.sourcePath ?? '') || (options.domain === 'code' && !options.sourcePath));
}

function applyIgnoreDirectives(input, options = {}, activeOutput = []) {
  const lines = String(input ?? '').split(/(?<=\n)/u);
  const fileDirective = /^\s*<!--\s*humanizer-ignore-file\s*-->\s*$/u;
  let fence = null;
  // ponytail: disable ambiguous template cases; a full language parser can narrow the exclusion.
  let blockComment = false;
  const jsSource = /\.[cm]?[jt]sx?$/iu.test(options.sourcePath ?? '') || (options.domain === 'code' && !options.sourcePath);
  if (ambiguousTemplateSource(String(input ?? ''), options)) return String(input ?? '');
  const active = lines.map((line) => {
    const inTemplate = blockComment;
    if (jsSource) {
      let quote = '';
      for (let i = 0; i < line.length; i += 1) {
        const ch = line[i];
        if (blockComment) {
          if (ch === '*' && line[i + 1] === '/') { blockComment = false; i += 1; }
          continue;
        }
        if (ch === '\\') { i += 1; continue; }

        if (quote) { if (ch === quote) quote = ''; continue; }
        if (ch === '"' || ch === "'") { quote = ch; continue; }
        if (ch === '/' && line[i + 1] === '/') break;
        if (ch === '/' && line[i + 1] === '*') { blockComment = true; i += 1; continue; }

      }
    }
    if (inTemplate) return false;
    const marker = /^ {0,3}(`{3,}|~{3,})([^\x0d\x0a]*)/u.exec(line);
    if (!fence && marker) { fence = marker[1]; return false; }
    if (fence && marker && marker[1][0] === fence[0] && marker[1].length >= fence.length && !marker[2].trim()) { fence = null; return false; }
    return !fence;
  });
  for (const value of active) activeOutput.push(value);
  let contentStart = 0;
  if (/^---\s*$/u.test(lines[0]?.trimEnd() ?? '')) {
    const closing = lines.findIndex((line, index) => index > 0 && /^---\s*$/u.test(line.trimEnd()));
    if (closing > 0) contentStart = closing + 1;
  }
  if (lines.some((line, index) => index >= contentStart && index < 10 && active[index] && fileDirective.test(line))) return String(input ?? '').replace(/[^\r\n]/g, ' ');
  const directive = /^(?:\s*<!--\s*humanizer-ignore\s*-->\s*|\s*\/\/\s*humanizer-ignore\s*|\s*\/\*\s*humanizer-ignore\s*\*\/\s*)$/u;
  let ignoreNext = false;
  return lines.map((line, index) => {
    if (!active[index]) return line;
    if (ignoreNext && line.trim()) { ignoreNext = false; return line.replace(/[^\r\n]/g, ' '); }
    const inlineHtml = !/^\s*(?:[-+*]\s|\d+[.)]\s|>|\|)/u.test(line) && !/\|/u.test(line) && /^([^`"'<>\r\n]+?)\s*<!--\s*humanizer-ignore\s*-->\s*$/u.exec(line);
    const inlineCode = /^\s*\/\/[^\n]*?(?:\/\/\s*humanizer-ignore|\/\*\s*humanizer-ignore\s*\*\/)\s*$/u.test(line);
    if (inlineHtml || inlineCode) return line.replace(/[^\x0a\x0d]/g, ' ');
    if (!directive.test(line)) return line;
    const remainder = line.replace(directive, '').trim();
    if (!remainder) ignoreNext = true;
    return line.replace(/[^\r\n]/g, ' ');
  }).join('');
}

function stripIgnoreMarkers(source, active) {
  return source.split(/(?<=\n)/u).map((line, index) => {
    if (!active[index]) return line;
    const html = /<!--\s*humanizer-ignore(?:-file)?(?:\s+[A-Z0-9_, ]+)?\s*-->/u;
    if (/^\s*(?:[-+*]\s|\d+[.)]\s|>|\|)/u.test(line) || /\|/u.test(line)) return line.replace(html, (match) => match.replace(/[^\r\n]/g, ' '));
    if (/^\s*<!--/u.test(line) || /^[^`"'<>\r\n]+<!--/u.test(line)) return line.replace(html, (match) => match.replace(/[^\r\n]/g, ' '));
    if (/^\s*\/\/\s*humanizer-ignore(?:\s+[A-Z0-9_, ]+)?\s*$/u.test(line)) return line.replace(/[^\r\n]/g, ' ');
    return line;
  }).join('');
}

function scopedIgnoreDirectives(source, masked, options, active) {
  if (options.noIgnore || ambiguousTemplateSource(source, options)) return { text: masked, scopes: [] };
  const lines = source.split(/(?<=\n)/u);
  const maskedLines = masked.split(/(?<=\n)/u);
  const scopes = [];
  let offset = 0;
  let fence = null;
  let pending = null;
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const marker = /^ {0,3}(`{3,}|~{3,})([^\r\n]*)/u.exec(line);
    if (!fence && marker) fence = marker[1];
    else if (fence && marker && marker[1][0] === fence[0] && marker[1].length >= fence.length && !marker[2].trim()) fence = null;
    else if (!fence && active[index]) {
      const match = /^(?:\s*<!--[\t ]*humanizer-ignore[\t ]+([A-Z0-9_, ]+)[\t ]*-->[\t ]*|\s*\/\/[\t ]*humanizer-ignore[\t ]+([A-Z0-9_, ]+)[\t ]*)\r?\n?$/u.exec(line);
      if (match && maskedLines[index] === line) {
        const rules = (match[1] ?? match[2]).split(',').map((value) => value.trim()).filter(Boolean);
        if (rules.length && rules.every((value) => /^[A-Z][A-Z0-9_]*$/u.test(value))) {
          pending = { kind: 'next-line', line: index + 1, scope: rules };
          maskedLines[index] = line.replace(/[^\r\n]/g, ' ');
        }
      } else if (pending && line.trim()) {
        scopes.push({ start: offset, end: offset + line.length, directive: pending });
        pending = null;
      }
    }
    offset += line.length;
  }
  return { text: maskedLines.join(''), scopes };
}

export function createAnalyzer({ rules, defaultProfile, calculateMetrics, calculateMetricsAsync }) {
  if (!rules || !defaultProfile || typeof calculateMetrics !== 'function') {
    throw new TypeError('createAnalyzer requires rules, defaultProfile, and calculateMetrics');
  }

  const prepare = (input, options) => {
    const source = String(input ?? '');
    const ignoreWarning = source.includes('humanizer-ignore') && ambiguousTemplateSource(source, options) ? 'Ignore directives are disabled for JavaScript/TypeScript or MDX inputs containing backticks.' : '';
    const ignoreWarnings = ignoreWarning ? [ignoreWarning] : [];
    const lines = source.split(/\r?\n/u);
    for (const [index, line] of lines.entries()) {
      if (/humanizer-ignore/u.test(line) && (/^\s*(?:[-+*]\s|\d+[.)]\s|>|\|)/u.test(line) || /\|/u.test(line))) ignoreWarnings.push(`Line ${index + 1}: ambiguous Markdown ignore directive; no finding was suppressed.`);
      if (/humanizer-ignore-file/u.test(line) && index >= 10) ignoreWarnings.push(`Line ${index + 1}: file ignore is only supported in the first 10 physical lines.`);
      if (/humanizer-ign[a-z-]*/iu.test(line) && !/humanizer-ignore(?:-file)?\b/u.test(line)) ignoreWarnings.push(`Line ${index + 1}: unrecognized ignore directive; no finding was suppressed.`);
      const scoped = /humanizer-ignore[\t ]+([^\r\n]*?)(?:-->|\*\/|$)/u.exec(line);
      if (scoped && scoped[1].trim() && !/^[A-Z][A-Z0-9_]*(?:\s*,\s*[A-Z][A-Z0-9_]*)*\s*$/u.test(scoped[1].trim())) ignoreWarnings.push(`Line ${index + 1}: invalid rule scope; no finding was suppressed.`);
    }
    const active = [];
    const maskedWithIgnores = applyIgnoreDirectives(input, options, active);
    for (const [index, line] of lines.entries()) {
      if (active[index] === false && /humanizer-ignore/u.test(line)) ignoreWarnings.push(`Line ${index + 1}: ignore directive is inactive inside a fenced or ambiguous code context.`);
    }
    const masked = options.noIgnore ? stripIgnoreMarkers(source, active) : maskedWithIgnores.split(/(?<=\n)/u).map((line, index) => {
      if (!active[index] || !(/^\s*(?:[-+*]\s|\d+[.)]\s|>|\|)/u.test(line) || /\|/u.test(line))) return line;
      return line.replace(/<!--\s*humanizer-ignore(?:-file)?(?:\s+[A-Z0-9_, ]+)?\s*-->/u, (match) => match.replace(/[^\r\n]/g, ' '));
    }).join('');
    const { text: original, scopes } = scopedIgnoreDirectives(source, masked, options, active);
    const sourceLines = source.split(/(?<=\n)/u);
    const analysisLines = original.split(/(?<=\n)/u);
    for (let index = 1; index < sourceLines.length - 1; index += 1) {
      const directive = /^\s*(?:<!--[\t ]*humanizer-ignore[\t ]+[A-Z][A-Z0-9_]*(?:[\t ]*,[\t ]*[A-Z][A-Z0-9_]*)*[\t ]*-->|\/\/[\t ]*humanizer-ignore[\t ]+[A-Z][A-Z0-9_]*(?:[\t ]*,[\t ]*[A-Z][A-Z0-9_]*)*)[\t ]*\r?\n$/u;
      if (active[index - 1] && active[index] && active[index + 1] && sourceLines[index - 1].trim() && sourceLines[index + 1].trim() && directive.test(sourceLines[index])) analysisLines[index] = analysisLines[index].replace(/[\r\n]/gu, ' ');
    }
    const mapped = sanitizeMarkdownWithMap(analysisLines.join(''));
    const sanitized = mapped.text;
    const requestedLanguage = String(options.language ?? 'auto').toLowerCase();
    const initial = tokenizeText(sanitized, requestedLanguage);
    const language = requestedLanguage === 'auto' ? detectLanguage(sanitized, initial.words, rules) : requestedLanguage;
    const tokenized = language === requestedLanguage ? initial : tokenizeText(sanitized, language);
    mapSentenceOffsets(tokenized.sentences, mapped);
    return {
      source,
      ignoreWarning: ignoreWarning || ignoreWarnings.join(' '),
      ignoreWarnings,
      scopes,
      original,
      active,
      sanitized,
      language,
      rulePack: rules[language] ? language : 'universal',
      tokenized,
    };
  };

  const analyzePrepared = ({ source, ignoreWarning, ignoreWarnings, scopes, original, active, sanitized, language, rulePack, tokenized }, options, metrics) => {
    const profile = options.profile ?? defaultProfile;
    const thresholds = { ...defaultProfile.thresholds, ...(profile.thresholds ?? {}) };
    const mattrTarget = mattrThreshold(thresholds, language, tokenized);
    const targets = { cvMin: thresholds.burstinessCVLong, paragraphCvMin: 0.25, mattrMin: mattrTarget, rhythmDeltaMin: thresholds.adjacentDelta, shortSentenceRatioMin: thresholds.shortSentenceRatio, longSentenceRatioMin: thresholds.longSentenceRatio, minSentencesForStats: MIN_SENTENCES_FOR_RHYTHM, passScore: thresholds.passScore };
    const allowlist = options.noIgnore ? [] : [...(profile.allowlist ?? []), ...(options.allowlist ?? [])].map((phrase) => String(phrase).trim().toLocaleLowerCase()).filter(Boolean);
    const isAllowed = (violation) => typeof violation.match === 'string' && allowlist.includes(violation.match.toLocaleLowerCase());
    const proseInput = ['prose', 'copywriting'].includes(options.domain) || (!['code', 'ui'].includes(options.domain) && (!options.sourcePath || /\.(?:md|txt)$/iu.test(options.sourcePath)));
    const rawPatternMatches = [
      ...patternViolations(tokenized, rules[language], metrics.wordCount, original, language),
      ...(proseInput ? inconsistentQuotes(tokenized, source) : []),
      ...(proseInput ? delayedDecision(tokenized, rules[language]) : []),
      ...((!options.sourcePath || /\.md$/iu.test(options.sourcePath)) && !['code', 'ui'].includes(options.domain) ? markdownFormatting(original, active, tokenized) : []),
    ];
    const rawDomainFindings = lintDomainHygiene(original, options.sourcePath, options.domain ?? 'auto');
    const dashBaseline = Number(profile?.targets?.punctuationRates?.dash ?? profile?.metrics?.punctuationRates?.dash);
    const expectedDashes = options.profile != null && Number.isFinite(dashBaseline) && dashBaseline > 0 && round(punctuationRates(sanitized, metrics.wordCount).dash) <= dashBaseline;
    const patternMatches = expectedDashes ? rawPatternMatches.filter((finding) => finding.ruleId !== 'EN044') : rawPatternMatches;
    const domainFindings = rawDomainFindings;
    const suppressed = [];
    const allowlistApplied = [];
    const visible = (findings) => {
      const retained = findings.filter((finding) => {
      const offset = finding.charOffset?.start;
      const scope = scopes.find((item) => Number.isInteger(offset) && offset >= item.start && offset < item.end && (item.directive.scope.includes(finding.type) || item.directive.scope.includes(finding.ruleId)));
      const allowed = isAllowed(finding);
      if (!scope && !allowed) return true;
      if (allowed) allowlistApplied.push(finding.match.toLocaleLowerCase());
      const line = Number.isInteger(offset) ? source.slice(0, offset).split(/\r\n|\r|\n/u).length : null;
      suppressed.push({ ...finding, line, directive: scope?.directive ?? { kind: 'allowlist', line: null, scope: 'phrase' } });
      return false;
      });
      const counts = new Map();
      for (const finding of retained) if (finding.weakAlone) {
        const paragraph = /^Paragraph (\d+)/u.exec(finding.location ?? '')?.[1];
        if (paragraph) counts.set(paragraph, (counts.get(paragraph) ?? 0) + 1);
      }
      return retained.map((finding) => {
        if (!finding.weakAlone) return finding;
        const paragraph = /^Paragraph (\d+)/u.exec(finding.location ?? '')?.[1];
        return { ...finding, severity: paragraph && counts.get(paragraph) >= 3 ? 'error' : 'warn' };
      });
    };

    if (metrics.sentenceCount < Math.min(thresholds.minimumSentences, MIN_SENTENCES_FOR_RHYTHM)) {
      const violations = visible(withSeverity(attachSurgicalHints([
        ...patternMatches,
        ...pairedContrasts(tokenized, language, rules[language]),
        ...repeatedOpenings(tokenized),
        ...domainFindings,
      ], tokenized), tokenized, source));
      const result = {
        schemaVersion: 1,
        status: violations.some((violation) => violation.severity === 'error') ? 'FAIL' : 'SKIP',
        rhythmEvaluated: false,
        failedGates: violations.some((violation) => violation.severity === 'error') ? ['errorFinding'] : [],
        ...(ignoreWarning ? { ignoreWarning } : {}),
      ignoreWarnings,
        targets,
        suppressed,
        allowlistApplied: [...new Set(allowlistApplied)],
        score: 100 - lexicalPenalty(violations),
        language,
        rulePack,
        warning: metrics.sentenceCount >= 3 ? 'Rhythm statistics skipped: fewer than 8 sentences; only lexical, structural and domain checks ran.' : 'Text too short for statistical stylometry (< 8 sentences)',
        metrics: Object.fromEntries(Object.entries({ ...metrics, nominalizationRatio: 0, passiveRatio: 0, voiceProfileDeviation: 0 }).map(([key, value]) => [key, typeof value === 'number' ? round(value) : value])),
        violations,
      };
      result.deliveryGate = deliveryGate(result);
      return result;
    }

    const morphology = morphologyViolations(tokenized, rules[language]?.morphology);
    metrics.nominalizationRatio = morphology.nominalizationRatio;
    metrics.passiveRatio = morphology.passiveRatio;
    metrics.voiceProfileDeviation = voiceDeviation(metrics, tokenized, sanitized, profile);
    const profileTargets = profile.targets ?? profile.metrics ?? {};
    const targetMean = Number(profileTargets.meanSentenceLength);
    const meanDeviation = targetMean > 0 ? Math.abs(metrics.meanSentenceLength - targetMean) / targetMean : 0;
    const profileViolations = options.profile != null && meanDeviation > 0.3 ? [{
      type: 'VOICE_PROFILE_DEVIATION',
      location: 'Global Document',
      match: 'Mean sentence length deviates >30% from target voice profile',
      fixInstruction: 'Adjust overall sentence complexity so mean sentence length approaches the target profile.',
    }] : [];
    const violations = visible(withSeverity(attachSurgicalHints([
      ...patternMatches,
      ...pairedContrasts(tokenized, language, rules[language]),
      ...repeatedOpenings(tokenized),
      ...(metrics.sentenceCount >= MIN_SENTENCES_FOR_RHYTHM ? monotonyViolations(tokenized) : []),
      ...(metrics.sentenceCount >= MIN_SENTENCES_FOR_RHYTHM ? paragraphRhythmViolations(tokenized) : []),
      ...structuralViolations(tokenized, metrics),
      ...repetitiveNgramViolations(tokenized, rules[language]?.stopwords),
      ...rhetoricalViolations(tokenized),
      ...morphology.violations,
      ...profileViolations,
      ...statisticalViolations(metrics, thresholds, mattrTarget),
      ...domainFindings,
    ], tokenized), tokenized, source));
    const score = scoreResult(metrics, violations, thresholds, mattrTarget);
    const cvTarget = metrics.sentenceCount >= MIN_SENTENCES_FOR_RHYTHM ? thresholds.burstinessCVLong : thresholds.burstinessCVShort;
    const forbiddenTypes = new Set(['SLOP_PHRASE', 'DEFINITIONAL_OPENING', 'RHETORICAL_SLOP', 'WEAK_CTA', 'HYPERBOLIC_CLAIM', 'TAUTOLOGICAL_CODE_COMMENT', 'DECORATIVE_COMMENT_BANNER', 'LAZY_AI_PLACEHOLDER', 'MISSING_ACCESSIBLE_NAME', 'MISSING_IMG_ALT', 'HEADING_ORDER_SKIP', 'AI_GRADIENT_CLICHE', 'NON_RESPONSIVE_FIXED_WIDTH']);
    const forbidden = violations.some((violation) => violation.severity === 'error' && (forbiddenTypes.has(violation.type) || STRONG_STAGING.has(violation.type)));
    const rhythmPass = metrics.sentenceCount < MIN_SENTENCES_FOR_RHYTHM || metrics.adjacentDelta >= thresholds.adjacentDelta;
    const distributionPass = metrics.sentenceCount < MIN_SENTENCES_FOR_RHYTHM || (metrics.shortSentenceRatio >= thresholds.shortSentenceRatio && metrics.longSentenceRatio >= thresholds.longSentenceRatio);
    const status = score >= thresholds.passScore && !forbidden && (metrics.sentenceCount < MIN_SENTENCES_FOR_RHYTHM || metrics.burstinessCV >= cvTarget) && rhythmPass && distributionPass ? 'PASS' : 'FAIL';

    const failedGates = status === 'FAIL' ? [
      ...(forbidden ? ['forbiddenFinding'] : []),
      ...(score < thresholds.passScore ? ['score'] : []),
      ...(metrics.sentenceCount >= MIN_SENTENCES_FOR_RHYTHM && metrics.burstinessCV < cvTarget ? ['burstinessCV'] : []),
      ...(!rhythmPass ? ['adjacentDelta'] : []),
      ...(!distributionPass ? ['sentenceRange'] : []),
    ] : [];
    const result = {
      schemaVersion: 1,
      status,
      rhythmEvaluated: metrics.sentenceCount >= MIN_SENTENCES_FOR_RHYTHM,
      failedGates,
      ...(metrics.sentenceCount < MIN_SENTENCES_FOR_RHYTHM ? { warning: 'Rhythm statistics skipped: fewer than 8 sentences; only lexical, structural and domain checks ran.' } : {}),
      ...(ignoreWarning ? { ignoreWarning } : {}),
      ignoreWarnings,
      targets,
      suppressed,
      allowlistApplied: [...new Set(allowlistApplied)],
      score,
      language,
      rulePack,
      metrics: Object.fromEntries(Object.entries(metrics).map(([key, value]) => [key, typeof value === 'number' ? round(value) : value])),
      violations,
    };
    result.deliveryGate = deliveryGate(result);
    return result;
  };

  const collectMasked = (result, strict, prepared) => {
    const { source, original } = prepared;
    const lines = source.split(/\r\n|\r|\n/u);
    const originalLines = original.split(/\r\n|\r|\n/u);
    const fileLine = lines.findIndex((line, index) => /<!--\s*humanizer-ignore-file\s*-->/u.test(line) && originalLines[index]?.trim() === '');
    const existing = new Set(result.suppressed.map((v) => `${v.type}:${v.charOffset?.start}:${v.charOffset?.end}`));
    for (const finding of strict.violations) {
      const { start, end } = finding.charOffset ?? {};
      if (!Number.isInteger(start) || !Number.isInteger(end) || finding.sourceScope !== 'match') continue;
      if (source.slice(start, end) === original.slice(start, end)) continue;
      const key = `${finding.type}:${start}:${end}`;
      if (existing.has(key)) continue;
      const line = source.slice(0, start).split(/\r\n|\r|\n/u).length;
      const text = lines[line - 1] ?? '';
      const lineStart = start - (source.slice(0, start).split(/\r\n|\r|\n/u).at(-1)?.length ?? 0);
      const directiveOffset = text.indexOf('humanizer-ignore');
      if (directiveOffset >= 0) {
        const marker = text.lastIndexOf('<!--', directiveOffset);
        if (marker >= 0 && start >= lineStart + marker) continue;
        if (/^\s*\/\/\s*humanizer-ignore/u.test(text)) continue;
      }
      let directiveLine = fileLine >= 0 ? fileLine + 1 : line;
      if (fileLine < 0 && !/humanizer-ignore/u.test(lines[line - 1] ?? '')) {
        for (let index = line - 2; index >= 0; index -= 1) {
          if (lines[index].trim()) { if (/humanizer-ignore/u.test(lines[index])) directiveLine = index + 1; break; }
        }
      }
      result.suppressed.push({ ...finding, line, directive: { kind: fileLine >= 0 ? 'file' : 'line', line: directiveLine, scope: 'all' } });
      existing.add(key);
    }
    return result;
  };

  return {
    analyzeText(input, options = {}) {
      const prepared = prepare(input, options);
      const result = analyzePrepared(prepared, options, calculateMetrics(prepared.tokenized, prepared.sanitized));
      if (options.noIgnore || prepared.original === prepared.source) return result;
      const strictOptions = { ...options, noIgnore: true };
      const strictPrepared = prepare(input, strictOptions);
      const strict = analyzePrepared(strictPrepared, strictOptions, calculateMetrics(strictPrepared.tokenized, strictPrepared.sanitized));
      return collectMasked(result, strict, prepared);
    },
    async analyzeTextAsync(input, options = {}) {
      if (typeof calculateMetricsAsync !== 'function') return this.analyzeText(input, options);
      const prepared = prepare(input, options);
      const metrics = await calculateMetricsAsync(prepared.tokenized, prepared.sanitized);
      const result = analyzePrepared(prepared, options, metrics);
      if (options.noIgnore || prepared.original === prepared.source) return result;
      const strictOptions = { ...options, noIgnore: true };
      const strictPrepared = prepare(input, strictOptions);
      const strictMetrics = await calculateMetricsAsync(strictPrepared.tokenized, strictPrepared.sanitized);
      return collectMasked(result, analyzePrepared(strictPrepared, strictOptions, strictMetrics), prepared);
    },
  };
}
