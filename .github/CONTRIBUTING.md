# Contributing

Fork the repository and open a focused pull request explaining the user-visible change. Keep runtime and development dependencies at zero and behavior deterministic. Add regression tests for non-trivial changes.

Run `npm test`, `npm run benchmark`, `node scripts/docs-snapshot.mjs --check`, and `npm pack --dry-run`. Preserve Node 18.3.0 compatibility and the existing script import restrictions. Do not add root Markdown files beyond the existing documented set.

When updating the package version, use `npm version` or update `package-lock.json` alongside `package.json`. Dependabot proposes weekly updates to pinned GitHub Actions and npm metadata; review the version comment and commit SHA together.
