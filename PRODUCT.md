# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Markdown authors who want great-looking HTML conversions of what they write.
They compose in Markdown — frequently in an Obsidian vault, using its wikilinks,
embeds, callouts, and block references — and reach for mashay when they need to
hand the finished piece to someone who does not share their tools: a report,
spec, brief, or reference doc that must look polished and travel as a single
file.

Coding agents are a first-class secondary consumer: the CLI is designed to be
driven programmatically, and ships the `using-mashay` skill plus a `mashay docs`
command so an agent can author compatible Markdown and invoke the tool correctly
without external context.

## Product Purpose

mashay converts Markdown into a single self-contained, styled HTML document —
all CSS and any logo inlined — that is ready to share or email with nothing to
host. Its name is *mâché*, as in papier-mâché: it layers content, styles, and
logo into one finished, solid object. Success is a plain Markdown file becoming
a document that looks deliberately designed, in one command, with no build
pipeline, hosting, or asset wrangling.

## Positioning

mashay pairs zero-install Markdown-to-HTML conversion with design quality that
markup-conversion tools do not attempt. What a neighbouring tool (Pandoc,
markdown-to-PDF, static site generators) could not truthfully claim in
combination:

- **One self-contained file.** Output is a single `.html` with all styles and
  logo inlined — nothing to host, emailable as-is.
- **Great-looking templates.** The shipped output is a deliberately designed
  reading surface, not a default stylesheet or an unstyled export.
- **Obsidian-native input.** It understands Obsidian vault syntax directly
  (wikilinks, embeds, callouts, block references), not only CommonMark.
- **Template/theme separation.** Layout and colour are separate contracts, so
  any theme pairs with any template.
- **Agent-friendly by design.** A distributed skill and a `docs` command let
  agents author and invoke it correctly on their own.

## Operating Context

Invoked from a terminal, with no permanent install required
(`npx @draekien/mashay ...`) or installed via pnpm/npm for regular use. Three
subcommands:

- `process` — convert a file or directory; omit the source to drop into an
  interactive multi-select file picker. Batches isolate failures and encode the
  cause in the exit code.
- `preview` — render a built-in sample against a chosen template/theme, served
  from an in-memory local server and opened in the browser; nothing written to
  disk. Bare invocation prompts for template then theme.
- `docs` — explore the Markdown formatting rules mashay understands, interactive
  or by topic id.

Bare `mashay` prints help. The primary authoring source is often an Obsidian
vault; the delivery target is email or file-sharing, where a self-contained
document matters.

## Capabilities and Constraints

Confirmed capabilities: YAML frontmatter (title, author, metadata, changelog,
etc.); numbered headings with a sticky table of contents; alert/callout
blockquotes; build-time code syntax highlighting; Mermaid diagrams; an appendix
section; and Obsidian-vault syntax. A template/theme architecture separates a
`template` (HTML skeleton + non-colour tokens + component CSS) from a `theme`
(a standardized `--color-*` palette), compiled per document with Tailwind v4 +
`@tailwindcss/typography`. One template/theme ships today: `academic`.
`--template`/`--theme` mix and match; unknown names error with the available
list.

Durable constraints future work must preserve:

- **Single-file output is the default.** Output is one self-contained `.html`
  with styles and logo inlined; do not regress to multi-file or local
  external-asset output. A CDN dependency is acceptable when a feature needs it
  (as a Mermaid diagram loads its renderer at view time), but any such feature
  must be called out as requiring internet access to render.
- **Any-theme-any-template contract.** The standardized `--color-*` token
  contract must hold so themes and templates stay independently mixable.
- **Zero-install via npx.** Must stay runnable with no permanent install.

## Brand Commitments

Name: **mashay**, published as the scoped npm package `@draekien/mashay` (binary
`mashay`). MIT licensed, open source (`draekien/mashay`). The name is a
deliberate phonetic play on *mâché* ("mash-AY") carrying the papier-mâché
layering metaphor; keep that spelling and pronunciation.

## Evidence on Hand

- `examples/` — real Markdown fixtures (`example.md`, `example-obsidian.md`) used
  by the CLI and integration tests.
- `DESIGN.md` — the visual-system spec for the `academic` template and theme.
- `docs/` — CLI, exit-code, template/theme, Markdown, and contributing
  references; `README.md` is the landing page.
- `.claude/skills/using-mashay/` — the distributed agent skill.

Only the `academic` template/theme exists today; there is no second template or
theme yet, and none should be implied.

## Product Principles

- **Deliver a document, not a page.** The unit of output is one portable,
  self-contained file that looks designed, not a hosted site or a raw export.
- **Author in Markdown, including the Obsidian dialect.** Meet writers where
  they already work rather than forcing a lossy subset.
- **Separate layout from colour.** The template/theme contract keeps styling and
  structure independently composable.
- **Be usable without setup, by humans and agents alike.** Zero-install
  invocation and self-describing `docs`/skill surfaces are load-bearing, not
  conveniences.
- **Authority from structure, not decoration.** The rendered document earns
  trust through numbering, hierarchy, and restraint (see DESIGN.md).
