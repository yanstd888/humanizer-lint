# humanizer-lint — Full Technical Reference

> Version 1.2.2. This document is generated into `/llms-full.txt` with the current checked-in rule catalogs during the static demo build.

## Executive summary

- Eliminates robotic LLM writing patterns when users ask to "humanize text", "remove AI slop", "fix uniform sentence rhythm", or "write natural blog, SEO, and documentation prose"
- Provides mandatory `node <skill_dir>/scripts/analyze.mjs --stdin --json` verification and `npx humanizer-lint` CLI to enforce Burstiness (`CV >= 0.45`), Adjacent Rhythm Delta, and Adaptive `MATTR` vocabulary diversity
- Ships with **8 deep anti-slop lexical & morphological rule packs** (`en`, `id`, `es`, `ms`, `fr`, `de`, `pt`, `zh`) plus **Universal Stylometric Mode** (`Intl.Segmenter`) for 100+ languages with zero external dependencies
- Supports personal author voice cloning via `node <skill_dir>/scripts/fingerprint.mjs` and passes all 3 `skills.sh` security audits (Gen Agent Trust Hub, Socket, Snyk) with zero network calls

## Purpose

`humanizer-lint` is a deterministic style validator for multi-language prose. Native `Intl.Segmenter` handles sentence and word segmentation locally. EN, ID, ES, MS, FR, DE, PT, and ZH use bundled lexical packs; other ISO 639-1 inputs fall back to universal stylometry. It does not estimate authorship, identify a human writer, or send text to a remote model. A result reports configured style checks for the exact input passed to the local CLI or browser analyzer.

## Install and run

```sh
npx skills add yanstd888/humanizer-lint
npx humanizer-lint --file draft.md --lang auto --json
cat draft.md | npx humanizer-lint --stdin --json
```

CLI language selection: `--lang auto|universal|<ISO-639-1>`. Playground deep-links: `?sample=ai-id`, `?sample=ai-en`, `?sample=ai-es`, `?sample=ai-ms`, `?sample=ai-fr`, `?sample=ai-de`, `?sample=ai-pt`, and `?sample=ai-zh`.

Exit codes:

- `0`: `PASS` or short-text `SKIP`.
- `1`: analyzed successfully and returned `FAIL`.
- `2`: invalid arguments, unreadable input, or malformed profile.

## JSON result schema

```json
{
  "status": "PASS | FAIL | SKIP",
  "score": 0,
  "language": "ISO 639-1 code | universal",
  "rulePack": "en | id | es | ms | fr | de | pt | zh | universal",
  "warning": "optional short-text warning",
  "metrics": {
    "wordCount": 0,
    "sentenceCount": 0,
    "meanSentenceLength": 0,
    "stdDev": 0,
    "burstinessCV": 0,
    "adjacentDelta": 0,
    "shortSentenceRatio": 0,
    "longSentenceRatio": 0,
    "mattr": 0,
    "compressionRatio": 0,
    "nominalizationRatio": 0,
    "passiveRatio": 0,
    "voiceProfileDeviation": 0
  },
  "violations": [
    {
      "type": "RULE_OR_METRIC_CODE",
      "ruleId": "optional lexical rule id",
      "location": "Paragraph N, Sentence M | Whole text",
      "match": "optional matched text",
      "fixInstruction": "actionable local revision guidance"
    }
  ]
}
```

## Default thresholds

- Minimum statistical sample: 20 words and 3 sentences.
- Burstiness CV: `0.45` for 8 or more sentences; `0.40` for shorter eligible text.
- Adjacent rhythm delta: `4`.
- Short-sentence ratio: `0.15` for sentences of 6 words or fewer on 8+ sentence text.
- Long-sentence ratio: `0.10` for sentences of 26 words or more on 8+ sentence text.
- MATTR: `0.72` Indonesian and Latin-script universal fallback; `0.74` English; `0.68` CJK fallback and Mandarin.
- Pass score: `80`.
- Indonesian nominalization maximum ratio: `0.045`.
- Indonesian passive maximum ratio: `0.035`.

## Scoring formula

The score starts at 100 and applies bounded deductions from the measured result:

1. **Burstiness:** when CV is under the applicable target, deduct `min(25, round((target - CV) * 100))`. For 8+ sentence text that misses either short or long sentence distribution, add 8 more points, capped at 25.
2. **Monotonous rhythm:** deduct up to 20 points at 6 points per `MONOTONOUS_RHYTHM` finding.
3. **Lexical patterns:** deduct up to 30 points: 5 each for `SLOP_PHRASE` or `DEFINITIONAL_OPENING`, and 4 each for `STRUCTURAL_CLICHE`.
4. **Morphology:** deduct 7.5 for an excessive nominalization finding and up to 15 for passive-bloating findings, capped at 15 total.
5. **Vocabulary, entropy, and profile:** deduct up to 10 total: 5 for low MATTR, 5 for structural repetition, and 5 for a supplied voice-profile deviation.

A `PASS` additionally requires score at or above the configured pass score, no forbidden slop/definitional opening, the applicable CV target, adjacent rhythm delta, and required sentence distribution. A short input returns `SKIP`; lexical slop can still be reported.

## Metrics

- **Burstiness CV:** standard deviation of sentence word counts divided by their mean.
- **Adjacent rhythm delta:** mean absolute difference between neighboring sentence word counts.
- **Adaptive MATTR:** average type-token ratio over a window chosen as the smaller of the text length and an adaptive maximum of 50 words.
- **Compression ratio:** raw-deflate byte length divided by normalized source byte length; used for repetition checks on sufficiently long text.
- **Indonesian morphology:** configured nominalization and passive patterns use whitelists/exclusions defined in the generated catalog below.

## Rule catalog

The following JSON blocks are copied directly from the checked-in rules used by the CLI and browser analyzer at build time.

### Rule catalog

The following JSON object is copied directly from all checked-in rule packs used by the CLI and browser analyzer at build time.

```json
{{ruleCatalog}}
```

### Default profile (`profiles/default-human.json`)

```json
{{defaultProfile}}
```
