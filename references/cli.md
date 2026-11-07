# CLI reference

Run the local analyzer with `node <skill_dir>/scripts/analyze.mjs --stdin --json`; consult `--help` for its current options. Input modes are `--stdin`, `--file <path>`, or positional paths and quoted glob patterns. Add `--stdin-filename <name>` to route stdin as if it came from that filename. Select language with `--lang`; use `--profile` for a voice profile, `--domain` to select a domain, `--no-domain-lint` to disable domain checks, `--min-score` to set a score threshold, and `--delivery-gate` for a readable gate. `--allow` is only for explicit user-requested exemptions; `--no-ignore` disables directives and allowlists for a strict audit. `--config <path>` specifies an explicit configuration file; `--no-config` disables configuration discovery and loading. By default, `.humanizerrc.json` is discovered from the current working directory upward to the filesystem root. CLI flags take precedence over configuration values. `--format human|json|sarif|github` selects the output format; `--json` is an alias for `--format json`, and `--brief` projects a compact JSON report.

Fingerprint with `node <skill_dir>/scripts/fingerprint.mjs --dir <samples_dir> --out <profile.json>`; `--input` and `--output` are aliases. Both tools run locally and require Node.js 18.3.0 or later.

JSON and brief JSON include `rhythmEvaluated` and `failedGates`. Fewer than eight sentences skip rhythm statistics and include a `warning`. `failedGates` is empty for PASS or SKIP; on FAIL it names the conditions that failed. Human-readable output also shows rhythm coverage, warnings, and failed gates. SARIF 2.1.0 output emits structural diagnostics under `runs[0].results` with URI artifact locations and region offsets. GitHub format emits `::error` and `::warning` workflow commands with property- and message-escaped characters for PR annotations.

## GitHub Actions

To run the analyzer from source against another repository without an npm release:

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
      - name: Annotate pull request
        run: node .humanizer-lint/scripts/analyze.mjs --file README.md --lang auto --format github
      - name: Export SARIF report
        if: always()
        run: node .humanizer-lint/scripts/analyze.mjs --file README.md --lang auto --format sarif > results.sarif
```
