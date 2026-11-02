# Domain checks and limits

`--domain auto` routes checks using a known filename; stdin without a filename is prose-first. Explicit `--domain prose|copywriting|code|ui` selects the requested checks. Copywriting checks include weak CTA and hyperbole signals. Code checks inspect selected comments; UI checks include selected accessibility and responsive-layout signals. Use `--no-domain-lint` to skip domain checks.

These checks are heuristics, not a full programming-language parser or a replacement for axe-core, Lighthouse, manual accessibility testing, legal review, or an authorship detector. Preserve source semantics and executable logic.
