# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `pnpm typecheck` — `tsc --noEmit`
- `pnpm run build` — typecheck + rolldown bundle to `dist/cli.js`
- `pnpm run build:examples` — build the CLI, then run it against `examples/` → `out/` (HTML)
- `pnpm run dev` — local dev runner (`scripts/dev.mjs`)
- Conversion is the `process` subcommand: `mashay process [src] [--out <dir>] [--template <name>] [--theme <name>]`. `src` given → build directly; omitted → interactive file picker. Bare `mashay` (no subcommand) prints help. `mashay docs [topic]` explores the Markdown formatting rules.
- `pnpm lint` / `pnpm lint:fix` — biome check (double quotes, 2-space indent, import organizing)
- `pnpm run release` — `commit-and-tag-version`: bumps `package.json` version from conventional commits since the last tag, writes `CHANGELOG.md`, commits + tags. Does not push or publish.
- Publish flow: `pnpm run release` → `git push --follow-tags origin main`. Pushing the `v*` tag triggers `.github/workflows/publish.yml`, which publishes to npm via **trusted publishing** (OIDC, no token) using the `npm` CLI (pnpm v11's native publish isn't used for the OIDC step), then cuts a GitHub release. Do not `pnpm publish` locally anymore — that would double-publish. The npm side needs a one-time Trusted Publisher config on npmjs.com (repo `draekien/mashay`, workflow `publish.yml`).

## Package management

- pnpm with a strict `node_modules` layout: transitive packages (e.g. `@types/mdast`, `@types/hast`, `vfile`) are NOT resolvable unless added as direct dependencies of this package, even if already present transitively.
- All dependency versions in `package.json` are exact-pinned (no `^`/`~` prefix). Match this when adding packages — `pnpm add` defaults to range versions and needs manual correction.
- `pnpm-workspace.yaml` has `allowBuilds: lefthook: true`, which lets lefthook's own postinstall run automatically — there is no `prepare` script for this, don't add one back.
- Publishes to the public npm registry as the scoped package `@draekien/mashay`; `publishConfig.access: "public"` makes the scoped publish public. The binary name is `mashay`. Registry auth is machine-level, not repo-specific. The published `files` are `dist`, `templates`, and `themes`.
- Tailwind is a runtime dependency: `tailwindcss`, `@tailwindcss/node`, `@tailwindcss/typography`, and `@tailwindcss/oxide` (the native binary) are kept external from the rolldown bundle.

## Git hooks

lefthook runs on pre-commit: `pnpm typecheck`, then `biome check --write` on staged JS/TS/JSON files (fixes are re-staged automatically).

## Testing

- `pnpm test` — runs `pretest` (`pnpm run build`) then `vitest run`. Tests exercise the built CLI/pipeline, so a stale or missing `dist/` isn't an issue.
- `src/lib/frontmatter.test.ts`, `toc.test.ts`, `file-discovery.test.ts` — unit tests for those modules.
- `src/lib/pipeline.test.ts` — black-box tests of the composed unified/remark/rehype `processor` (alerts, heading numbering, mermaid, appendix wrapping).
- `src/cli.integration.test.ts` — spawns the real built `dist/cli.js` against the fixtures in `examples/`.
- HTML output is asserted with vitest snapshots (`__snapshots__/*.snap`). When a snapshot changes, review the diff manually against the expected behavior rather than blindly re-running with `-u` — a snapshot can silently bless a regression.
- To update snapshots and actually prune obsolete entries, run `pnpm vitest run -u` directly — `pnpm test -- -u` reports obsolete entries but doesn't remove them.
- New fixture-backed tests (e.g. `cli.integration.test.ts`) should use real files committed under `examples/`, following `example.md` — not markdown/binary fixtures synthesized at runtime with `writeFile`.

## Template/theme architecture

- Layout and styling are separated across three colocated files. A template is `templates/<name>/template.html` (HTML skeleton, chrome authored with Tailwind utilities referencing `var(--color-*)` tokens) plus a colocated `templates/<name>/template.css` (non-colour tokens `--font/spacing/radius/transition/z-*`, the component CSS layer, and the typography plugin's `--tw-prose-*` mappings). A theme is `themes/<name>/theme.css` and contains **colour tokens only** — a standardized `--color-*` set that every template is written against, so any theme pairs with any template. `build.ts` compiles `@import "tailwindcss"` + typography plugin + theme colours + template CSS per document (a fresh compiler per doc — `compiler.build` accumulates candidates otherwise). One template/theme ships: `academic`. They default-pair but mix-and-match is supported via `--template`/`--theme`; unknown names error with the available list.
- `src/lib/build.ts` resolves the template/theme, then compiles the theme with Tailwind v4 + `@tailwindcss/typography`, scans each assembled page for used classes, and inlines only the needed CSS into a single `<style>` — so output is one self-contained `.html`. A document with a Mermaid diagram is the one exception: it loads the Mermaid renderer from a CDN at view time.

## Skill maintenance

- `.claude/skills/using-mashay/SKILL.md` orients agents encountering this repo cold. It deliberately does **not** reproduce the mutable rule tables (frontmatter fields, flags, alert markers, exit codes, appendix/TOC specifics); it defers those to `mashay docs`/`--help` so it can't drift from actual behavior. Keep it that way — when CLI behavior changes, the fix is `src/lib/formatting-docs.ts` (which backs `mashay docs`), not the skill. Only touch the skill when a durable mental model, invocation pattern, or gotcha it teaches actually changes.
- `src/lib/formatting-docs.ts` backs the `mashay docs` CLI command and is the source of truth the skill points agents at.
- The skill is distributed standalone via `npx skills`, so its body must reference only files bundled under the skill directory (`assets/`), never repo-relative paths like `../../../examples/`. `.claude/skills/using-mashay/assets/example.md` and `assets/example-obsidian.md` are copies of `examples/example.md` and `examples/example-obsidian.md` — keep them in sync when the examples change.

## Docs maintenance

- `README.md` is a lean landing page (what mashay is, a quick-start, a docs index, the skill install, license); the detailed docs live in `docs/`. Keep both in sync with code the same way `SKILL.md` is: a change to the behavior a doc describes updates that doc in the same change.
- Which file covers what: `docs/cli.md` (subcommands, flags/args, interactive mode, installing), `docs/exit-codes.md` (the exit-code taxonomy — mirrors `src/lib/errors.ts` and `mashay docs exit-codes`), `docs/templates-and-themes.md` (the template/theme model), `docs/markdown.md` (frontmatter fields, headings/TOC, alerts, code blocks, mermaid, appendix, Obsidian syntax — mirrors `src/lib/formatting-docs.ts`), `docs/contributing.md` (project layout, dev commands, publishing).
- The Markdown authoring rules have two sources of truth to update together: `docs/markdown.md` and `src/lib/formatting-docs.ts` (the `using-mashay` skill defers to the latter via `mashay docs` rather than duplicating the rules). The exit-code table has two: `docs/exit-codes.md` and `EXIT_CODE_TABLE` in `src/lib/errors.ts`. README/docs cross-links are repo-relative (`./docs/*.md`, `../examples/*`) — keep them resolving when files move.

## Gotchas

- A module-level `/g`-flagged `RegExp` shares `lastIndex` across calls: if `.test()` runs first, a later `.matchAll()` on the same object inherits the stale `lastIndex` and can silently scan from mid-string, finding zero matches. Reset `re.lastIndex = 0` immediately before each independent use (see `remark-obsidian-embeds.ts`).

## Design context

- `PRODUCT.md` — the durable product record (users, purpose, positioning, binding constraints, brand, evidence) authored via the Impeccable `init` flow. It captures product truth only, never visual/aesthetic decisions (those live in `DESIGN.md`). Read it to understand who mashay is for and what future work must preserve; update it — not `DESIGN.md` — when product facts change.
- `DESIGN.md` — the visual system spec (tokens, typography, components, do's/don'ts) for the `academic` template + theme, describing the CSS-custom-property token system in `themes/academic/theme.css`. Read it before changing a template, theme, or any rendered-HTML feature.

## Code style

- never write inline comments with the purpose of explaining your reasoning or your code.
- code must be self-documenting and rank low on cognitive complexity.
- document module exports appropriately using well structured JSDoc comments.
- JSDoc comments must not contain implementation detail. They are there to orient the consumers of the module export.
- never use type casting. narrow types with type narrowing/assertion functions instead, or parse objects through zod schemas.
