# Contributing

## Project layout

```
templates/
  academic/    template.html (Tailwind chrome) + template.css (components, non-colour tokens, prose)
themes/
  academic/    theme.css — colour tokens only (standardized --color-* set)
examples/
  example.md           Neutral sample exercising every feature
  example-obsidian.md  Obsidian-vault syntax sample
src/
  cli.ts    CLI entry point (bin: mashay)
  lib/      Build pipeline: markdown/rehype plugins, TOC rendering,
            frontmatter validation, file discovery, template/theme
            resolution, and Tailwind compilation (build.ts)
out/        Generated HTML output (gitignored)
dist/
  cli.js    Bundled output (rolldown; gitignored)
```

## Working in this repo

```bash
pnpm install
pnpm run build            # typecheck + rolldown bundle to dist/cli.js
pnpm run build:examples   # build the CLI, then convert examples/ → out/
pnpm test                 # build, then run the vitest suite
pnpm run dev              # local dev runner (scripts/dev.mjs)
```

## Publishing

```bash
pnpm run release
git push --follow-tags origin main
pnpm publish
```

`pnpm run release` runs `commit-and-tag-version`, which inspects commits since
the last tag, bumps the version in `package.json` according to
conventional-commit rules (`fix` → patch, `feat` → minor, `BREAKING CHANGE` →
major), writes `CHANGELOG.md`, then creates a `chore(release): x.y.z` commit and
git tag — it does not push or publish.

`dist/` is never committed to git, so the `prepublishOnly` script runs
`pnpm run build` automatically before `pnpm publish`. The published package
contains `dist`, `templates`, and `themes`.
