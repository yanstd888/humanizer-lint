<div align="center">

<img src="assets/humanizer-lint-hero.jpg" alt="humanizer-lint by yanstd888" width="920">

# humanizer-lint

[![HOL Guard](https://img.shields.io/endpoint?url=https%3A%2F%2Fhol.org%2Fapi%2Fregistry%2Fbadges%2Fplugin%3Fslug%3Dyanstd888%252Fhumanizer-lint%26metric%3Drelease)](https://hol.org/registry/plugins/yanstd888%2Fhumanizer-lint?utm_source=hol_marketplace&utm_medium=plugins_badge&utm_campaign=plugins&utm_content=yanstd888%2Fhumanizer-lint&ref=plugin-author-311c519a)

### Edit stiff AI-shaped prose with a deterministic local prose and rhythm linter

A local, zero-dependency prose linter that flags stiff, AI-sounding writing (stock phrases, flat sentence rhythm, repeated wording) and tells you what to revise. A style checker, not an AI detector.

[![skills.sh](https://skills.sh/b/yanstd888/humanizer-lint)](https://www.skills.sh/yanstd888/humanizer-lint/humanizer-lint)
[![GitHub Release](https://img.shields.io/github/v/release/yanstd888/humanizer-lint?style=flat-square&logo=github)](https://github.com/yanstd888/humanizer-lint/releases)
[![npm](https://img.shields.io/npm/v/humanizer-lint)](https://www.npmjs.com/package/humanizer-lint)
[![CI](https://img.shields.io/github/actions/workflow/status/yanstd888/humanizer-lint/ci.yml?branch=main&style=flat-square&label=CI)](https://github.com/yanstd888/humanizer-lint/actions/workflows/ci.yml)
[![Zero Dependencies](https://img.shields.io/badge/Dependencies-0-126a4a?style=flat-square)](package.json)
[![Snyk: Pass](https://img.shields.io/badge/Snyk-Pass-126a4a?style=flat-square)](https://www.skills.sh/yanstd888/humanizer-lint/humanizer-lint/security/snyk)
[![Socket: Pass](https://img.shields.io/badge/Socket-Pass-126a4a?style=flat-square)](https://www.skills.sh/yanstd888/humanizer-lint/humanizer-lint/security/socket)
[![Agent Trust Hub: Pass](https://img.shields.io/badge/Agent%20Trust%20Hub-Pass-126a4a?style=flat-square)](https://www.skills.sh/yanstd888/humanizer-lint/humanizer-lint/security/agent-trust-hub)
[![Live Demo](https://img.shields.io/badge/Live%20Demo-humanizer.aiclub.ai.id-126a4a?style=flat-square)](https://humanizer.aiclub.ai.id/)
[![License](https://img.shields.io/github/license/yanstd888/humanizer-lint?style=flat-square)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18.3-339933?style=flat-square&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![GitHub Stars](https://img.shields.io/github/stars/yanstd888/humanizer-lint?style=flat-square)](https://github.com/yanstd888/humanizer-lint/stargazers)

[What it does](#what-it-does) | [Try in your browser](#try-in-your-browser) | [Install](#install) | [Quick start](#quick-start) | [CLI reference](#cli-reference) | [Detectors](#detectors-and-violation-types) | [Agent skill](#use-as-an-agent-skill) | [FAQ](#frequently-asked-questions)

</div>

**Summary**

- Flags repetitive AI stock phrases, flat sentence rhythm, and rigid translation patterns in blog posts, SEO articles, copy, and technical documentation.
- Reports diagnostic CV, paragraph CV, adjacent rhythm delta, MATTR, n-gram repetition, and one-pass fix hints; these values are indicators, not mechanical style targets.
- Ships **8 language-specific lexical packs** (`en`, `id`, `es`, `ms`, `fr`, `de`, `pt`, `zh`) and Indonesian morphology checks. Experimental rhythm diagnostics (uncalibrated thresholds) use `Intl.Segmenter` for other languages.
- Supports local author voice profiling via `node <skill_dir>/scripts/fingerprint.mjs` and passes the listed skills.sh security audits with zero network text uploads.

```sh
npx skills add yanstd888/humanizer-lint
```

**Bahasa Indonesia:** Linter prosa lokal tanpa dependency yang menandai tulisan kaku ala AI (frasa klise, ritme kalimat datar, kata berulang) dan menunjukkan bagian yang perlu direvisi. Pemeriksa gaya, bukan detektor AI.

**8-language summary:** EN — AI humanizer and prose linter for stiff writing and sentence rhythm. ID — humanizer bahasa Indonesia: perbaiki tulisan AI yang kaku dan audit ritme kalimat. ES — humanizador de texto IA y corrector de estilo y ritmo. MS — humanizer teks bahasa Melayu untuk semak dan baiki gaya ayat AI. FR — humaniseur de texte IA et analyseur stylométrique de prose. DE — KI-Schreibstil verbessern und KI-Floskeln entfernen. PT — humanizador de texto IA e corretor de ritmo e estilo. ZH — AI文章润色与人性化，消除AI写作腔并提升句式节奏。

## Verified benchmark

Run `npm run benchmark` to reproduce the 20 synthetic fixtures (16 multilingual and 4 domain checks) and exploratory source corpus on the local machine.

## Known limitations

Findings are editorial heuristics, not evidence of authorship. Some valid formal or technical prose may be flagged; review each finding in context. Statistical rhythm checks require eight sentences, and rhythm diagnostics outside the eight lexical packs are experimental. Compression uses a fixed deterministic JavaScript DEFLATE implementation; its ratios can differ substantially from earlier native-compression releases. The 0.64 repetition threshold is exploratory and sample-derived, not independently calibrated: the reference repetition case is 0.5605, and the two human demo samples meeting the 150-word gate score 0.7233 and 0.7485. The other six human demo samples are too short to exercise this gate. The midpoint rounded to 0.64 is not an estimate of population accuracy. The exploratory corpus is small, non-random, and not independently adjudicated, so its results do not estimate real-world accuracy. Agent discovery and end-to-end tool execution have not been fully verified: a Codex sandbox blocked file access and a Claude model request returned HTTP 404; see `evals/RESULTS.md` in the repository.

## Try in your browser

Use the [official demo](https://humanizer.aiclub.ai.id) or its [mirror](https://humanizer-lint.pages.dev). Open a deterministic sample view directly:

| Language | AI Sample (FAIL) | Human Sample (PASS) |
|---|---|---|
| EN | [open](https://humanizer.aiclub.ai.id/?lang=en&sample=ai-en) | [open](https://humanizer.aiclub.ai.id/?lang=en&sample=human-en) |
| ID | [open](https://humanizer.aiclub.ai.id/?lang=id&sample=ai-id) | [open](https://humanizer.aiclub.ai.id/?lang=id&sample=human-id) |
| ES | [open](https://humanizer.aiclub.ai.id/?lang=es&sample=ai-es) | [open](https://humanizer.aiclub.ai.id/?lang=es&sample=human-es) |
| MS | [open](https://humanizer.aiclub.ai.id/?lang=ms&sample=ai-ms) | [open](https://humanizer.aiclub.ai.id/?lang=ms&sample=human-ms) |
| FR | [open](https://humanizer.aiclub.ai.id/?lang=fr&sample=ai-fr) | [open](https://humanizer.aiclub.ai.id/?lang=fr&sample=human-fr) |
| DE | [open](https://humanizer.aiclub.ai.id/?lang=de&sample=ai-de) | [open](https://humanizer.aiclub.ai.id/?lang=de&sample=human-de) |
| PT | [open](https://humanizer.aiclub.ai.id/?lang=pt&sample=ai-pt) | [open](https://humanizer.aiclub.ai.id/?lang=pt&sample=human-pt) |
| ZH | [open](https://humanizer.aiclub.ai.id/?lang=zh&sample=ai-zh) | [open](https://humanizer.aiclub.ai.id/?lang=zh&sample=human-zh) |

Use `?lang=en`, `?lang=id`, `?lang=es`, `?lang=ms`, `?lang=fr`, `?lang=de`, `?lang=pt`, or `?lang=zh` to set the playground chrome only for that visit; it does not overwrite a saved browser preference.

It works locally with zero runtime dependencies. Instead of rewriting text through another language model, it reports paragraph- and sentence-level violations with correction instructions. Use it to lint LLM-generated documentation, review robotic Markdown, check burstiness and lexical diversity, or add a prose gate to an agent or CI/CD workflow. The bundled rules flag phrases such as `delve` and `tapestry` without rewriting the source.

## Editorial search intents

Use this skills.sh humanizer as an AI writing style editor and anti-slop linter to identify passages to revise. It can help you remove LLM clichés and stock phrases or fix robotic AI writing tone. The CLI reports sentence length variation, coefficient of variation (CV), adjacent sentence rhythm delta, and moving-average type-token ratio (MATTR); author voice fingerprinting records local writing samples. Its selected domain checks include a copywriting and CTA linter and an AI code comment linter, not a complete accessibility or code audit.

The CLI can serve as a stylometric analyzer, sentence burstiness checker, and Markdown prose linter; its diagnostics still require editorial judgment.

The repository provides a Claude Code writing skill; users may also use it as a Cursor prose skill, Codex writing skill, Windsurf skill, or Gemini CLI skill, subject to their agent's local execution capabilities.

- **ID:** Untuk ubah tulisan AI jadi natural dan hilangkan kata klise AI, gunakan editor gaya bahasa dan ritme kalimat untuk audit artikel SEO dan dokumentasi teknis tanpa mengubah fakta.
- **MS:** Semak ritma ayat dan frasa klise untuk perbaiki gaya penulisan AI yang kaku.
- **ES:** Un editor de estilo y corrector de ritmo puede ayudar a quitar clichés de escritura IA.
- **FR:** Cet éditeur de prose et analyseur stylométrique aide à corriger le style robotique.
- **DE:** KI-Text humanisieren und dabei Satzrhythmus und Stil prüfen.
- **PT:** Um editor de estilo e corretor de ritmo textual ajuda a remover clichês de IA.
- **ZH:** 使用句式节奏与词汇多样性分析，检查文本风格，提升文章可读性。

## Language support

| Tier | Languages | Checks |
|---|---|---|
| Tier 1 — rule packs | `en`, `id`, `es`, `ms`, `fr`, `de`, `pt`, `zh` | Universal stylometric metrics plus lexical, definitional-opening, and structural-cliché packs; Indonesian keeps its morphology rules. |
| Tier 2 — universal | `universal` or another ISO 639-1 code such as `tr`, `ja`, or `ar` | Experimental rhythm diagnostics through native `Intl.Segmenter`; lexical and MATTR thresholds are uncalibrated. |

## Use cases & agent integration

Use this local AI text humanizer and prose linter for copywriting, blog posts, SEO articles, technical documentation, Markdown proofreading, academic prose, and natural translation polishing. Tier 1 packs flag configured anti-slop phrases in English, Indonesian, Spanish, Malay, French, German, Portuguese, and Mandarin; Tier 2 offers experimental, uncalibrated rhythm diagnostics for other languages.

For a closed-loop agent workflow, install the skill first, draft without changing facts, and run the local `node <skill_dir>/scripts/analyze.mjs --stdin --json` command before revising flagged prose. The installed analyzer needs no runtime dependency or network text upload. Editor-specific discovery and plugin behavior should be verified in the target agent; they are not guaranteed by the CLI.

## What it does

`humanizer-lint` analyzes prose after removing or neutralizing common non-prose Markdown structures. It then combines lexical rules, sentence-length statistics, structural checks, Indonesian morphology checks, and an optional voice profile into a score from 0 to 100.

The project includes:

- Eight reviewable lexical and structural rule packs for EN, ID, ES, MS, FR, DE, PT, and ZH.
- Sentence-length burstiness, adjacent rhythm delta, short/long sentence ratios, and adaptive MATTR.
- Repetition checks based on paragraph symmetry, repeated sentence starters, and compression ratio.
- Indonesian nominalization, passive-voice, loanword, and translation-style opening checks.
- Optional voice profiles generated from one to five writing samples.
- Human-readable terminal output and pure JSON output.
- Standard exit codes for agents, scripts, and CI jobs.

It does not estimate perplexity, classify who wrote the text, rewrite prose automatically, scan directories, or provide SARIF output.

## Terminal demo

Given this input in `draft.md`:

```text
In today's fast-paced world, teams delve into a robust landscape. Moreover, this pivotal approach fosters seamless collaboration across every project. In conclusion, the solution unlocks valuable insights for everyone.
```

`humanizer-lint --file draft.md --lang en` reports `FAIL`, **Score: 70**, and exits 1. Its three sentences skip the statistical rhythm gate; lexical checks still run. A passing analysis exits 0. Results vary by rules and profile.

## Static `SKILL.md` Humanizers vs. `humanizer-lint` (Closed-Loop CLI)

A static writing prompt can ask a model to vary prose, but it cannot verify the finished draft. `humanizer-lint` takes the smaller, deterministic approach: inspect the exact text after drafting, make only flagged revisions, then check again locally.

| Capability | Static `SKILL.md` humanizer prompt | `humanizer-lint` closed-loop CLI |
|---|---|---|
| Checks the completed draft | No | Yes, exact input is measured |
| Measures sentence rhythm | Prompt guidance only | CV, adjacent delta, short/long distribution |
| Measures vocabulary repetition | Prompt guidance only | Adaptive MATTR and repetition checks |
| Flags configured AI clichés | Model-dependent | Rule IDs and locations |
| Preserves source text | Depends on rewrite | Yes, analysis only |
| Runs offline after installation | Depends on agent/model | Yes |
| Supports eight lexical packs | Prompt-dependent | EN, ID, ES, MS, FR, DE, PT, ZH; other-language rhythm is experimental |
| Reviews selected 26-pattern tells | Model-dependent | Bounded heuristics; coverage is not exhaustive |
| Clusters weak signals | Prompt-dependent | Three visible weak findings in one paragraph affect score |
| Checks domain hygiene | Model-dependent | Selected copywriting, code-comment and UI checks |
| Produces JSON and exit codes | Usually no | Yes |
| Proves human authorship | No | No |

If you are looking for an AI writing detector linter, a ChatGPT tone remover CLI, or an open-source alternative to AI humanizers, note the boundary: this tool detects configured style signals and rhythm problems. It does not claim to determine whether a human or model wrote the text.

## Install

### CLI

Run the CLI without a global install, or install it globally:

```sh
npx humanizer-lint --file tulisan.md --lang id
npm install -g humanizer-lint
```

### Install as an agent skill

The recommended installation for coding agents is through the skills CLI:

```sh
npx skills add yanstd888/humanizer-lint
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

```sh
humanizer-lint --file draft.md --lang auto       # Detect language
humanizer-lint --file draft.md --lang universal  # Experimental universal rhythm
humanizer-lint --file draft.md --lang es         # Explicit language
humanizer-lint --file draft.md --lang id --json  # Machine-readable report
cat draft.md | humanizer-lint --stdin --lang auto --json
humanizer-lint --file draft.md --lang en --profile profiles/custom-voice.json --json
```

Without `npm link`, replace `humanizer-lint` with `node scripts/analyze.mjs` and replace `humanizer-fingerprint` with `node scripts/fingerprint.mjs`.

## Contoh / Example

Both versions describe existing project features; the edit removes an unnecessary opening without adding facts. Run the English analyzer on each complete paragraph.

### Before — FAIL (95)

```text
It is important to note that it runs locally. Humanizer-lint checks prose for repetitive phrases, formulaic openings, and recurring wording, while returning a report that identifies each supported finding. Eight lexical packs ship. The browser playground keeps analysis on the client, and the Node.js command line reads text from either files or standard input. A separate command creates voice profiles. Its analyzer reports a score and status alongside diagnostic findings, while the statistical rhythm gate requires eight prose sentences before evaluating sentence variance. Source code lives on GitHub. Users can install the package from npm and obtain the agent skill from the GitHub repository, while relying on the local command-line analyzer to evaluate their text without sending it to a server.
```

### After — PASS (100)

```text
It runs locally. Humanizer-lint checks prose for repetitive phrases, formulaic openings, and recurring wording, while returning a report that identifies each supported finding. Eight lexical packs ship. The browser playground keeps analysis on the client, and the Node.js command line reads text from either files or standard input. A separate command creates voice profiles. Its analyzer reports a score and status alongside diagnostic findings, while the statistical rhythm gate requires eight prose sentences before evaluating sentence variance. Source code lives on GitHub. Users can install the package from npm and obtain the agent skill from the GitHub repository, while relying on the local command-line analyzer to evaluate their text without sending it to a server.
```

## Indonesian revision example

The facts below come from this project's [language support](#language-support) and local-analysis description above; the revision removes an unnecessary phrase without adding facts. Both samples are too short for the statistical rhythm gate.

<!-- BEGIN:generated:id-before -->
**Before — FAIL, score 95:**

> Tidak dapat dipungkiri bahwa humanizer-lint menyediakan delapan paket leksikal dan menjalankan analisis secara lokal.
<!-- END:generated:id-before -->

<!-- BEGIN:generated:id-after -->
**After — SKIP, score 100:**

> Humanizer-lint menyediakan delapan paket leksikal dan menjalankan analisis secara lokal.
<!-- END:generated:id-after -->

The first result is `FAIL` because of a lexical finding; the second is `SKIP`, not a full rhythm pass.

## Pattern mining

Run `npm run mine-patterns -- --ai-dir <dir> --human-dir <dir> --lang en` to compare document-frequency patterns (2–5 words) and exploratory rhythm distributions. Input directories must contain `.txt` or `.md` documents. Rhythm statistics require eight sentences per document; the reported human-corpus percentiles are exploratory, not validated thresholds. Candidates are not evidence of authorship and require review. By default the command only prints JSON; `--write` explicitly appends candidates to the corresponding local rule pack. New rules include observed Unicode variants, allow punctuation between tokens and allow Chinese tokens without spaces. This can broaden matches, and unobserved Unicode forms may still be missed. Newly mined Chinese rules use `Intl.Segmenter` word boundaries; results can vary with the runtime's ICU data, and this does not validate the meaning of a match. When a Chinese mined rule matches but `Intl.Segmenter` is unavailable, analysis returns an error rather than accepting an unverified boundary. Existing mined or legacy patterns are not rewritten when new variants appear. Review the resulting diff before using or publishing it.

## Programmatic API

```js
import { analyzeText, createFingerprinter, MIN_SENTENCES_FOR_RHYTHM } from 'humanizer-lint';

const report = analyzeText('Review this draft.', { language: 'en' });
const fingerprint = createFingerprinter({ language: 'en' });
// await fingerprint(['sample.txt']);
```

The analyzer runs synchronously with local rule packs. The fingerprinter reads one to five local files and optionally writes a profile when an output path is provided. `MIN_SENTENCES_FOR_RHYTHM` is the eight-sentence statistical rhythm threshold.

## CLI reference

### Analyzer

```text
humanizer-lint (--file <path> | --stdin | <files...>) [--lang auto|universal|<ISO-639-1>] [--profile <path>] [--domain auto|prose|copywriting|code|ui] [--no-domain-lint] [--allow <phrases>] [--min-score <0-100>] [--json]
```

| Option | Required | Description |
|---|---:|---|
| `--file <path>` | One input required | Read one UTF-8 text or Markdown file. |
| `--stdin` | One input required | Read the complete document from standard input. |
| `--stdin-filename <name>` | No | Give stdin a filename for automatic domain routing; requires `--stdin`. |
| `--lang auto|universal|<ISO-639-1>` | No | Select auto-detection, a bundled Tier 1 pack, or universal stylometry. Default: `auto`. |
| `--profile <path>` | No | Load a JSON voice profile. |
| `--domain <mode>` | No | Choose `auto`, `prose`, `copywriting`, `code`, or `ui`. Without a filename, `auto` runs prose checks only; select a domain explicitly for stdin. With a filename, auto routes code comments by code extension, copy by non-code extension, and UI checks by markup extension. |
| `--no-domain-lint` | No | Disable domain checks; lexical and prose analysis still run. |
| `--no-ignore` | No | Run a strict audit without applying ignore directives or allowlists. |
| `--allow <phrases>` | No | Comma-separated, case-insensitive exact matched phrases to exempt; profiles may also contain an `allowlist` array. |
| `--min-score <0-100>` | No | Exit 1 if any analyzed file scores below this value or has status `FAIL`. |
| `--json` | No | Print JSON only. Without it, print the terminal report. |
| `--brief` | No | With `--json`, emit compact findings with complete matches, targets, and rhythm/final gate status. The size goal is ≤40% of full JSON in typical cases, not a hard cap; long matches can exceed it. Suppressed entries retain type, rule ID, location, offsets, directive, match and source scope; full JSON adds their severity, line/column and remediation fields, plus all four gate blocks. |
| `--delivery-gate` | No | Print the four-block delivery report. |
| `--help` | No | Print command usage. |

Choose exactly one input mode: `--file`, `--stdin`, or one or more positional paths. Positional paths support `*`, `?`, and `**` glob patterns; quote patterns when the shell should not expand them. Multi-file JSON output is an array of `{file, result}` objects; single-file output remains a single result object. An unmatched pattern is an error.

Statistical rhythm gates are skipped below eight sentences regardless of word count; lexical and domain findings still run. Treat metrics as diagnostics rather than writing quotas. Preserve functional code, identifiers, commands, structured data, legal clauses, quotations, facts and numbers. If further edits would distort meaning or a required register, stop and explain the unresolved diagnostic.

An ignore directive on a line by itself suppresses the next nonblank line: `<!-- humanizer-ignore -->`, `// humanizer-ignore`, or `/* humanizer-ignore */`. A standalone `<!-- humanizer-ignore-file -->` suppresses the file only within its first 10 physical lines (including optional frontmatter). Directives inside fenced examples are not active. Simple prose can end in `<!-- humanizer-ignore -->`; a comment-only `//` line can end in `// humanizer-ignore` or `/* humanizer-ignore */`. These same-line forms are conservative heuristics, not a language parser; use standalone directives for complex syntax.

Offsets use JavaScript UTF-16 indices into the original input. `sourceScope: match` identifies a direct match; `sentence-range` and `document-excerpt` identify diagnostic context, not text to replace mechanically.

For JavaScript/TypeScript or MDX input containing backticks, ignore directives are disabled conservatively; `ignoreWarning` (JSON) or a CLI warning reports this. This avoids mistaking template contents for directives without adding a parser dependency.

### Voice fingerprint

```text
humanizer-fingerprint (--input <file-or-dir> | --dir <samples-dir>) (--output <profile.json> | --out <profile.json>) [--name <name>] [--lang id|en|auto]
```

| Option | Required | Description |
|---|---:|---|
| `--input <path>` / `--dir <path>` | Yes | Read one file or up to five `.md` and `.txt` files from one directory. |
| `--output <path>` / `--out <path>` | Yes | Write the generated profile atomically. |
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
| `EN041` / `SHALLOW_PARTICIPLE_TAIL` | English | Participial tails; an experimental weak signal. |
| `EN042`-`EN043` / `STRUCTURAL_CLICHE` | English | Binary formulas. |
| `EN044` / `EM_DASH_OVERUSE` | English | Repeated dashes; a custom voice profile can exempt a rate at or below the author's baseline. |
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

Additional rhythm and repetition findings include `FLAT_PARAGRAPH_RHYTHM`, `UNIFORM_CLAUSE_STRUCTURE`, `REPETITIVE_NGRAM`, and `RHETORICAL_SLOP`. Rule packs cover EN, ID, ES, MS, FR, DE, PT, and ZH.

Selected English, Indonesian and Chinese rules also flag staged openings, stock closers, chatbot residue and unnamed authority. Selected weak signals, including `FORCED_TRIAD`, `EM_DASH_OVERUSE`, `PASSIVE_MISSING_SUBJECT`, decorative ATX headings, exact heading/opening repetition and consecutive single-line unordered bold-label items, are experimental: one or two in a paragraph are warnings with no penalty; three or more visible findings in the same paragraph affect the score. A list with no analyzable paragraph remains a warning. Mixed paired straight and curly double quotes within a paragraph are also flagged, without changing quoted wording; nested or multiline quotation styles are not covered. Delayed-decision detection is limited to selected explicit EN/ID openers after at least three sentences and 45 words in the opening paragraph; those thresholds are heuristics, not validated writing standards. Suppressed findings do not count toward a cluster. Dash frequency is assessed per paragraph and can respect a matching custom voice profile. These heuristics are not a complete 26-pattern implementation and require editorial judgment. Borrowed-authority checks recognize only selected same-sentence English and Indonesian attribution forms; they do not verify the source or recognize every citation style.

Domain checks can report `WEAK_CTA`, `HYPERBOLIC_CLAIM`, `TAUTOLOGICAL_CODE_COMMENT`, `DECORATIVE_COMMENT_BANNER`, `LAZY_AI_PLACEHOLDER`, `MISSING_ACCESSIBLE_NAME`, `MISSING_IMG_ALT`, `HEADING_ORDER_SKIP`, `AI_GRADIENT_CLICHE`, and `NON_RESPONSIVE_FIXED_WIDTH`. The four-block delivery gate groups rhythm, lexical/morphology, domain hygiene, and final verdict.

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

Statistical rhythm gates require at least eight prose sentences, regardless of word count. Shorter inputs skip rhythm statistics while lexical and domain checks still run; errors can still yield `FAIL`.

## Markdown sanitization

Before tokenization, the analyzer removes frontmatter, fenced code, headings, tables and unfinished list fragments. It retains complete list prose, link text, blockquotes and paragraph boundaries; inline code and bare URLs become `TOKEN_ENTITY`. This is deterministic sanitization, not a full Markdown or MDX parser; arbitrary HTML blocks and MDX components do not receive special parsing.

## Voice profiles

Generate a profile from one to five samples:

```sh
humanizer-fingerprint --input writing-samples --output profiles/custom-voice.json --name editorial-voice --lang en
```

The profile records mean sentence length, standard deviation, burstiness, adjacent delta, MATTR, average paragraph sentence count, and punctuation rates. Supplying it with `--profile` adds `voiceProfileDeviation`; a mean sentence-length drift above 30 percent creates a five-point profile penalty inside the 10-point vocabulary and entropy cap.

## JSON output

`--json` writes a single JSON object to stdout. The stable top-level fields are:

<!-- BEGIN:generated:json-example -->
```json
{
  "status": "SKIP",
  "score": 100,
  "language": "universal",
  "rulePack": "universal",
  "violations": []
}
```
<!-- END:generated:json-example -->

This abbreviated output is generated from `A short sentence.`; the full result includes `schemaVersion`, `metrics`, `targets`, `deliveryGate`, `suppressed`, `allowlistApplied`, and `ignoreWarnings`. When applicable, `ignoreWarning` summarizes ignore-related warnings. Findings may include `sourceScope`, UTF-16 `charOffset: { start, end }`, and 1-based `line`, `column`, `endLine`, and `endColumn`; consult `schemas/report.schema.json` and check `schemaVersion` before consuming the report.

## Use as an agent skill

After installation, an agent can use the skill as a closed verification loop:

1. Draft or edit prose in a supported Tier 1 language or any Universal Stylometry language without changing supported facts.
2. Run the analyzer against the exact complete draft.
3. Read every violation and edit only the affected prose or named whole-document gate.
4. Re-run the analyzer, stopping after three iterations.
5. Return only a `PASS`, or an honestly labeled short-text `SKIP` with no unresolved lexical violations.

The skill is indexed on skills.sh and its current listing passes the platform's Snyk security audit.

## Used by

The skills.sh badge links to anonymous skill installation activity; npm downloads and downstream package manifests reflect CLI distribution. GitHub's `Used by` count comes from its dependency graph.

## CI and repository automation

The included [CI workflow](.github/workflows/ci.yml) tests supported Node.js versions and package contents. For an example that checks prose in another repository, see [CLI reference: GitHub Actions](references/cli.md#github-actions).

## Security properties

Production scripts use only Node.js built-ins and have no runtime dependencies. The test suite rejects production use of `child_process`, `eval`, dynamic `Function` construction, and `fetch`. The fingerprint writer writes to a temporary file and renames it into place.

Text remains local unless the surrounding agent or workflow sends it elsewhere.

## Frequently asked questions

**Is this an AI content detector?** No. A pass or failure does not prove authorship.

**Does it rewrite prose?** No. It reports findings and suggested corrections without modifying the source.

**Can it help with robotic Markdown?** It identifies configured phrases and style signals; a person or agent revises the affected prose and reruns the analyzer.

**Can I install it from npm?** Yes: `npx humanizer-lint --file draft.md --lang auto`, or `npm install -g humanizer-lint`. Install the agent skill separately with `npx skills add yanstd888/humanizer-lint`.

**Which languages are supported?** Lexical packs cover English, Indonesian, Spanish, Malay, French, German, Portuguese, and Mandarin. Other ISO 639-1 languages use experimental `Intl.Segmenter` rhythm diagnostics with uncalibrated thresholds, not an invented lexical pack.

**Does it send text to an API?** No. Production code makes no network calls; installers and Git require a network to download the repository.

**Why did a short document return SKIP?** Fewer than eight prose sentences skip statistical rhythm gates regardless of word count. Lexical and domain checks still run and may cause `FAIL`.

## Contributing

Contributions should remain deterministic and zero-dependency. Fork the repository, create a focused branch, add a regression test for non-trivial behavior, run `npm test` and `npm pack --dry-run`, and open a pull request explaining the user-visible effect. Releases and matching version tags are created after verification.

## Project layout

```text
.github/workflows/ci.yml       # CI
CHANGELOG.md, README.md, SKILL.md
benchmark/, demo/, evals/      # fixtures, playground, agent evaluations
index.mjs, index.d.ts          # API and types
meta/canonical.json, profiles/ # product position and voice profile
references/, schemas/          # guidance and report schema
rules/                         # eight lexical packs
scripts/{analyze,fingerprint,benchmark,docs-snapshot,mine-patterns}.mjs
scripts/core/, scripts/utils/  # analyzer, tokenization, metrics and domain checks
tests/corpus/, tests/fixtures/ # exploratory corpus and fixtures
```

## License

Licensed under the [MIT License](LICENSE).
