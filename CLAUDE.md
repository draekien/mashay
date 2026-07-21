# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `pnpm typecheck` — `tsc --noEmit`
- `pnpm run build` — typecheck + rolldown bundle to `dist/cli.js`
- `pnpm run build:whitepapers` — build the CLI, then run it against `whitepapers/src/` → `whitepapers/dist/` (HTML)
- `pnpm lint` / `pnpm lint:fix` — biome check (double quotes, 2-space indent, import organizing)
- `pnpm run release` — `commit-and-tag-version`: bumps `package.json` version from conventional commits since the last tag, writes `CHANGELOG.md`, commits + tags. Does not push or publish.
- Publish flow: `pnpm run release` → `git push --follow-tags origin main` → `pnpm publish` (the `prepublishOnly` script runs `pnpm run build` automatically).

## Package management

- pnpm with a strict `node_modules` layout: transitive packages (e.g. `@types/mdast`, `@types/hast`, `vfile`) are NOT resolvable unless added as direct dependencies of this package, even if already present transitively.
- All dependency versions in `package.json` are exact-pinned (no `^`/`~` prefix). Match this when adding packages — `pnpm add` defaults to range versions and needs manual correction.
- `pnpm-workspace.yaml` has `allowBuilds: lefthook: true`, which lets lefthook's own postinstall run automatically — there is no `prepare` script for this, don't add one back.
- Publishes to the public npm registry as the unscoped package `mashay` (no `publishConfig`, no `.npmrc`); registry auth is machine-level, not repo-specific.

## Git hooks

lefthook runs on pre-commit: `pnpm typecheck`, then `biome check --write` on staged JS/TS/JSON files (fixes are re-staged automatically).

## Testing

- `pnpm test` — runs `pretest` (`pnpm run build`) then `vitest run`. Tests exercise the built CLI/pipeline, so a stale or missing `dist/` isn't an issue.
- `src/lib/frontmatter.test.ts`, `toc.test.ts`, `file-discovery.test.ts` — unit tests for those modules.
- `src/lib/pipeline.test.ts` — black-box tests of the composed unified/remark/rehype `processor` (alerts, heading numbering, mermaid, appendix wrapping).
- `src/cli.integration.test.ts` — spawns the real built `dist/cli.js` against `whitepapers/src/example-whitepaper.md`.
- HTML output is asserted with vitest snapshots (`__snapshots__/*.snap`). When a snapshot changes, review the diff manually against the expected behavior rather than blindly re-running with `-u` — a snapshot can silently bless a regression.
- To update snapshots and actually prune obsolete entries, run `pnpm vitest run -u` directly — `pnpm test -- -u` reports obsolete entries but doesn't remove them.
- New fixture-backed tests (e.g. `cli.integration.test.ts`) should use real files committed under `whitepapers/src/`, following `example-whitepaper.md` — not markdown/binary fixtures synthesized at runtime with `writeFile`.

## Skill maintenance

- `.claude/skills/using-mashay/SKILL.md` documents CLI usage and whitepaper Markdown authoring rules for agents encountering this repo cold. When CLI behavior changes (frontmatter fields, CLI flags/args, TOC/appendix/heading-numbering rules, alert blockquote markers, Mermaid handling), update this skill in the same change so it doesn't drift from actual behavior.
- `src/lib/formatting-docs.ts` backs the `mashay docs` CLI command and mirrors this skill's rules — update both together.

## Gotchas

- A module-level `/g`-flagged `RegExp` shares `lastIndex` across calls: if `.test()` runs first, a later `.matchAll()` on the same object inherits the stale `lastIndex` and can silently scan from mid-string, finding zero matches. Reset `re.lastIndex = 0` immediately before each independent use (see `remark-obsidian-embeds.ts`).

## Design context

- `DESIGN.md` — the visual system spec (tokens, typography, components, do's/don'ts) for `whitepapers/template/`. Read it before changing the template, CSS, or any rendered-HTML feature.
