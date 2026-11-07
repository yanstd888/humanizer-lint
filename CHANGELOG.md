# Changelog

The output schema is stable at `schemaVersion: 1`; new fields are additive and existing fields keep their meaning. Experimental behavior is not covered by this promise: rhythm statistics are skipped below eight sentences, and experimental rhythm diagnostics (uncalibrated thresholds) may change between releases.

## Unreleased

### Added

- Experimentally waive the long-sentence verdict gate when every sentence is shorter than 18 words; the score penalty remains. This dev-selected cutoff was validated on a private corpus and cannot be reproduced publicly; it can still miss short-sentence AI text and has not been calibrated on an independent holdout.

- Label the public evaluation seed as preliminary and distinguish it from private evaluations that cannot be reproduced from the checkout.
- Add an OpenTelemetry documentation excerpt under Apache 2.0; the provisional dev baseline now covers 60 inputs. On identical new input the pre-T2 and current verdict and score match. This remains development data, not a holdout.
- Add two attributed historical development excerpts: an Indonesian PHP tutorial under MIT and an English open-source guide under CC BY 4.0. The provisional baseline now covers 59 dev inputs; on identical new inputs, pre-T2/current verdicts match, while the English guide score changes from 86 to 87. There is no holdout.
- Protect backtick-delimited text across blank lines in `preserve-check`; this conservative heuristic may also match unrelated backticks in separate paragraphs.
- Add an owner-selected CodeQL workflow for JavaScript/TypeScript with SHA-pinned actions and job-scoped security permissions; hosted execution and effect on the HOL score remain unverified.
- Add 12 Indonesian Wikipedia excerpts and six English documents with revision-bound attribution and licenses. The provisional baseline now covers 57 dev inputs. On identical inputs pre-T2 and current verdicts match, but scores differ for the two earlier command-line excerpts and one Kubernetes excerpt. No holdout is available.
- Add seven Indonesian Wikipedia excerpts and eight English documentation, legal and opinion excerpts with revision-bound attribution and licenses. Update the provisional baseline to 39 dev inputs: all newly added results match pre-T2 on identical inputs; two earlier command-line score differences remain. No holdout is available.
- Add a Global Voices Indonesian news excerpt under CC BY 3.0 with attribution frontmatter. The source's pre-2021 timestamps are live CMS metadata, not an immutable revision. The baseline now covers 24 development inputs; pre-T2 and current results match for this new input. No holdout is available.
- Add seven contiguous 2010–2020 Wikinews news excerpts under CC BY 2.5; update the provisional baseline to 23 development inputs after comparing pre-T2 and current results on identical inputs. Their analyses match; two earlier command-line score differences remain. This is not a holdout.
- Add a contiguous 2011 Wikinews article excerpt under CC BY 2.5; update the provisional baseline to 16 development inputs. Its pre-T2 and current analysis matches; the previously recorded command-line score differences remain. This is not a holdout.
- Add two correlated English and Indonesian CC BY-SA 4.0 command-line excerpts; update the provisional baseline to 15 development inputs. Pre-T2 and current verdicts match on both new inputs, while scores differ (EN 84 to 79; ID 67 to 69); this update is not a holdout or evidence of calibration.
- Exclude relative Markdown link destinations from prose analysis while preserving label offsets.
- Improve `preserve-check` handling of selected currency codes, magnitude suffixes, and inch marks; token matching remains heuristic and does not verify attribution.
- Add `--format human|json|sarif|github` to `scripts/analyze.mjs`, supporting SARIF 2.1.0 and safely escaped GitHub Actions workflow annotations.
- Support `.humanizerrc.json` configuration discovery from the working directory upward, with strict schema validation, `--config <path>` override, and `--no-config` bypass.
- Add three contiguous CC BY-SA 4.0 Indonesian excerpts from 2019–2020 revisions to the development seed; rebuild the provisional baseline against all 13 inputs after comparing pre-T2 and current results. This is not a holdout or population estimate.
- Expand positional directories recursively to Markdown and text files, skipping hidden directories and `node_modules`.
- Add six explicitly assistant-authored, related AI examples to the incomplete development corpus; their prompt descriptions are post-hoc.
- Add a public-domain United States Declaration of Independence excerpt to the preliminary development corpus.
- Report skipped rhythm statistics and failed verdict gates in analysis output without changing scores or verdicts.
- Add a preliminary evaluation script and an initially three-source development seed, which then had no AI samples and could not measure recall or AUC; later development entries in this section add assistant-authored AI examples.
- Add a security policy and private vulnerability reporting guidance; include homepage and repository URLs plus keywords in plugin manifests.
- Recognize the uncontracted English staged openings `Here is the thing:` and `Here is the kicker:`.
- Detect the specific life-changing guarantee in copywriting; direct negation is not flagged.
- Add a regression for the blueprint's `The future looks bright` example.
- Recognize selected same-sentence English and Indonesian named attributions when reviewing borrowed-authority phrases; citation validity is not checked.
- Add regression coverage for specified taxonomy examples in English and Indonesian, as well as Chinese.
- Include the canonical product position in localized SoftwareApplication JSON-LD and test the English and Indonesian variants.
- Add a regression check for one triggering fixture in each of the 26 writing-pattern categories; fixture coverage is not real-world calibration.
- Cover additional blueprint examples for Indonesian stacked qualifiers, English participial tails and a paired staged closer.
- Check the blueprint's multilingual SEO phrases across the combined README and demo source surfaces, without treating keyword presence as proof of search ranking.
- Add a fact-grounded Indonesian revision example and verify its reported status, score and lexical finding against the CLI.
- Add bounded mixed double-quote and delayed-decision weak signals; preserve quoted text and document heuristic limits.
- Detect exact heading/opening repetition as an experimental weak signal for ATX headings.
- Detect consecutive bold-label list items as a weak signal, with scoped suppression and paragraph clustering when applicable.
- Detect decorative ATX headings as an experimental weak signal and expand selected Indonesian and English weak phrases.
- Guard the Git index against tracked files larger than 1 MiB during the standard test suite.
- Add the missing regex, translation, accessibility-audit and PDF-summary negative discovery prompts; execution of the new prompts remains pending.
- Check the marked README JSON example against live CLI output, including duplicate or missing marker detection.
- Include the original OFL notices for all three self-hosted font families in the static site.
- Add English and Indonesian participial-tail signals as warnings unless clustered with other weak signals.
- Add ten agent evaluation scenario pairs; behavioral execution remains pending.
- Add experimental consecutive two-word sentence-opening and paired-sentence contrast diagnostics.
- Add experimental paragraph-local clustering for selected weak signals, including triads, passive openings and dash frequency; one or two are warnings and three or more affect scoring after suppression. Honor a matching custom voice profile's dash frequency.
- Add initial English, Indonesian and Chinese staging diagnostics, plus selected chatbot-residue, attribution, significance and disclaimer patterns.
- Add a local differential n-gram miner with opt-in rule writing and exploratory corpus metrics.
- Add Claude Code and Cursor plugin manifests for the existing root skill.
- Add schema version, original-source line/column coordinates, and compact JSON output with full finding and suppression details; abbreviated gate blocks are documented.
- Add strict `--no-ignore` audits without suppressing directive or allowlist findings.
- Generate localized static playground entry points, localized FAQ schema, and a raster social preview.
- Add agent input trust, anti-gaming and fact-preservation boundaries, interactive critique, runtime preflight, and modular CLI/domain references.
- Add canonical product positioning and version consistency checks across discovery surfaces.

### Changed

- Private, nonrandom 116-document rule review: screened each observed rule and EN/ID pattern by language; 11 EN and 7 ID rules met the numerical review screen, while 59 EN and 62 ID rules had fewer than three human-document hits. All were retained because this corpus is small and genre-skewed. Per-rule human/AI counts and decisions are in `benchmark/corpus/rule-review-116.md`; other languages have insufficient labeled data.
- Private, nonrandom 101-document dev review: experimental individual `weakAlone` treatment of `LOW_BURSTINESS`, `LOW_ENTROPY_REPETITION`, `LOW_LEXICAL_DIVERSITY`, `MISSING_SENTENCE_RANGE`, `REPEATED_SENTENCE_OPENING`, `REPETITIVE_NGRAM`, and `SYMMETRIC_PARAGRAPHS` left aggregate verdict metrics unchanged; `REPETITIVE_STARTERS` increased EN human FAILs from 19/26 to 20/26 due to weak-signal clustering. These probes did not alter direct metric penalties or rhythm gates and are not equivalent to removing those checks. No rule changes were integrated.
- Private, nonrandom 101-document dev review: `EN041` 6/0, `EN044` 6/0, `EN058` 5/1 and `ID052` 10/1 human/AI documents. All four rules are already weak signals. Removing them one at a time left EN and ID recall at 25/25; only removal of `ID052` changed verdicts, reducing ID human FAILs from 21/25 to 20/25. Because the data is genre-skewed and no unseen holdout exists, the rules remain unchanged; these are not population estimates.
- Corpus validation rejects exact dev/test duplicate text after whitespace normalization. This cannot detect translations, paraphrases or shared sources.

- On a separate private 116-document dev set, the current analyzer fails all 14 English and 16 Indonesian adversarial examples. The examples are nonrandom and some prompts are related; these results are not a population estimate or a held-out evaluation. Relaxing the sentence-range gate as originally proposed reduces AI FAIL recall from 31/31 to 25/31 in English and 24/31 in Indonesian, so that candidate remains rejected.
- Split analyzer internals into language, ignore-directive, rhythm, scoring, Markdown, pattern and morphology modules without changing the public API. Full-result golden comparisons cover 118 inputs across four option modes.
- The proposed intro-phrase detector was not integrated: the separate 116-document development set already detects all 30 selected adversarial examples (14/14 EN, 16/16 ID), so no added feature can raise recall by the required 10 percentage points on that subset. This ceiling says nothing about unseen examples; no threshold is calibrated or claimed useful.
- Raw intro-comma measurement on a separate private 101-document development set found 126 hits in 593 human sentences and 180 hits in 1,184 AI sentences; these correlated, nonrandom examples do not justify a classifier threshold. The raw method does not exclude quoted material, attribution or subordinate clauses and has no holdout.
- Current 60-document development review (54 human, 6 related AI): the numeric review screen is met by `EN041` 6/0, `EN044` 6/0, `EN058` 7/0, `ID052` 11/0, `LOW_BURSTINESS` 25/0, `LOW_ENTROPY_REPETITION` 29/1, `LOW_LEXICAL_DIVERSITY` 5/0, `MISSING_SENTENCE_RANGE` 39/6, `REPEATED_SENTENCE_OPENING` 12/0, `REPETITIVE_NGRAM` 6/0, `REPETITIVE_STARTERS` 12/0 and `SYMMETRIC_PARAGRAPHS` 6/0 (human/AI document counts). No rule change is justified by this skewed seed.
- Prior 59-document development review (53 human, 6 related AI): the numeric review screen is met by `EN041` 6/0, `EN044` 6/0, `EN058` 6/0, `ID052` 11/0, `LOW_BURSTINESS` 24/0, `LOW_ENTROPY_REPETITION` 28/1, `LOW_LEXICAL_DIVERSITY` 5/0, `MISSING_SENTENCE_RANGE` 38/6, `REPEATED_SENTENCE_OPENING` 12/0, `REPETITIVE_NGRAM` 6/0, `REPETITIVE_STARTERS` 12/0 and `SYMMETRIC_PARAGRAPHS` 5/0 (human/AI document counts). No rule change is justified by this skewed seed.
- Prior 57-document development review (51 human, 6 related AI): the numeric review screen is met by `EN041` 6/0, `EN044` 6/0, `EN058` 5/0, `ID052` 10/0, `LOW_BURSTINESS` 23/0, `LOW_ENTROPY_REPETITION` 27/1, `LOW_LEXICAL_DIVERSITY` 5/0, `MISSING_SENTENCE_RANGE` 36/6, `REPEATED_SENTENCE_OPENING` 12/0, `REPETITIVE_NGRAM` 6/0, `REPETITIVE_STARTERS` 12/0, and `SYMMETRIC_PARAGRAPHS` 5/0 (human/AI document counts). `FLAT_PARAGRAPH_RHYTHM` 5/2 and `MONOTONOUS_RHYTHM` 16/4 do not meet the ratio screen. No downgrade is applied from this genre-skewed seed.
- Prior 39-document development review (33 human, 6 related AI): numeric downgrade-review screen is met by `EN041` 5/0, `EN044` 4/0, `EN058` 3/0, `ID052` 5/0, `LOW_BURSTINESS` 12/0, `LOW_ENTROPY_REPETITION` 13/1, `LOW_LEXICAL_DIVERSITY` 3/0, `MISSING_SENTENCE_RANGE` 21/6, `REPEATED_SENTENCE_OPENING` 6/0, `REPETITIVE_NGRAM` 3/0 and `REPETITIVE_STARTERS` 4/0 (human/AI document counts). `FLAT_PARAGRAPH_RHYTHM` 3/2 and `MONOTONOUS_RHYTHM` 9/4 do not meet the ratio screen. No downgrade is applied from this small, genre-skewed seed.
- Prior 24-document development review (18 human, 6 related AI): `EN041` occurs in 4/18 human vs 0/6 AI, `EN058` in 3/18 vs 0/6, `LOW_BURSTINESS` in 8/18 vs 0/6, `LOW_ENTROPY_REPETITION` in 6/18 vs 1/6, `MISSING_SENTENCE_RANGE` in 14/18 vs 6/6, and `MONOTONOUS_RHYTHM` in 7/18 vs 4/6. Each meets the numeric review screen; no rule changes are applied from this small, clustered seed.
- Prior 23-document development review (17 human, 6 related AI): `EN041` occurs in 4/17 human vs 0/6 AI, `EN058` in 3/17 vs 0/6, `LOW_BURSTINESS` in 7/17 vs 0/6, `LOW_ENTROPY_REPETITION` in 6/17 vs 1/6, `MISSING_SENTENCE_RANGE` in 13/17 vs 6/6, and `MONOTONOUS_RHYTHM` in 7/17 vs 4/6. Each meets the numeric review screen; no rule changes are applied from this small, clustered seed.
- Prior 16-document development review (10 human, 6 related AI): `LOW_BURSTINESS` appears in 4/10 human vs 0/6 AI, `LOW_ENTROPY_REPETITION` in 6/10 vs 1/6, `MISSING_SENTENCE_RANGE` in 7/10 vs 6/6, and `MONOTONOUS_RHYTHM` in 6/10 vs 4/6. All meet the numeric review screen; no rule changes are applied from this small, correlated seed.
- Prior 15-document development review (9 human, 6 related AI): `LOW_BURSTINESS` appears in 3/9 human vs 0/6 AI, `LOW_ENTROPY_REPETITION` in 6/9 vs 1/6, `MISSING_SENTENCE_RANGE` in 6/9 vs 6/6, and `MONOTONOUS_RHYTHM` in 6/9 vs 4/6. All meet the numeric review screen; no rule changes are applied from this small, correlated seed.
- Prior 13-document development review (7 human, 6 related AI): `LOW_ENTROPY_REPETITION` appears in 5/7 human vs 1/6 AI documents, `MISSING_SENTENCE_RANGE` in 4/7 vs 6/6, and `MONOTONOUS_RHYTHM` in 4/7 vs 4/6. All three meet the numeric screen for a possible downgrade, but no rule changes are applied from this small, correlated seed; validate candidate downgrades and recall on a larger corpus. `FORCED_TRIAD` rule IDs EN058 and ID052 each occur in one human document and none of the AI samples; the weak treatment remains unchanged.
- The prior 12-document development review (6 human, 6 related AI): `LOW_ENTROPY_REPETITION` appears in 4/6 human vs 1/6 AI documents and `MONOTONOUS_RHYTHM` in 3/6 vs 4/6; both meet the numeric screen for a possible downgrade. `MISSING_SENTENCE_RANGE` appears in 3/6 human vs 6/6 AI, exactly twice the human rate, so it does not meet the strict ratio screen. No rule changes are applied from this small, correlated seed; validate candidate downgrades and recall on a larger corpus. `FORCED_TRIAD` (EN058) has 1 human hit and no AI hits and remains weak.
- The subsequent 11-document development review (5 human, 6 related AI): `LOW_ENTROPY_REPETITION` 3/5 human vs 1/6 AI, `MISSING_SENTENCE_RANGE` 3/5 vs 6/6, and `MONOTONOUS_RHYTHM` 3/5 vs 4/6 meet the numeric screen for reviewing a possible downgrade. No downgrade is applied: the sample is tiny and correlated, and the earlier sentence-range change failed the recall gate. The other observed rules have fewer than three human-document hits: EN041 1/5, EN044 2/5, EN058 1/5, EXCESSIVE_NOMINALIZATION 1/5, FLAT_PARAGRAPH_RHYTHM 0/5, LOW_BURSTINESS 1/5, LOW_LEXICAL_DIVERSITY 1/5, PASSIVE_BLOATING 1/5, and SYMMETRIC_PARAGRAPHS 1/5. `FORCED_TRIAD` (EN058) remains weak and has one human hit.
- Earlier development rule review (10-document seed: 4 human, 6 related AI texts): the largest human-document count was 2, below the minimum of 3 for a data-driven downgrade. Counts (human/AI): EN041 1/0, EN044 2/0, EN058 1/0, EXCESSIVE_NOMINALIZATION 1/0, FLAT_PARAGRAPH_RHYTHM 0/2, LOW_ENTROPY_REPETITION 2/1, LOW_LEXICAL_DIVERSITY 1/0, MISSING_SENTENCE_RANGE 2/6, MONOTONOUS_RHYTHM 2/4, SYMMETRIC_PARAGRAPHS 1/0. Data are insufficient to propose removing or weakening these rules. FORCED_TRIAD (EN058) remains a weak signal; its single human hit warrants further review.
- Store rhetorical hooks in the English and Indonesian rule packs; regenerate the shared fallback with `node scripts/sync-rhetorical-hooks.mjs`. A test detects stale generated hooks, and the fallback still works when a browser rule pack is unavailable.
- Extract exclusive-word, attribution, split-connective and replacement fallback data into rule packs; regenerate shared editorial fallbacks with `node scripts/sync-editorial-fallbacks.mjs`. Regression tests cover mixed-language, partial-pack and browser-loader cases.
- An earlier baseline refresh used the then-current ten development documents and their prompt records; corpus line endings were normalized for exact-input checks. Pre-T2 and current analyzer results were compared on identical inputs.
- Label newly mined rule patterns with their `mined` source; existing rules remain unchanged.
- Bind evaluation regression baselines to development prompt provenance as well as corpus content.
- Show evaluation group metrics, rule counts, and requested sweep results in table output.
- Refuse evaluation regression comparisons when the recorded development corpus differs or is missing; evaluation JSON includes the development texts and metadata for exact comparison.
- Reject evaluation corpus entries when their recorded word counts do not match the files.
- Generalize the English short paired-closer finding to repeated opening tokens at paragraph endings; isolated occurrences are warnings. This structural change is provisional pending labeled evaluation.
- Revert the provisional one-sided sentence-range change after development-seed recall fell; the original range gate remains in place.
- Reject Chinese mined-rule matches that start or end inside a segmented word; segmentation can vary with runtime ICU data.
- Exclude CC-BY-NC-SA and CC-BY-NC-ND license identifiers from the English over-hyphenation warning.
- Clarify that agent workflows use the local Node analyzer and editor-specific discovery requires verification.
- Restore concise EN/ID page and social titles while retaining canonical descriptions.
- Localize navigation and footer copy, and prevent narrow-screen brand/control and long-heading overflow.
- Localize the coverage use cases and experimental-language explanation across all eight website locales.
- Localize coverage headings, editorial intents, positioning and diagnostic explanations in the static locale pages.
- Display the dated public security-audit snapshot and Socket's audited commit without implying coverage of unpublished changes.
- Apply the same lexical/domain penalties to short texts while keeping statistical rhythm skipped.
- Verify strong/weak severity for one fixture in each taxonomy category.
- Match per-token NFC/NFD variants in newly mined rules; non-Chinese rules avoid partial combining sequences. Existing rules are not retrofitted.
- Report unreadable browser preferences without interrupting analysis, including on the 404 page.
- Replace native compression with a shared deterministic JavaScript fixed-Huffman DEFLATE implementation; ratios differ from earlier releases and need threshold review.
- Report clipboard and preference-storage failures, clean up clipboard fallback elements, and read gate status directly from analyzer output.
- Preserve observed Unicode variants in newly mined rules without duplicating existing mined or legacy rules.
- Synchronize the Indonesian canonical position across skill, README and LLM files, and align English and Indonesian page descriptions and social metadata.
- Make newly mined n-gram rules match punctuation-separated corpus tokens and unspaced Chinese, while avoiding duplicate legacy rules.
- Reject unknown or missing generated documentation markers, and test stale JSON and Indonesian examples in an isolated copy.
- Treat 40% brief JSON size as a typical-case goal, not a hard limit; preserve complete matches even for very long findings.
- Map sentence offsets without constructing unbounded regular expressions, preventing failures on long prose and markup while preserving UTF-16 locations.
- Shorten the README while retaining examples and moving the reusable GitHub Actions example to the CLI reference.
- Compact suppressed findings in `--json --brief` while retaining identification, location, offsets and directive details; full JSON preserves all fields.
- Use each localized page's description in its SoftwareApplication JSON-LD instead of falling back to English; retain the canonical positions for English and Indonesian.
- Show the canonical Indonesian product position on the Indonesian demo route and during interface language changes.
- Refresh the README project layout to reflect the current source tree.
- Update the README comparison table to distinguish eight lexical packs, selected bounded pattern checks, clustering, and domain hygiene.
- Align the README lead with the canonical product position and qualify experimental language coverage across locale metadata and FAQ.
- Preserve paragraph context around scoped ignore comments so sequence findings can be reported or suppressed consistently.
- Use Agent Skills-compatible scalar metadata tags and validate the skill with the official reference validator.
- Document the report schema and source-coordinate fields alongside the generated JSON example.
- Require an explicit local Node version preflight in the agent workflow; document corpus limitations and unknown original retrieval dates.
- Rename localized playground samples as references rather than verified examples.
- Disable ignore directives conservatively for MDX containing backticks to prevent template text from suppressing unrelated findings.
- Report inactive ignore directives in fenced or ambiguous code contexts through both warning fields.
- Extend English staging, inflated-significance, and chat-residue checks for additional specified examples; findings remain editorial heuristics requiring contextual review.
- Derive the playground lexical health indicator from the analyzer delivery gate rather than a hardcoded list of rule types.
- Load browser rule packs on demand, cache successful loads and fall back to experimental universal analysis with a visible resource warning.
- Route stdin by an optional filename and preserve explicit domain selection.
- Limit file-level ignore directives to the first 10 physical lines; reject ambiguous Markdown inline directives with warnings, and report exact-match allowlisted and directive-suppressed findings.
- Restore bilingual skill discovery intents and document negative triggers in skill metadata; explicitly include de-AI, UI-copy and natural-writing requests.
- Replace undated security-audit claims with dated, bounded statements in the README; the Snyk listing reports WARN, medium risk, analyzed 2026-11-04, for third-party content exposure, while Socket and Gen Agent Trust Hub report PASS. The README badge and demo status labels remain unchanged; only the dated audit prose records the WARN result.
- Revise flagged prose in the README and this changelog without ignore directives.
- Reference `SECURITY.md` and private vulnerability reporting from `.github/CONTRIBUTING.md`.

### Fixed

- Correct the Indonesian example explanation and document ICU-dependent Chinese mined-rule boundaries.
- Fix Claude Code plugin discovery by declaring the root skill directory in its manifest.
- Make pattern-miner tie ordering independent of locale collation.
- Correct short-text rhythm documentation and verify analyzer options against CLI help.

## 1.5.0

- Require eight prose sentences before applying rhythm statistics; continue lexical and selected domain checks on short inputs.
- Add explicit domain selection, phrase allowlists, severity labels, and basic ignore directives.
- Add multi-file CLI input, glob patterns, and a minimum-score option.
- Split core and demo tests; report synthetic fixture pass rate over 16 multilingual and four domain samples without presenting it as real-world accuracy.
- Add source-scoped UTF-16 offsets, conservative ignore handling, and fence-aware Markdown sanitization.
- Keep browser rhythm gates marked SKIP for short inputs and select repeated findings by source offset.
- Review a small source-attributed exploratory corpus; labels are assumed and results are not population estimates.

## 1.4.1

- Include the demo sample catalog needed by the benchmark in the npm package.

## 1.4.0

- Add paragraph rhythm, repeated n-gram, domain hygiene and Delivery Gate diagnostics.
- Add fingerprint aliases and an eight-language synthetic benchmark.

## 1.3.0

- Expand the multilingual playground and discovery assets.
