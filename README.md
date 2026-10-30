<div align="center">

# humanizer-lint

### Deterministic prose and Markdown style linting for Indonesian and English

Detect repetitive LLM phrasing, uniform sentence rhythm, structural clichés, and voice-profile drift without sending text to an external service.

[![GitHub Release](https://img.shields.io/github/v/release/yanstd888/humanizer-lint?style=flat-square&logo=github)](https://github.com/yanstd888/humanizer-lint/releases)
[![npm](https://img.shields.io/npm/v/humanizer-lint)](https://www.npmjs.com/package/humanizer-lint)
[![CI](https://img.shields.io/github/actions/workflow/status/yanstd888/humanizer-lint/ci.yml?branch=main&style=flat-square&label=CI)](https://github.com/yanstd888/humanizer-lint/actions/workflows/ci.yml)
[![License](https://img.shields.io/github/license/yanstd888/humanizer-lint?style=flat-square)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18.3-339933?style=flat-square&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![skills.sh](https://skills.sh/b/yanstd888/humanizer-lint)](https://skills.sh/yanstd888/humanizer-lint)
[![GitHub Stars](https://img.shields.io/github/stars/yanstd888/humanizer-lint?style=flat-square)](https://github.com/yanstd888/humanizer-lint/stargazers)

[What it does](#what-it-does) | [Install](#install) | [Quick start](#quick-start) | [CLI reference](#cli-reference) | [Detectors](#detectors-and-violation-types) | [Agent skill](#use-as-an-agent-skill) | [FAQ](#frequently-asked-questions)

</div>

**humanizer-lint is an open-source natural-text and Markdown prose linter that deterministically identifies style patterns often associated with AI-generated writing in Indonesian and English; it is a style validator, not an authorship detector.**

Try the static browser demo: [humanizer-lint.pages.dev](https://humanizer-lint.pages.dev).

It works locally with zero runtime dependencies. Instead of rewriting text through another language model, it reports paragraph- and sentence-level violations with specific correction instructions. Use it to lint LLM-generated documentation, remove robotic AI phrasing from Markdown, check burstiness and lexical diversity, or add a deterministic prose gate to an agent workflow.

It can serve as a CLI text humanizer guardrail, automated writing style linter, or CI/CD documentation linter. The bundled rules flag overused AI clichés such as `delve` and `tapestry` without rewriting the source.

## What it does

`humanizer-lint` analyzes prose after removing or neutralizing common non-prose Markdown structures. It then combines lexical rules, sentence-length statistics, structural checks, Indonesian morphology checks, and an optional voice profile into a score from 0 to 100.

The project includes:

- 86 reviewable lexical and structural regex rules: 42 Indonesian and 44 English.
- Sentence-length burstiness, adjacent rhythm delta, short/long sentence ratios, and adaptive MATTR.
- Repetition checks based on paragraph symmetry, repeated sentence starters, and compression ratio.
- Indonesian nominalization, passive-voice, loanword, and translation-style opening checks.
- Optional voice profiles generated from one to five writing samples.
- Human-readable terminal output and pure JSON output.
- Standard exit codes for agents, scripts, and CI jobs.

It does not estimate perplexity, classify who wrote the text, rewrite prose automatically, scan directories, or provide SARIF output.

## Terminal demo

Given this input:

```text
In today's fast-paced world, teams delve into a robust landscape. Moreover, this pivotal approach fosters seamless collaboration across every project. In conclusion, the solution unlocks valuable insights for everyone.
```

Run the analyzer:

```sh
humanizer-lint --file draft.md --lang en
```

The current CLI reports:

```text
Status: FAIL
Score: 39
Language: en

Metrics:
  wordCount: 29
  sentenceCount: 3
  meanSentenceLength: 9.6667
  stdDev: 0.4714
  burstinessCV: 0.0488
  adjacentDelta: 0.5
  shortSentenceRatio: 0
  longSentenceRatio: 0
  mattr: 1
  compressionRatio: 0.6972
  nominalizationRatio: 0
  passiveRatio: 0
  voiceProfileDeviation: 0.5319

Violations:
  SLOP_PHRASE | Paragraph 1, Sentence 1 | Name the exact action or subject instead.
  SLOP_PHRASE | Paragraph 1, Sentence 2 | Describe the actual consequence without inflated significance.
  SLOP_PHRASE | Paragraph 1, Sentence 2 | Name the concrete behavior or outcome.
  SLOP_PHRASE | Paragraph 1, Sentence 1 | Name the field or conditions directly.
  SLOP_PHRASE | Paragraph 1, Sentence 3 | Name what becomes possible and how.
  SLOP_PHRASE | Paragraph 1, Sentence 2 | Connect the sentences by their actual relationship.
  SLOP_PHRASE | Paragraph 1, Sentence 3 | End on the final concrete point.
  SLOP_PHRASE | Paragraph 1, Sentence 1 | Name the current condition precisely.
  SLOP_PHRASE | Paragraph 1, Sentence 2 | Describe the missing step, delay, or transition precisely.
  SLOP_PHRASE | Paragraph 1, Sentence 1 | Name the failure mode or capacity the system handles.
  SLOP_PHRASE | Paragraph 1, Sentence 3 | State the finding itself.
  MONOTONOUS_RHYTHM | Paragraph 1, Sentences 1-3 | Sentence lengths are uniform (10, 10, 9 words). Split one sentence into a short statement or merge two into a longer clause.
  LOW_BURSTINESS | Whole text | Vary sentence lengths by splitting one uniform sentence and merging another where the meaning supports it.
  LOW_ADJACENT_DELTA | Whole text | Change neighboring sentence lengths by splitting or merging only where the content allows it.
```

A failed analysis exits with code `1`. A passing fixture returns:

```text
Status: PASS
Score: 100
Language: en
```

and exits with code `0`.

## Why humanizer-lint

Many AI humanizer services send text to another model and return a rewritten version. That can alter facts, quotations, formatting, or technical meaning. `humanizer-lint` takes the smaller and more predictable approach: it identifies the prose that needs attention and leaves the edit under your control.

| Capability | humanizer-lint | Web rewriting service | General grammar checker |
|---|---|---|---|
| Detects configured LLM clichés | Yes, with rule IDs and locations | Usually rewrites them | Usually not |
| Measures sentence rhythm | Yes | Usually not exposed | Limited |
| Preserves source text | Yes, analysis only | No, returns a rewrite | Depends on product |
| Handles common Markdown structures | Yes, through deterministic sanitization | Product-dependent | Product-dependent |
| Runs offline after installation | Yes | Usually no | Product-dependent |
| Supports Indonesian and English lexical rules | Yes | Product-dependent | Product-dependent |
| Produces JSON | Yes | Product-dependent | Product-dependent |
| Proves human authorship | No | No | No |

If you are looking for an AI writing detector linter, a ChatGPT tone remover CLI, or an open-source alternative to AI humanizers, note the boundary: this tool detects configured style signals and rhythm problems. It does not claim to determine whether a human or model wrote the text.

## Install

### CLI

Run the published CLI without a global install:

```sh
npx humanizer-lint --file tulisan.md --lang id
```

Or install it globally:

```sh
npm install -g humanizer-lint
```

### Install as an agent skill

The recommended installation for coding agents is through the skills CLI:

```sh
npx skills add yanstd888/humanizer-lint --skill humanizer-lint
```

The public listing, installation command, and install count are available on [skills.sh](https://skills.sh/yanstd888/humanizer-lint).

### Development (from source)

Clone the repository and use `npm link` only when developing the local source:

```sh
git clone https://github.com/yanstd888/humanizer-lint.git
cd humanizer-lint
npm test
npm link
humanizer-lint --help
humanizer-fingerprint --help
```

No dependency installation or build step is required.

## Quick start

Analyze one file:

```sh
humanizer-lint --file draft.md --lang auto
```

Return machine-readable JSON:

```sh
humanizer-lint --file draft.md --lang id --json
```

Analyze stdin without creating a temporary file:

```sh
cat draft.md | humanizer-lint --stdin --lang auto --json
```

Use a custom voice profile:

```sh
humanizer-lint --file draft.md --lang en --profile profiles/custom-voice.json --json
```

Without `npm link`, replace `humanizer-lint` with `node scripts/analyze.mjs` and replace `humanizer-fingerprint` with `node scripts/fingerprint.mjs`.

## Contoh / Example

Skor mengukur kecocokan dengan sinyal gaya yang diperiksa oleh linter: skor lebih tinggi berarti lebih sedikit pelanggaran yang ditemukan. Ini bukan skor probabilitas penulis AI atau manusia.

### Before

```text
Di era digital saat ini, penggunaan teknologi menjadi sangat penting bagi setiap bisnis. Tidak hanya itu, solusi ini juga memberikan manfaat yang sangat besar bagi semua pihak. Dengan demikian, organisasi dapat meningkatkan efisiensi secara signifikan dalam berbagai aspek. Pada akhirnya, pendekatan ini membuka peluang baru yang lebih optimal bagi masa depan.
```

Output dari `tests/fixtures/ai-before-id.md`:

```text
Status: FAIL
Score: 38
Language: id

Violations:
  SLOP_PHRASE | Paragraph 1, Sentence 1 | Mulai langsung dari subjek atau fakta konkret.
  SLOP_PHRASE | Paragraph 1, Sentence 3 | Sebutkan aspek yang relevan.
  SLOP_PHRASE | Paragraph 1, Sentence 4 | Tutup langsung dengan akibat atau keputusan akhir.
  MONOTONOUS_RHYTHM | Paragraph 1, Sentences 1-3 | Sentence lengths are uniform (13, 14, 11 words).
  LOW_BURSTINESS | Whole text | Vary sentence lengths by splitting one uniform sentence and merging another where the meaning supports it.
  LOW_ADJACENT_DELTA | Whole text | Change neighboring sentence lengths by splitting or merging only where the content allows it.
```

### After

```text
Pemilik toko memakai aplikasi stok untuk melihat barang yang habis pada hari yang sama. Semua melihat angka yang sama. Saat satu produk menipis, petugas memesan ulang sebelum rak kosong dan mencatat alasan setiap perubahan. Laporan harian menunjukkan barang mana yang laku, barang mana yang tertahan, dan kapan petugas harus menghubungi pemasok lagi agar toko tidak kehabisan barang yang dicari pelanggan. Pemilik toko kini membeli barang berdasarkan catatan, bukan tebakan.
```

Output dari `tests/fixtures/human-after-id.md`:

```text
Status: PASS
Score: 100
Language: id
```

Untuk contoh ini, skor naik dari **38** menjadi **100** setelah frasa template dihilangkan, subjek dibuat konkret, dan panjang kalimat divariasikan.

## CLI reference

### Analyzer

```text
humanizer-lint (--file <path> | --stdin) [--lang id|en|auto] [--profile <path>] [--json]
```

| Option | Required | Description |
|---|---:|---|
| `--file <path>` | One input required | Read one UTF-8 text or Markdown file. |
| `--stdin` | One input required | Read the complete document from standard input. |
| `--lang id|en|auto` | No | Select Indonesian, English, or function-word auto-detection. Default: `auto`. |
| `--profile <path>` | No | Load a JSON voice profile. |
| `--json` | No | Print JSON only. Without it, print the terminal report. |
| `--help` | No | Print command usage. |

Exactly one of `--file` or `--stdin` is required.

### Voice fingerprint

```text
humanizer-fingerprint --input <file-or-dir> --output <profile.json> [--name <name>] [--lang id|en|auto]
```

| Option | Required | Description |
|---|---:|---|
| `--input <path>` | Yes | Read one file or up to five `.md` and `.txt` files from one directory. |
| `--output <path>` | Yes | Write the generated profile atomically. |
| `--name <name>` | No | Set the profile name. Default: `custom-voice`. |
| `--lang id|en|auto` | No | Record the intended language. Default: `auto`. |
| `--help` | No | Print command usage. |

### Exit codes

| Code | Meaning |
|---:|---|
| `0` | `PASS`, or `SKIP` for text too short for statistical scoring. |
| `1` | Analysis completed and returned `FAIL`. |
| `2` | Invalid arguments, unreadable input, or malformed profile. |

## Detectors and violation types

The JSON rule catalogs contain stable IDs. Runtime statistical checks use named violation types.

| Violation type or rule range | Language | What it detects |
|---|---|---|
| `ID001`-`ID040`, `EN001`-`EN040` / `SLOP_PHRASE` | Indonesian and English | Configured clichés, generic transitions, inflated wording, and repeated LLM vocabulary such as `delve`, `tapestry`, `testament`, and their Indonesian equivalents. |
| `ID041`-`ID042` / `DEFINITIONAL_OPENING` | Indonesian | Formulaic paragraph openings and rigid definition templates. |
| `EN041`-`EN044` / `STRUCTURAL_CLICHE` | English | Participial tails, binary formulas, repeated double-hyphens, and similar structural templates. |
| `MONOTONOUS_RHYTHM` | Both | Three adjacent sentences whose lengths differ by at most three words. |
| `LOW_BURSTINESS` | Both | Sentence-length coefficient of variation below the configured threshold. |
| `MISSING_SENTENCE_RANGE` | Both | Text with at least eight sentences that lacks enough short or long sentences. |
| `LOW_ADJACENT_DELTA` | Both | Consecutive sentence lengths that change too little. |
| `LOW_LEXICAL_DIVERSITY` | Both | Adaptive MATTR below the language threshold. |
| `LOW_ENTROPY_REPETITION` | Both | Low DEFLATE compression ratio in text of at least 150 words. |
| `SYMMETRIC_PARAGRAPHS` | Both | Three consecutive paragraphs with the same sentence count. |
| `REPETITIVE_STARTERS` | Both | A paragraph with at least three sentences beginning with the same token. |
| `EXCESSIVE_NOMINALIZATION` | Indonesian | Nominalization density above the configured threshold after whitelist filtering. |
| `PASSIVE_BLOATING` | Indonesian | Passive morphology density or consecutive translation-style subordinate openings. |
| `VOICE_PROFILE_DEVIATION` | Both | Custom-profile mean sentence length that differs from the target by more than 30 percent. |

## Metrics and scoring

| Metric | Definition |
|---|---|
| `burstinessCV` | Population standard deviation divided by mean sentence length. |
| `adjacentDelta` | Mean absolute difference between neighboring sentence lengths. |
| `mattr` | Moving-average type-token ratio over an adaptive 10- to 50-token window. |
| `compressionRatio` | Raw DEFLATE byte length divided by original UTF-8 byte length. |
| `shortSentenceRatio` | Share of sentences containing six words or fewer. |
| `longSentenceRatio` | Share of sentences containing 26 words or more. |
| `voiceProfileDeviation` | Mean relative deviation from available profile targets. It is not an authorship probability. |

The score starts at 100 and applies these caps:

| Category | Maximum deduction |
|---|---:|
| Burstiness and sentence-range checks | 25 |
| Monotonous rhythm windows | 20 |
| Lexical and structural clichés | 30 |
| Indonesian morphology | 15 |
| Vocabulary, entropy, and custom-profile deviation combined | 10 |

A normal-length document passes only when the score is at least 80, no `SLOP_PHRASE` or `DEFINITIONAL_OPENING` remains, burstiness and adjacent-delta gates pass, and the sentence-range requirement passes when applicable.

Documents below 20 words or three sentences return `SKIP`. Lexical slop phrases are still reported.

## Markdown sanitization

Before tokenization, the analyzer:

- removes YAML frontmatter, fenced code blocks, headings, and Markdown tables;
- keeps Markdown link anchor text while removing the URL;
- replaces inline code and bare URLs with `TOKEN_ENTITY`;
- removes short or unfinished list fragments while keeping complete list prose;
- removes blockquote markers while preserving the quoted prose;
- preserves paragraph boundaries for locations and structural checks.

This is deterministic sanitization, not a full Markdown or MDX abstract syntax tree parser. HTML blocks and arbitrary MDX components do not receive special parsing.

## Voice profiles

Generate a profile from one to five samples:

```sh
humanizer-fingerprint \
  --input writing-samples \
  --output profiles/custom-voice.json \
  --name editorial-voice \
  --lang en
```

The profile records mean sentence length, standard deviation, burstiness, adjacent delta, MATTR, average paragraph sentence count, and punctuation rates. Supplying it with `--profile` adds `voiceProfileDeviation`; a mean sentence-length drift above 30 percent creates a five-point profile penalty inside the 10-point vocabulary and entropy cap.

## JSON output

`--json` writes a single JSON object to stdout. The stable top-level fields are:

```json
{
  "status": "FAIL",
  "score": 39,
  "language": "en",
  "metrics": {
    "wordCount": 29,
    "sentenceCount": 3,
    "burstinessCV": 0.0488,
    "adjacentDelta": 0.5,
    "mattr": 1
  },
  "violations": [
    {
      "type": "LOW_BURSTINESS",
      "location": "Whole text",
      "actual": 0.0488,
      "target": 0.4,
      "fixInstruction": "Vary sentence lengths by splitting one uniform sentence and merging another where the meaning supports it."
    }
  ]
}
```

The real result may contain additional metric properties and violations.

## Use as an agent skill

After installation, an agent can use the skill as a closed verification loop:

1. Draft or edit Indonesian or English prose without changing supported facts.
2. Run the analyzer against the exact complete draft.
3. Read every violation and edit only the affected prose or named whole-document gate.
4. Re-run the analyzer, stopping after three iterations.
5. Return only a `PASS`, or an honestly labeled short-text `SKIP` with no unresolved lexical violations.

The skill is indexed on skills.sh and its current listing passes the platform's Snyk security audit.

## Used by

The skills.sh badge at the top of this README is the public source for anonymous installation activity. GitHub's native `Used by` sidebar is generated automatically from its dependency graph; repository owners cannot set that count manually.

Because the CLI is not published to npm, skill installations are represented by skills.sh rather than GitHub package dependents. The GitHub panel will appear when downstream repositories declare a dependency that GitHub can detect.

## CI and repository automation

This repository keeps `.github` intentionally small. The included `.github/workflows/ci.yml` workflow runs the test suite and package dry-run on supported Node.js versions. A CI badge is useful because it reflects an actual workflow; issue templates, Dependabot, and release automation are omitted until the repository needs them.

To use the analyzer in another GitHub Actions workflow without an npm release, check out this repository into a subdirectory and run the script directly:

```yaml
name: prose-check

on:
  pull_request:
    paths:
      - "**/*.md"
      - "**/*.txt"

jobs:
  lint-readme:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/checkout@v4
        with:
          repository: yanstd888/humanizer-lint
          path: .humanizer-lint
      - uses: actions/setup-node@v4
        with:
          node-version: "22"
      - run: node .humanizer-lint/scripts/analyze.mjs --file README.md --lang auto --json
```

The analyzer accepts one file per invocation. Invoke it once for each document you want to gate.

## Security properties

Production scripts use only Node.js built-ins and have no runtime dependencies. The test suite rejects production use of `child_process`, `eval`, dynamic `Function` construction, and `fetch`. The fingerprint writer writes to a temporary file and renames it into place.

Text remains local unless the surrounding agent or workflow sends it elsewhere.

## Frequently asked questions

<details>
<summary><strong>Is humanizer-lint an AI content detector?</strong></summary>

No. It detects configured lexical, structural, rhythm, and morphology signals. A pass or failure does not prove who wrote the text.

</details>

<details>
<summary><strong>Does humanizer-lint rewrite or auto-fix prose?</strong></summary>

No. It returns correction instructions but does not modify the source file. This prevents silent factual or formatting changes.

</details>

<details>
<summary><strong>Can it remove robotic AI phrasing from Markdown?</strong></summary>

It can identify the exact paragraph or sentence that matches a configured phrase or style gate. A human or coding agent then makes the smallest supported edit and runs the analyzer again.

</details>

<details>
<summary><strong>Can I install it from npm?</strong></summary>

Not currently. Install the agent skill with `npx skills add yanstd888/humanizer-lint --skill humanizer-lint`, or clone the repository and use `npm link` for the local CLI binaries.

</details>

<details>
<summary><strong>Which languages are supported?</strong></summary>

The configured lexical and language-detection paths support Indonesian and English. Do not treat the current statistical thresholds as validated defaults for other languages.

</details>

<details>
<summary><strong>Does it send text to an API?</strong></summary>

No. Production code has no network call. The skills installer and Git operations need network access only to download the repository.

</details>

<details>
<summary><strong>Why did a short document return SKIP?</strong></summary>

Documents below 20 words or three sentences do not contain enough material for the configured statistical gates. Lexical slop phrases are still checked.

</details>

## Contributing

Contributions should remain deterministic, zero-dependency, and covered by a focused regression test.

1. Fork the repository.
2. Create a focused branch.
3. Add or update one minimal test for non-trivial behavior.
4. Run `npm test` and `npm pack --dry-run`.
5. Open a pull request that explains the user-visible effect.

Every repository change updates the package and skill version, then publishes a matching Git tag and GitHub release after verification.

## Project layout

```text
.github/
  workflows/
    ci.yml
LICENSE
README.md
SKILL.md
package.json
profiles/
  default-human.json
rules/
  en-slop.json
  id-slop.json
scripts/
  analyze.mjs
  fingerprint.mjs
  utils/
    metrics.mjs
    sanitizer.mjs
    tokenizer.mjs
tests/
  fixtures/
  test-runner.mjs
```

## License

Licensed under the [MIT License](LICENSE).
