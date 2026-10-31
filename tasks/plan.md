# Implementation Plan: v1.1.0 growth, SEO, and playground

## Decisions
- Branch from merged PR #4; owner retains merge and release control.
- Version fields move to `1.1.0` in this PR only. No tag, GitHub Release, or npm publish.
- Query `?lang=` overrides the UI for that visit only; it does not overwrite saved language.
- Security badges link to the supplied public skills.sh audit URLs. The unsupported `97.8%` claim is omitted.
- Diagnostics remain an engine-preserving, clickable findings list with sentence excerpts.

## Ordered work
1. Lock current fixture outputs and add failing contracts for query samples, static assets, metadata, and package/skill discovery.
2. Add reusable static-demo data and client behaviors: sample URLs, metric cards, clickable diagnostics, copy actions, and localized chrome.
3. Add crawlable static metadata/content/assets: SVGs, JSON-LD, robots, sitemap, llms files, and technical explanation.
4. Update package/SKILL/README/CI for v1.1.0 discovery and public install flows.
5. Build, test, browser-verify local and deployed output, then open one PR. Deployment/release only at the user-approved boundary.

## Risks
- Browser support for Clipboard API requires a secure context; provide a native selection fallback and test it.
- Static default HTML must remain crawlable while language switching remains client-local.
- Metrics UI must report actual analyzer output, never fabricated thresholds or guarantees.
