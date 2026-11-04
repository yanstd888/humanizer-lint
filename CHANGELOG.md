# Changelog

## Unreleased

- Bind evaluation regression baselines to development prompt provenance as well as corpus content.

- Add six explicitly assistant-authored, related AI examples to the incomplete development corpus; their prompt descriptions are post-hoc.

- Show evaluation group metrics, rule counts, and requested sweep results in table output.

- Refuse evaluation regression comparisons when the recorded development corpus differs or is missing; evaluation JSON includes the development texts and metadata for exact comparison.

- Add a public-domain United States Declaration of Independence excerpt to the preliminary development corpus; evaluation remains incomplete.

- Reject evaluation corpus entries when their recorded word counts do not match the files.

- Generalize the English short paired-closer finding to repeated opening tokens at paragraph endings; isolated occurrences are warnings. This structural change is provisional pending labeled evaluation.

- Treat a one-sided sentence-range gap as a warning rather than a failed gate or score deduction; this structural change remains provisional pending a larger labeled evaluation.

- Report skipped rhythm statistics and failed verdict gates in analysis output without changing scores or verdicts.

- Add a preliminary evaluation harness and three-source development seed; the seed has no AI samples and cannot measure recall or AUC.
- Add a security policy and private vulnerability reporting guidance; include homepage, repository, and keywords in plugin manifests.

- Reject Chinese mined-rule matches that start or end inside a segmented word; segmentation can vary with runtime ICU data.
- Correct the Indonesian example explanation and document ICU-dependent Chinese mined-rule boundaries.
- Exclude CC-BY-NC-SA and CC-BY-NC-ND license identifiers from the English over-hyphenation warning.
- Clarify that agent workflows use the local Node analyzer and editor-specific discovery requires verification.
- Recognize the uncontracted English staged openings “Here is the thing:” and “Here is the kicker:”.
- Restore concise EN/ID page and social titles while retaining canonical descriptions.
- Localize navigation and footer copy, and prevent narrow-screen brand/control and long-heading overflow.
- Localize the coverage use cases and experimental-language explanation across all eight website locales.
- Localize coverage headings, editorial intents, positioning and diagnostic explanations in the static locale pages.
- Display the dated public security-audit snapshot and Socket's audited commit without implying coverage of unpublished changes.
- Apply the same lexical/domain penalties to short texts while keeping statistical rhythm skipped.
- Detect the specific life-changing guarantee in copywriting; direct negation is not flagged.
- Verify strong/weak severity for one fixture in each taxonomy category.
- Match per-token NFC/NFD variants in newly mined rules; non-Chinese rules avoid partial combining sequences. Existing rules are not retrofitted.

- Add a regression for the blueprint's “The future looks bright” example.
- Report unreadable browser preferences without interrupting analysis, including on the 404 page.
- Replace native compression with a shared deterministic JavaScript fixed-Huffman DEFLATE implementation; ratios differ from earlier releases and need threshold review.
- Report clipboard and preference-storage failures, clean up clipboard fallback elements, and read gate status directly from analyzer output.
- Preserve observed Unicode variants in newly mined rules without duplicating existing mined or legacy rules.
- Synchronize the Indonesian canonical position across skill, README and LLM files, and align English and Indonesian page descriptions and social metadata.
- Make newly mined n-gram rules match punctuation-separated corpus tokens and unspaced Chinese, while avoiding duplicate legacy rules.
- Recognize selected same-sentence English and Indonesian named attributions when reviewing borrowed-authority phrases; citation validity is not checked.
- Reject unknown or missing generated documentation markers, and test stale JSON and Indonesian examples in an isolated copy.
- Treat 40% brief JSON size as a typical-case goal, not a hard limit; preserve complete matches even for very long findings.
- Map sentence offsets without constructing unbounded regular expressions, preventing failures on long prose and markup while preserving UTF-16 locations.
- Shorten the README while retaining examples and moving the reusable GitHub Actions example to the CLI reference.
- Compact suppressed findings in `--json --brief` while retaining identification, location, offsets and directive details; full JSON preserves all fields.
- Fix Claude Code plugin discovery by declaring the root skill directory in its manifest.
- Use each localized page's description in its SoftwareApplication JSON-LD instead of falling back to English; retain the canonical positions for English and Indonesian.
- Add regression coverage for specified English, Indonesian, and Chinese taxonomy examples.
- Include the canonical product position in localized SoftwareApplication JSON-LD and test the English and Indonesian variants.
- Add a regression check for one triggering fixture in each of the 26 writing-pattern categories; fixture coverage is not real-world calibration.
- Cover additional blueprint examples for Indonesian stacked qualifiers, English participial tails and a paired staged closer.
- Check the blueprint's multilingual SEO phrases across the combined README and demo source surfaces, without treating keyword presence as proof of search ranking.
- Show the canonical Indonesian product position on the Indonesian demo route and during interface language changes.
- Add a fact-grounded Indonesian revision example and verify its reported status, score and lexical finding against the CLI.
- Refresh the README project layout to reflect the current source tree.
- Update the README comparison table to distinguish eight lexical packs, selected bounded pattern checks, clustering, and domain hygiene.
- Align the README lead with the canonical product position and qualify experimental language coverage across locale metadata and FAQ.
- Preserve paragraph context around scoped ignore comments so sequence findings can be reported or suppressed consistently.
- Use Agent Skills-compatible scalar metadata tags and validate the skill with the official reference validator.
- Add bounded mixed double-quote and delayed-decision weak signals; preserve quoted text and document heuristic limits.
- Detect exact heading/opening repetition as an experimental weak signal for ATX headings.
- Detect consecutive bold-label list items as a weak signal, with scoped suppression and paragraph clustering when applicable.
- Detect decorative ATX headings as an experimental weak signal and expand selected Indonesian and English weak phrases.
- Document the report schema and source-coordinate fields alongside the generated JSON example.
- Require an explicit local Node version preflight in the agent workflow; document corpus limitations and unknown original retrieval dates.
- Rename localized playground samples as references rather than verified examples.

- Disable ignore directives conservatively for MDX containing backticks to prevent template text from suppressing unrelated findings.
- Report inactive ignore directives in fenced or ambiguous code contexts through both warning fields.
- Extend English staging, inflated-significance, and chat-residue checks for additional specified examples; findings remain editorial heuristics requiring contextual review.
- Make pattern-miner tie ordering independent of locale collation.
- Derive the playground lexical health indicator from the analyzer delivery gate rather than a hardcoded list of rule types.
- Guard the Git index against tracked files larger than 1 MiB during the standard test suite.
- Add the missing regex, translation, accessibility-audit and PDF-summary negative discovery prompts; execution of the new prompts remains pending.
- Check the marked README JSON example against live CLI output, including duplicate or missing marker detection.
- Load browser rule packs on demand, cache successful loads and fall back to experimental universal analysis with a visible resource warning.
- Include the original OFL notices for all three self-hosted font families in the static site.
- Add English and Indonesian participial-tail signals as warnings unless clustered with other weak signals.
- Add ten agent evaluation scenario pairs; behavioral execution remains pending.

- Add experimental consecutive two-word sentence-opening and paired-sentence contrast diagnostics.
- Add experimental paragraph-local clustering for selected weak signals, including triads, passive openings and dash frequency; one or two are warnings and three or more affect scoring after suppression. Honor a matching custom voice profile's dash frequency.
- Add initial English, Indonesian and Chinese staging diagnostics, plus selected chatbot-residue, attribution, significance and disclaimer patterns.

- Add a local differential n-gram miner with opt-in rule writing and exploratory corpus metrics.

- Add Claude Code and Cursor plugin manifests for the existing root skill.

- Add schema version, original-source line/column coordinates, and compact JSON output with full finding and suppression details; abbreviated gate blocks are documented.

- Route stdin by an optional filename and preserve explicit domain selection.
- Limit file-level ignore directives to the first 10 physical lines; reject ambiguous Markdown inline directives with warnings, and report exact-match allowlisted and directive-suppressed findings.

- Add strict `--no-ignore` audits without suppressing directive or allowlist findings.

- Generate localized static playground entry points, localized FAQ schema, and a raster social preview.

- Add agent input trust, anti-gaming and fact-preservation boundaries, interactive critique, runtime preflight, and modular CLI/domain references.

- Correct short-text rhythm documentation and verify analyzer options against CLI help.

- Add canonical product positioning and version consistency checks across discovery surfaces.

- Restore bilingual skill discovery intents and document negative triggers in skill metadata; explicitly include de-AI, UI-copy and natural-writing requests.

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
