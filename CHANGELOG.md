# Changelog

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
