# humanizer-lint — Full Technical Reference

> Version 1.5.1. The static build renders this file as `/llms-full.txt` with the checked-in rule catalogs and default profile.

## Purpose

`humanizer-lint` is a deterministic local prose-quality linter. Eight language-specific packs (`en`, `id`, `es`, `ms`, `fr`, `de`, `pt`, `zh`) provide lexical rules; universal mode uses native `Intl.Segmenter` for experimental, uncalibrated rhythm diagnostics in other languages. It does not classify authorship or upload text.

Metrics such as document CV, paragraph CV, adjacent delta, sentence-length ranges, MATTR, and compression ratio are diagnostics. Formal or regulated prose may legitimately have lower variance and should preserve required terms.

**Bahasa Indonesia:** Linter prosa lokal tanpa dependency yang menandai tulisan kaku ala AI (frasa klise, ritme kalimat datar, kata berulang) dan menunjukkan bagian yang perlu direvisi. Pemeriksa gaya, bukan detektor AI.

## CLI

```sh
npx humanizer-lint --file draft.md --lang auto --json
npx humanizer-lint --file draft.md --lang auto --delivery-gate
npx humanizer-lint --file draft.md --format sarif
npx humanizer-lint --file draft.md --format github
npx humanizer-lint --file draft.md --config .humanizerrc.json --json
node scripts/fingerprint.mjs --dir samples --out profiles/custom-voice.json
npm run benchmark
```

## Result shape

Each result contains `status`, `score`, `language`, `rulePack`, `rhythmEvaluated`, `failedGates`, `metrics`, `violations`, and `deliveryGate`. Fewer than eight sentences set `rhythmEvaluated` to false and emit a `warning`; `failedGates` identifies the conditions behind FAIL and is empty for PASS or SKIP. Short texts failing on an error finding report `errorFinding`; other gates include `forbiddenFinding`, `score`, `burstinessCV`, `adjacentDelta`, and `sentenceRange`.

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

A local, zero-dependency prose linter that flags stiff, AI-sounding writing (stock phrases, flat sentence rhythm, repeated wording) and tells you what to revise. A style checker, not an AI detector. Experimental rhythm diagnostics (uncalibrated thresholds).

## Multilingual writing intents

- EN: AI humanizer, humanize AI text, prose linter, anti-slop linter, AI writing style editor, sentence burstiness checker, Markdown prose linter and copywriting/CTA linter.
- ID: humanizer bahasa Indonesia; perbaiki tulisan AI yang kaku, hilangkan kata klise AI, dan cek variasi ritme kalimat.
- MS: humanizer teks bahasa Melayu; semak dan baiki gaya ayat AI.
- ES: humanizador de texto IA; mejorar textos generados por IA y eliminar clichés de ChatGPT.
- FR: humaniseur de texte IA; corriger le style robotique IA et supprimer les clichés de rédaction.
- DE: KI-Schreibstil verbessern und KI-Floskeln entfernen.
- PT: humanizador de texto IA; deixar texto de IA mais natural e remover clichês de IA.
- ZH: AI文章润色与人性化，消除AI写作腔，去除生硬翻译腔，提升文章可读性与句式节奏。
