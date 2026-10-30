# Stylometric Humanizer

A zero-dependency Node.js CLI and `skills.sh` skill for deterministic Indonesian and English prose linting. It measures sentence-length variation, adjacent rhythm, lexical diversity, compression ratio, repeated structure, configured slop phrases, Indonesian nominalization/passive density, and deviation from an optional voice profile.

The tool does not classify authorship. It reports whether text passes the configured style checks.

## Requirements

- Node.js 18.3 or newer
- No npm dependencies
- No network access

## Install as a skill

```sh
npx skills add yanstd888/humanizer-lint
```

For local development, use the scripts directly from this directory.

## Analyze text

File input:

```sh
node scripts/analyze.mjs --file draft.md --lang id --json
node scripts/analyze.mjs --file draft.md --lang en
node scripts/analyze.mjs --file draft.md --lang auto
```

Stdin input:

```sh
cat draft.md | node scripts/analyze.mjs --stdin --lang auto --json
```

Custom voice profile:

```sh
node scripts/analyze.mjs --file draft.md --lang auto --profile profiles/custom-voice.json --json
```

Exit codes:

| Code | Meaning |
|---:|---|
| 0 | `PASS` or short-text `SKIP` |
| 1 | Valid analysis with `FAIL` |
| 2 | CLI, file, or profile error |

## Build a voice profile

The fingerprint command accepts one text file or a directory containing up to five `.txt` or `.md` files:

```sh
node scripts/fingerprint.mjs \
  --input samples \
  --output profiles/custom-voice.json \
  --name my-voice \
  --lang auto
```

The output records average sentence length, standard deviation, burstiness CV, adjacent rhythm delta, MATTR, paragraph size, and punctuation rates. The analyzer reports relative `voiceProfileDeviation` when that profile is supplied. Profile deviation is diagnostic and does not change the pass score.

## Checks

### Sanitization

Before analysis, the CLI:

- removes YAML frontmatter, fenced code blocks, Markdown tables, and headings;
- replaces inline code and URLs with `TOKEN_ENTITY`;
- removes list fragments while retaining complete list-item sentences;
- preserves paragraph boundaries for diagnostics.

### Statistical metrics

- Burstiness coefficient of variation: `standard deviation / mean sentence length`.
- Adjacent rhythm delta: mean absolute difference between consecutive sentence lengths.
- Adaptive MATTR: type-token ratio over an adaptive 10 to 50 word window.
- Compression ratio: raw DEFLATE byte length divided by original UTF-8 byte length.
- Short sentence ratio: sentences with 6 words or fewer.
- Long sentence ratio: sentences with 26 words or more.

Texts below 20 words or 3 sentences return `SKIP`; lexical phrase checks still run.

### Structural diagnostics

- Three-sentence monotony windows.
- Three consecutive paragraphs with equal sentence counts.
- Three or more identical sentence starters in one paragraph.
- Low compression ratio for texts of at least 150 words.

### Language rules

`rules/id-slop.json` contains Indonesian lexical, definitional, nominalization, passive, whitelist, and loanword rules. `rules/en-slop.json` contains English lexical and structural patterns. Both rule files contain more than 40 patterns and are plain JSON for reviewability.

## Scoring

The score starts at 100:

- burstiness: up to 25 points deducted;
- monotony windows: up to 20;
- lexical and structural clichés: up to 30;
- Indonesian nominalization/passive density: up to 15;
- vocabulary and entropy checks: up to 10.

A normal-length text passes only when:

- score is at least 80;
- no `SLOP_PHRASE` or `DEFINITIONAL_OPENING` remains;
- burstiness meets the sample-size threshold;
- adjacent rhythm delta is at least 4;
- texts with at least 8 sentences contain at least 15% short sentences and 10% long sentences.

## JSON output

```json
{
  "status": "FAIL",
  "score": 68,
  "language": "id",
  "metrics": {
    "wordCount": 240,
    "sentenceCount": 12,
    "burstinessCV": 0.21,
    "adjacentDelta": 2.4,
    "mattr": 0.76,
    "voiceProfileDeviation": 0.31
  },
  "violations": [
    {
      "type": "MONOTONOUS_RHYTHM",
      "location": "Paragraph 2, Sentences 4-6",
      "fixInstruction": "Sentence lengths are uniform. Split one sentence or merge two where the meaning supports it."
    }
  ]
}
```

## Test

```sh
npm test
```

The suite covers sanitizer behavior, abbreviation protection, formulas, short text, whitelists, AI and human fixtures, CLI exit codes, voice profile output, allowed imports, and forbidden API scans.

## Security properties

Production scripts import only approved Node.js built-ins:

- `node:fs`
- `node:path`
- `node:zlib`
- `node:util`

The scripts do not use `fetch`, `eval`, `Function`, or `child_process`. They do not execute shell commands. Fingerprint output is written through a temporary file and renamed into place.

## Project layout

```text
SKILL.md
package.json
README.md
scripts/
  analyze.mjs
  fingerprint.mjs
  utils/
    sanitizer.mjs
    tokenizer.mjs
    metrics.mjs
rules/
  id-slop.json
  en-slop.json
profiles/
  default-human.json
tests/
  fixtures/
  test-runner.mjs
```

## Limitations

- Passing does not prove that a human wrote the text.
- Fixed thresholds can misread intentionally uniform technical or legal prose.
- Automatic language detection supports Indonesian and English only.
- The analyzer does not verify factual accuracy or semantic equivalence after rewriting; the calling agent must preserve source meaning.
