---
name: humanizer-lint
description: >-
  Lint and humanize robotic or stiff prose using a deterministic local Node.js
  analyzer. Eight lexical packs (EN, ID, ES, MS, FR, DE, PT, ZH) and experimental
  uncalibrated Intl.Segmenter rhythm diagnostics support local voice fingerprinting,
  copywriting, UI text, and code-comment checks. Use for a draft, blog post, SEO
  article, README, documentation or landing page: humanize this text, remove AI
  slop, perbaiki tulisan AI yang kaku, ubah teks jadi lebih natural, cek ritme
  kalimat dan kata klise. Not for changing executable logic, legal contracts or
  direct quotations; not a full accessibility scanner or authorship detector.
allowed-tools: Bash(node:*)
metadata:
  version: 1.5.0
  topic: agent-workflows
  summary: Local deterministic prose, copywriting, and code-comment linter with 8 lexical anti-cliché packs and experimental universal rhythm diagnostics.
  tags: [agent-workflows, marketing, copywriting, seo, writing, ai-humanizer, anti-slop, prose-linter, stylometry, burstiness, multilingual]
---

# Humanizer Lint

**Audit prose locally, revise only measured problems, and verify the final text before delivery.**

- Run `node <skill_dir>/scripts/analyze.mjs --stdin --json` for deterministic local analysis.
- Tier 1 covers eight language-specific lexical packs (`en`, `id`, `es`, `ms`, `fr`, `de`, `pt`, `zh`), with Indonesian morphology diagnostics. Tier 2 is experimental universal sentence-rhythm segmentation across 100+ languages via `Intl.Segmenter`; lexical and MATTR thresholds are uncalibrated.
- Follow each finding's surgical `suggestedReplacement`, `splitSuggestion`, and `fixInstruction` without rewriting clean prose.
- Build a local author voice profile with `node <skill_dir>/scripts/fingerprint.mjs`; samples never leave the machine.

A local, zero-dependency prose and copywriting linter that flags stiff, AI-sounding writing (stock phrases, flat sentence rhythm, repeated wording, translationese) and tells you exactly what to revise. A deterministic style and rhythm checker, not an AI authorship detector. Experimental rhythm diagnostics (uncalibrated thresholds).

## Agent Tool Boundary

Inside an agent workflow, execute only:

```sh
node <skill_dir>/scripts/analyze.mjs --stdin --json
node <skill_dir>/scripts/fingerprint.mjs --dir <samples_dir> --out <skill_dir>/profiles/custom-voice.json
```

Do not call network tools or upload the user's text. `npx humanizer-lint` is for manual CLI or CI use outside this agent workflow.

For explicit routing, add `--domain auto|prose|copywriting|code|ui`; use `--no-domain-lint` to disable domain checks. Without a filename, `auto` is prose-first; choose a domain explicitly for stdin. Ignore directives in JavaScript/TypeScript with backticks are disabled conservatively and reported in `ignoreWarning`.

Preserve executable logic, identifiers, commands, structured payloads, legal clauses, quotations and factual numbers. Revise flagged prose, copy, comments, or UI/accessibility markup only when the change is appropriate and does not alter functionality or meaning.

## Workflow A — Drafting New Prose

1. Write with concrete nouns, active verbs, specific claims, and transitions that reflect the actual relationship between ideas.
2. Keep facts, quotations, names, numbers, and required terminology unchanged.
3. Avoid stock openings, staged conversational hooks, generic claims, and repeated sentence templates.
4. Before returning the draft, pipe it to `node <skill_dir>/scripts/analyze.mjs --stdin --json`.
5. Revise only actionable findings, then verify again. Stop after at most three analysis/revision passes.

## Workflow B — Auditing and Revising Existing Text

1. Run the analyzer **before changing a single word**.
2. Inspect findings even if the rhythm gate is `SKIP`; short inputs can still fail lexical or domain checks.
3. Edit only actionable flagged text. Check `sourceScope`: `match` is an exact match; `sentence-range` and `document-excerpt` are context, not text to replace mechanically. Preserve unflagged content.
4. Preserve all unflagged prose and factual meaning.
5. Re-run the analyzer. Stop after at most three iterations and report any unresolved diagnostic instead of forcing a rewrite.

## Metrics Are Diagnostics, Not Rigid Targets

`CV`, paragraph `CV`, adjacent sentence delta ($\Delta_{adj}$), sentence-length ranges, MATTR, and compression ratio identify flat or repetitive patterns. They are not mechanical writing targets. Never manufacture a 3-word sentence followed by a 35-word sentence merely to raise a number; the result must still sound coherent.

Formal, legal, academic, and regulated documents often use lower sentence variance, nominalized terms, or prescribed wording. If further changes would distort meaning or required register, stop editing, return the faithful text, and briefly explain why the statistical diagnostic was overridden. Never invent facts or examples to change a score. When a consistent author voice matters, use a custom `--profile` rather than forcing casual cadence.

## Local Voice Profile

Place at least three human writing samples in one local folder. A combined total of 500 words or more is recommended. Files must be `.txt` or `.md`.

```sh
node <skill_dir>/scripts/fingerprint.mjs \
  --dir <samples_dir> \
  --out <skill_dir>/profiles/custom-voice.json
```

Then analyze with:

```sh
node <skill_dir>/scripts/analyze.mjs \
  --stdin \
  --profile <skill_dir>/profiles/custom-voice.json \
  --json
```

Fingerprinting and analysis run locally with zero network uploads.

## Indonesian Revision Examples

**Before**

> Tidak dapat dipungkiri bahwa pengimplementasian sistem ini dilakukan untuk meningkatkan efisiensi proses.

**After — meaning preserved**

> Sistem ini diterapkan untuk meningkatkan efisiensi proses.

**Before**

> Dalam rangka memastikan stabilitas, pelaksanaan pemeriksaan dilakukan oleh tim sebelum deployment.

**After — meaning preserved**

> Tim melakukan pemeriksaan sebelum deployment untuk memastikan stabilitas.

Mixed Indonesian–English technical prose is supported. Keep necessary terms such as `deployment`, `latency`, `cache`, `middleware`, and `pull request`; Indonesian stopwords and sentence structure determine routing when they dominate the text.

## Delivery Gate

Use `--delivery-gate` for a human-readable four-block report or `--json` for the same structured data:

1. `rhythmAndStylometry` — document CV, paragraph CV, adjacent delta, range, and clause symmetry.
2. `lexicalAndMorphology` — active rule pack, repeated n-grams, stock phrases, nominalization, and passive bloat.
3. `domainHygiene` — copy/CTA, code comments, and filename-aware UI/accessibility/responsive checks.
4. `finalVerdict` — score, `PASS`/`FAIL`/`SKIP`, and prioritized one-pass fixes.
