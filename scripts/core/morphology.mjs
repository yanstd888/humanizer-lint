import { suggestedReplacement } from './pattern-rules.mjs';

function round(value, places = 4) {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}

export function morphologyViolations(tokenized, pack) {
  const morphology = pack?.morphology;
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
  const replacements = pack?.editorial?.replacements ?? [];

  if (nominalizationRatio > morphology.nominalizationMaxRatio) {
    violations.push({
      type: 'EXCESSIVE_NOMINALIZATION',
      location: 'Whole text',
      ratio: round(nominalizationRatio),
      matches: [...new Set(nominalizations)],
      fixInstruction: 'Replace abstract nominalizations with concrete actors and verbs.',
      suggestedReplacement: suggestedReplacement('EXCESSIVE_NOMINALIZATION', '', nominalizations, replacements),
    });
  }
  if (passiveRatio > morphology.passiveMaxRatio) {
    violations.push({
      type: 'PASSIVE_BLOATING',
      location: 'Whole text',
      ratio: round(passiveRatio),
      matches: [...new Set(passives)],
      fixInstruction: 'Name the actor and use an active verb where the actor is known.',
      suggestedReplacement: suggestedReplacement('PASSIVE_BLOATING', '', passives, replacements),
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
