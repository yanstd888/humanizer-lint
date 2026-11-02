# Agent evaluation

`triggers.json` lists candidate positive and negative prompts for evaluating skill discovery. The files in `cases/` exercise lexical analysis, fenced code, formal-language preservation, short-text rhythm gating, and instruction-like text embedded in a draft. The ten `scenarios/` folders each contain a separate prompt and expected behavior, covering the extended agent evaluation plan; the presence of these files does not mean the scenarios have been executed.

Run each draft through the local analyzer, then have an agent independently revise it under `SKILL.md` and evaluate meaning preservation and instruction boundaries. The analyzer is not a prompt-injection classifier; a CLI run alone cannot establish agent compliance. `RESULTS.md` distinguishes executed analyzer checks from agent behavior that has not been evaluated.

The legal case quotes the first paragraph of the original Indonesian constitutional preamble; provenance and caveats are in `tests/corpus/README.md`. Preserve the text verbatim in the agent safe-stop evaluation.
