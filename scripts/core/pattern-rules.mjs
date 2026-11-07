import { DEFAULT_FALLBACK_REPLACEMENTS, DEFAULT_ATTRIBUTION_BYPASS } from './editorial-fallbacks.mjs';

export function locationFor(sentence) {
  return `Paragraph ${sentence.paragraphIndex}, Sentence ${sentence.sentenceIndex}`;
}

export function regexFor(pattern) {
  return new RegExp(pattern, 'giu');
}

export function mapSentenceOffsets(sentences, sanitized) {
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

export function suggestedReplacement(type, match, matches = [], replacements = []) {
  const value = String(match ?? matches[0] ?? '').toLowerCase();
  const found = replacements.find(({ pattern }) => new RegExp(pattern, 'iu').test(value));
  if (found) return found.replacement;
  return Object.hasOwn(DEFAULT_FALLBACK_REPLACEMENTS, type) ? DEFAULT_FALLBACK_REPLACEMENTS[type] : undefined;
}

export function patternViolations(tokenized, rules, wordCount, original, language) {
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
      if (rule.type === 'BORROWED_AUTHORITY' && DEFAULT_ATTRIBUTION_BYPASS.test(sentence.text)) continue;
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
        suggestedReplacement: suggestedReplacement(rule.type, candidate.match, [], rules?.editorial?.replacements ?? []),
      });
    }
  }
  return violations;
}
