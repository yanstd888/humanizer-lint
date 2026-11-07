import { morphologyViolations } from './morphology.mjs';
import { rhetoricalViolations, pairedContrasts, delayedDecision, inconsistentQuotes, markdownFormatting, repeatedOpenings } from './markdown-findings.mjs';
import { mapSentenceOffsets, suggestedReplacement, patternViolations } from './pattern-rules.mjs';
import { STRONG_STAGING, voiceDeviation, lexicalPenalty, scoreResult, withSeverity, deliveryGate } from './scoring.mjs';
import { monotonyViolations, paragraphRhythmViolations, repetitiveNgramViolations, structuralViolations, statisticalViolations } from './rhythm-checks.mjs';
import { ambiguousTemplateSource, applyIgnoreDirectives, stripIgnoreMarkers, scopedIgnoreDirectives } from './ignore-directives.mjs';
import { detectLanguage, mattrThreshold } from './language.mjs';
import {
  DEFAULT_SPLIT_CONNECTIVES,
} from './editorial-fallbacks.mjs';

const parentDirectory = '..';
const utilityModule = (...segments) => new URL([parentDirectory, 'utils', ...segments].join('/'), import.meta.url);
const { sanitizeMarkdownWithMap } = await import(utilityModule('sanitizer.mjs'));
const { punctuationRates, MIN_SENTENCES_FOR_RHYTHM } = await import(utilityModule('metrics-core.mjs'));
const { tokenizeText } = await import(utilityModule('tokenizer.mjs'));
const { lintDomainHygiene } = await import(utilityModule('domain-linters.mjs'));

const SPLIT_CONNECTIVES_REGEX = new RegExp(`\\b(?:${DEFAULT_SPLIT_CONNECTIVES.join('|')})\\b|[;,]`, 'giu');

function round(value, places = 4) {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}

function splitSuggestion(sentence) {
  if (!sentence || sentence.wordCount < 16) return undefined;
  const candidates = [...sentence.text.matchAll(SPLIT_CONNECTIVES_REGEX)];
  if (!candidates.length) return undefined;
  const middle = sentence.text.length / 2;
  const best = candidates.sort((left, right) => Math.abs(left.index - middle) - Math.abs(right.index - middle))[0];
  return `Consider splitting near “${best[0]}” if both resulting sentences remain complete.`;
}

function attachSurgicalHints(violations, tokenized, replacements = []) {
  return violations.map((violation) => {
    const sentenceMatch = /Sentence (\d+)/u.exec(violation.location ?? '');
    const rangeMatch = /Sentences (\d+)-(\d+)/u.exec(violation.location ?? '');
    const sentence = sentenceMatch
      ? tokenized.sentences.find((item) => item.sentenceIndex === Number(sentenceMatch[1]))
      : rangeMatch
        ? tokenized.sentences.find((item) => item.sentenceIndex >= Number(rangeMatch[1]) && item.sentenceIndex <= Number(rangeMatch[2]) && item.wordCount >= 16)
        : undefined;
    const replacement = violation.suggestedReplacement ?? suggestedReplacement(violation.type, violation.match, violation.matches, replacements);
    const split = splitSuggestion(sentence);
    return {
      ...violation,
      ...(replacement ? { suggestedReplacement: replacement } : {}),
      ...(split ? { splitSuggestion: split } : {}),
    };
  });
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
      ], tokenized, rules[language]?.editorial?.replacements), tokenized, source));
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

    const morphology = morphologyViolations(tokenized, rules[language]);
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
    ], tokenized, rules[language]?.editorial?.replacements), tokenized, source));
    const score = scoreResult(metrics, violations, thresholds, mattrTarget);
    const cvTarget = metrics.sentenceCount >= MIN_SENTENCES_FOR_RHYTHM ? thresholds.burstinessCVLong : thresholds.burstinessCVShort;
    const forbiddenTypes = new Set(['SLOP_PHRASE', 'DEFINITIONAL_OPENING', 'RHETORICAL_SLOP', 'WEAK_CTA', 'HYPERBOLIC_CLAIM', 'TAUTOLOGICAL_CODE_COMMENT', 'DECORATIVE_COMMENT_BANNER', 'LAZY_AI_PLACEHOLDER', 'MISSING_ACCESSIBLE_NAME', 'MISSING_IMG_ALT', 'HEADING_ORDER_SKIP', 'AI_GRADIENT_CLICHE', 'NON_RESPONSIVE_FIXED_WIDTH']);
    const forbidden = violations.some((violation) => violation.severity === 'error' && (forbiddenTypes.has(violation.type) || STRONG_STAGING.has(violation.type)));
    const rhythmPass = metrics.sentenceCount < MIN_SENTENCES_FOR_RHYTHM || metrics.adjacentDelta >= thresholds.adjacentDelta;
    // ponytail: exploratory cutoff may miss adversarial short-sentence text; validate on fresh holdout.
    const maxSentenceWords = tokenized.sentences.reduce((max, sentence) => Math.max(max, sentence.wordCount), 0);
    const distributionPass = metrics.sentenceCount < MIN_SENTENCES_FOR_RHYTHM || (metrics.shortSentenceRatio >= thresholds.shortSentenceRatio && (metrics.longSentenceRatio >= thresholds.longSentenceRatio || maxSentenceWords < 18));
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
