# humanizer-lint — Full Technical Reference

> Version 1.5.0. The static build renders this file as `/llms-full.txt` with the checked-in rule catalogs and default profile.

## Purpose

`humanizer-lint` is a deterministic local prose-quality linter. Eight language-specific packs (`en`, `id`, `es`, `ms`, `fr`, `de`, `pt`, `zh`) provide lexical rules; universal mode uses native `Intl.Segmenter` for sentence-rhythm diagnostics across 100+ languages. It does not classify authorship or upload text.

Metrics such as document CV, paragraph CV, adjacent delta, sentence-length ranges, MATTR, and compression ratio are diagnostics. Formal or regulated prose may legitimately have lower variance and should preserve required terms.

## CLI

```sh
npx humanizer-lint --file draft.md --lang auto --json
npx humanizer-lint --file draft.md --lang auto --delivery-gate
node scripts/fingerprint.mjs --dir samples --out profiles/custom-voice.json
npm run benchmark
```

## Result shape

Each result contains `status`, `score`, `language`, `rulePack`, `metrics`, `violations`, and `deliveryGate`.

`deliveryGate` contains:

1. `rhythmAndStylometry`
2. `lexicalAndMorphology`
3. `domainHygiene`
4. `finalVerdict`

Findings may include `suggestedReplacement` and `splitSuggestion` in addition to `fixInstruction`.

## v1.4 detectors

- `FLAT_PARAGRAPH_RHYTHM`: paragraphs with at least 4 sentences, paragraph CV under 0.25, and range under 7 words.
- `UNIFORM_CLAUSE_STRUCTURE`: 4 consecutive similarly sized sentences with 1–2 internal clause punctuation marks each.
- `REPETITIVE_NGRAM`: repeated non-stopword 3-grams or 4-grams in texts of at least 120 words.
- `RHETORICAL_SLOP`: staged conversational hooks and excessive short rhetorical questions.
- Domain hygiene: weak CTA, hyperbolic claims, AI-shaped comments, missing accessible names/alt text, heading skips, generic gradients, and large fixed widths.

## Scoring caps

- Burstiness: 25
- Monotonous rhythm and clause symmetry: 20
- Lexical, structural, and domain wording: 30
- Morphology: 15
- Combined vocabulary, entropy, and voice profile: 10

## Reproducible benchmark

The benchmark covers 16 multilingual and 4 domain synthetic fixtures. Its fixture pass rate is not a measure of real-world accuracy; runtime varies by hardware. Run `npm run benchmark` locally for current results.

## Editorial search intents

`perbaiki tulisan AI yang kaku`; `hilangkan kata klise AI`; `audit ritme kalimat dan burstiness`; `polish robotic LLM drafts`; `remove repetitive AI stock phrases`; `lint markdown documentation and copywriting`; `消除AI写作腔`; `提升文章可读性`.

## Rule catalog

```json
{{ruleCatalog}}
```

## Default profile

```json
{{defaultProfile}}
```