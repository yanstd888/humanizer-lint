import { RHETORICAL_HOOKS } from './rhetorical-hooks.mjs';

import { locationFor } from './pattern-rules.mjs';

export function rhetoricalViolations(tokenized) {
  const hooks = new RegExp(`^(?:${RHETORICAL_HOOKS.join('|')})`, 'iu');
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

export function pairedContrasts(tokenized, language, pack) {
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

export function delayedDecision(tokenized, pack) {
  const sentences = tokenized.paragraphs[0]?.sentences ?? [];
  // ponytail: explicit EN/ID decision openers after 3 sentences and 45 words only; use validated discourse analysis for broader coverage.
  const openers = (pack?.editorial?.decisionOpeners ?? []).map((pattern) => new RegExp(pattern, 'iu'));
  if (!openers.length) return [];
  const index = sentences.findIndex((sentence) => openers.some((opener) => opener.test(sentence.text)));
  if (index < 3 || sentences.slice(0, index).reduce((sum, sentence) => sum + sentence.wordCount, 0) < 45) return [];
  const sentence = sentences[index];
  return [{ type: 'DELAYED_DECISION_LEAD', weakAlone: true, location: locationFor(sentence), fixInstruction: 'Consider whether the decision should appear earlier; preserve context and evidence.' }];
}

export function inconsistentQuotes(tokenized, source) {
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

export function markdownFormatting(source, active, tokenized) {
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

export function repeatedOpenings(tokenized) {
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
