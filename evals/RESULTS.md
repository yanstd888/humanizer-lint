# Evaluation results

Local analyzer smoke test (distinct from the independent model evaluation below).

| Case | Analyzer status | Findings |
|---|---|---:|
| id-cliche.md | FAIL | 2 |
| legal-safe-stop.md | SKIP | 0 |
| prompt-injection.md | FAIL | 1 |
| readme-code.md | SKIP | 0 |
| short.md | SKIP | 0 |

## Independent model evaluation

A read-only Codex `gpt-5.6-terra` session received the skill, five drafts, and actual local analyzer reports inline because the sandbox blocked file-reading commands. It recognized the embedded injection as untrusted, preserved the legal quotation and code exactly, and reported zero suppressed findings. Its Indonesian rewrite introduced a definitional-opening finding and still failed the analyzer on the first pass. In a separate follow-up supplied with that finding, the model reintroduced the original cliché and again failed. A third attempt, supplied both failure reports and the skill, produced a zero-finding revision with `SKIP` for short input, independently verified by the local analyzer. This is a single synthetic prompt-injection example, not proof of general resistance; the sessions did not independently invoke the analyzer or complete the full skill tool workflow.

In a separate blinded model classification of the skill metadata, 12 positive and 10 negative requests matched the expected selection (22/22). This is not an end-to-end skills.sh or agent discovery test, nor a population accuracy estimate.

Raw local transcripts and follow-up probes are kept outside the repository in the Hermes scratch directory. End-to-end agent tool execution and real skill discovery remain unverified. Claude Code validated the plugin manifest and listed the skill during initialization, but its model request returned HTTP 404; Cursor's plugin runtime and marketplace installation have not been verified.
