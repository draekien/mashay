---
name: using-mashay
description: Explains how to invoke the mashay CLI and how to author Markdown it can convert to self-contained styled HTML — frontmatter, template/theme selection, heading numbering, alert blockquotes, Mermaid diagrams, the Appendix section, Obsidian-vault syntax (wikilinks, embeds, callouts, highlights, comments, block references), and the `mashay docs` command for exploring these rules interactively. Use when converting Markdown with mashay, adding or editing a Markdown source file — especially one sourced from an Obsidian vault — or when the user says "build the docs", "convert this markdown", "run mashay", "mashay docs", or asks about mashay frontmatter, templates, themes, TOC, alert blockquotes, appendix syntax, wikilinks, or embeds.
---

# Convert Markdown with mashay

mashay turns a Markdown file into one styled HTML file. It embeds the CSS, the logo, and any images directly in the file. The result is a single portable `.html` with no extra files beside it.

There is one exception. If a document has a Mermaid diagram, mashay loads code from a CDN to draw the diagram when you open the file. Only those files need internet access to view.

Working with mashay has two halves: running the CLI, and writing Markdown it understands. mashay documents itself. Its `docs` and `--help` output is the up-to-date reference for the exact rules, flags, and codes. This skill is your guide to that reference. It gives you the ideas that stay the same and the commands to look things up. It leaves the details, which shift as the CLI changes, to the CLI.

## Running the CLI

The package is `@draekien/mashay` on npm. The command is `mashay`. Run it with `npx @draekien/mashay …`, or install it (globally or as a dev dependency) and run `mashay` directly. Run `mashay` on its own to print help. Run `mashay --version` to see the installed version — useful for checking which release `npx` picked.

Conversion is the `process` subcommand:

- `mashay process <src>` builds right away. `<src>` is one `.md` file or a directory. A directory builds only its top-level `.md` files, not files in subdirectories.
- `mashay process` with no source starts interactive mode. It searches the whole directory tree for `.md` files, groups them by folder, and asks which files to build and where to put them. (The direct form above searches only the top level.)

Each `<file>.md` becomes `<file>.html` in the output directory. Do not assume a fixed set of options — ask the CLI. `mashay --help` lists the subcommands. `mashay process --help` lists its flags and arguments (output directory, template, theme).

**Template and theme.** A *template* is the HTML shell plus its non-colour styling. A *theme* is a set of colour values only. Any theme works with any template, and each has a default partner, so you can mix them freely. Choose them with the `process` template and theme flags. An unknown name fails with a list of the installed names. Read that list to see what is available.

**Batch builds.** One failed document does not stop the batch. The rest still build. Each failure prints to stderr, and the exit code tells you what kind of failure happened. Run `mashay docs exit-codes` for the full list of codes.

## Writing Markdown mashay can convert

The CLI is the reference for every formatting rule and supported syntax. Run `mashay docs` to browse the topics, or `mashay docs <topic>` to print one (for example, `mashay docs alerts`). Check it before you write or edit a feature. It always matches the installed version, while any copy of the rules goes stale as soon as the CLI changes.

Two files show the full feature set: [assets/example.md](assets/example.md) and [assets/example-obsidian.md](assets/example-obsidian.md). Read them next to the docs instead of guessing at the syntax.

A few ideas stay the same. Know these before you reach for `mashay docs`:

- **`#` is reserved for the document title, which mashay generates.** Start your sections at `##`. mashay is a document generator, not a plain Markdown renderer. It numbers the headings and builds a sidebar table of contents. See `mashay docs headings` for how the numbering works and which levels appear in the contents. See `mashay docs appendix` for how an Appendix section renumbers and collapses.
- **Documents can start with YAML frontmatter** (title, author, dates, logo, revision history, and more). Every field is optional, and the output still works when a field is missing. But a field with the wrong *shape* fails the build. See `mashay docs frontmatter` for the current fields, and `assets/example.md` for a filled-in header.
- **mashay understands Obsidian vault syntax.** You often run it on a file that still lives in a vault. mashay cannot know which other notes will become HTML, so anything that would link to another note (wikilinks, embeds it cannot resolve) becomes plain text. Nothing 404s. There is a `mashay docs` topic for each Obsidian feature.

**Gotcha — aliased wikilinks in tables.** Inside a GFM table, escape the pipe in an aliased wikilink: `[[Note\|Alias]]`. The table splits cells on `|` before it parses wikilinks, so an unescaped pipe breaks the cell. A plain `[[Note]]` in a table is fine. This mistake fails silently. You can spot most authoring errors by eye in the output, but not a broken table cell.
