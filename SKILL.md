---
name: humanizer-lint
description: Deterministic multilingual AI text humanizer, anti-slop prose linter, copywriting/blog/docs editor, and stylometric analyzer (EN, ID, ES, MS, FR, DE, PT, ZH + 100+ languages via Intl.Segmenter). Fixes robotic LLM tone, uniform sentence rhythm, low burstiness (CV), MATTR vocabulary repetition, and translationese clichés using a local zero-dependency Node.js CLI validator.
version: 1.2.1
license: MIT
compatibility: Node.js >= 18.3.0 (zero external dependencies)
allowed-tools: Bash(node:*) Read Write
metadata:
  version: "1.2.1"
  author: "yanstd888"
  domain: "writing"
---

# Humanizer Lint

Use this skill when writing, editing, translating, or humanizing prose, blog posts, SEO articles, copywriting, or technical documentation across **8 deep language rule packs (English, Indonesian, Spanish, Malay, French, German, Portuguese, Mandarin Chinese)** and **100+ languages in Universal Stylometric Mode (`Intl.Segmenter`)**. The local deterministic CLI analyzer is mandatory, uses only Node.js built-ins, and sends zero text over the network.

## When to use

- Humanize agent-generated drafts, articles, essays, copywriting, and documentation in any language (`--lang auto`).
- Audit and fix uniform sentence rhythm (low Burstiness $CV$ and monotonous 3-sentence windows).
- Strip LLM stock phrases, filler transitions, and rigid translationese morphology (`EN`, `ID`, `ES`, `MS`, `FR`, `DE`, `PT`, `ZH`).
- Match a user's personal writing style using a local voice fingerprint profile (`scripts/fingerprint.mjs`).
- Verify edited prose deterministically (`PASS` / `FAIL`) before returning it to the user.

## Supported Languages (Two-Tier Multilingual Architecture)

- **Tier 1 — Full Lexical Anti-Slop + Stylometric Math (8 Languages):** `en` (English), `id` (Bahasa Indonesia), `es` (Español), `ms` (Bahasa Melayu), `fr` (Français), `de` (Deutsch), `pt` (Português), `zh` (中文 / Mandarin).
- **Tier 2 — Universal Stylometric Engine (100+ Languages via `Intl.Segmenter`):** Automatic sentence-length Burstiness ($CV$), Adjacent Rhythm Delta ($\Delta_{adj}$), Adaptive $MATTR$, paragraph symmetry, starter repetition, and compression entropy for Latin, Cyrillic, Arabic, Japanese, Korean, Hindi, Turkish, Vietnamese, and other scripts via `--lang auto` or `--lang universal`.

## Agent-SEO Trigger Intents & Search Keywords

- **Core Humanizer & Anti-Slop:** `humanizer`, `ai humanizer`, `humanize text`, `anti-slop`, `remove ai slop`, `prose linter`, `stylometric linter`, `bypass robotic ai writing`, `burstiness checker`, `perplexity and burstiness`, `mattr lexical diversity`.
- **Writing, Copywriting & Docs Workflows:** `writing assistant`, `copywriting linter`, `blog post writer`, `seo article humanizer`, `markdown prose linter`, `technical documentation editor`, `proofreading and editing`, `natural translation polishing`, `voice cloning stylometry`.
- **Indonesian & Malay Intents:** `humanizer bahasa indonesia`, `cara agar tulisan ai tidak terdeteksi`, `perbaiki tulisan ai yang kaku`, `ubah teks chatgpt jadi natural`, `cek skor tulisan ai`, `parafrase anti-ai`, `semak ayat ai bahasa melayu`.
- **Global Multilingual Intents:** `humanizador de texto ia` (ES/PT), `humaniseur de texte ia` (FR), `ki-text humanisieren` (DE), `消除AI味 / AI文章人性化` (ZH).

Do not use it to alter code, commands, structured data, quotations, legal language, or factual identifiers. The sanitizer excludes common Markdown structures, but the agent must still preserve meaning and supported facts.

## Prerequisites

- Node.js 18.3 or newer.
- Resolve this skill's installed directory as `<skill_dir>` at runtime.
- Optional custom profile: `<skill_dir>/profiles/custom-voice.json`.

## Closed-loop protocol

### 1. Resolve context

1. Resolve `<skill_dir>` from this `SKILL.md`; never assume the current working directory.
2. Determine `auto`, `universal`, or a two-letter ISO 639-1 code. `auto` selects a bundled pack when evidence is strong; otherwise it uses `universal`.
3. If `<skill_dir>/profiles/custom-voice.json` exists, pass it with `--profile`. Otherwise use the bundled default profile.
4. Keep source facts, names, numbers, dates, quotations, citations, and technical terms unchanged unless the user explicitly requests a factual edit.

Completion criterion: language, analyzer path, and optional profile path are known before drafting.

### 2. Draft with asymmetric rhythm

Write the first draft with concrete subjects and verbs. Mix short 2 to 6 word sentences with longer 26 to 38 word sentences where the meaning supports them. Avoid generic introductions and summary paragraphs that merely repeat earlier content.

Do not distort meaning to hit a metric. Sentence-length variation must come from legitimate splitting, merging, or reordering of supported material.

Completion criterion: the draft preserves every source claim and contains no invented detail.

### 3. Run deterministic verification

Prefer stdin so the target repository remains clean:

```sh
node <skill_dir>/scripts/analyze.mjs --stdin --lang auto --json
```

Pipe the complete draft to stdin. With a custom profile:

```sh
node <skill_dir>/scripts/analyze.mjs --stdin --lang auto --profile <skill_dir>/profiles/custom-voice.json --json
```

Never skip this command. Read `status`, `score`, `metrics`, and every item in `violations`.

Completion criterion: a parseable JSON report exists for the exact draft being considered.

### 4. Correct only flagged prose

If `status` is `FAIL`:

1. Group overlapping violations by paragraph. Whole-text statistical diagnostics (`LOW_BURSTINESS`, `MISSING_SENTENCE_RANGE`, `LOW_ADJACENT_DELTA`, and `LOW_LEXICAL_DIVERSITY`) identify the global gate when no single sentence is solely responsible.
2. Edit only the cited sentences or paragraphs, or make the smallest whole-text rhythm correction named by a statistical diagnostic.
3. Follow each `fixInstruction` without adding or dropping facts.
4. Run the analyzer again on the complete revised draft.
5. Stop after three analyzer iterations.

If `status` is `SKIP`, statistical stylometry is unavailable. Fix any lexical violations that are still reported, preserve the short form, and state that the statistical gate was skipped because the text is too short.

If the third iteration still returns `FAIL`, do not present the draft as verified. Return the remaining diagnostics and ask whether the user wants a broader rewrite.

Completion criterion: return prose only after `PASS`, or an explicitly labeled short-text `SKIP` with no unresolved lexical violations.

## Analyzer commands

```sh
node <skill_dir>/scripts/analyze.mjs --file draft.md --lang id --json
node <skill_dir>/scripts/analyze.mjs --file draft.md --lang en
node <skill_dir>/scripts/analyze.mjs --stdin --lang auto --json
node <skill_dir>/scripts/fingerprint.mjs --input samples --output <skill_dir>/profiles/custom-voice.json
```

Exit codes:

- `0`: `PASS` or `SKIP`.
- `1`: analyzed successfully and returned `FAIL`.
- `2`: invalid arguments, unreadable input, or malformed profile.

## Pitfalls

- A high score does not prove human authorship. It proves only that the configured checks passed.
- Very short text cannot support statistical stylometry.
- Technical, legal, and intentionally repetitive prose may require a custom profile.
- Do not rewrite unflagged paragraphs merely to increase the score.
- Do not treat `voiceProfileDeviation` as an authorship probability; it is a relative distance from the selected profile.

## Verification

Before returning revised prose:

- [ ] Analyzer ran against the final exact text.
- [ ] Final status is `PASS`, or an honest lexical-clean `SKIP` for short text.
- [ ] No source fact, identifier, number, quotation, or citation changed unintentionally.
- [ ] Only flagged prose was revised after the first analyzer pass.
- [ ] No network service or external package was used.
