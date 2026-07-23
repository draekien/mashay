# CLI reference

Run it from anywhere without installing anything permanently:

```bash
npx @draekien/mashay process [src] [--out <dir>] [--template <name>] [--theme <name>]
```

Conversion is the `process` subcommand. `[src]` is a single `.md` file or a
directory of `.md` files; give it and mashay builds directly. Omit it and mashay
drops into an interactive multi-select file picker. Running bare `mashay` with
no subcommand prints help.

```bash
npx @draekien/mashay process ./my-doc.md
npx @draekien/mashay process ./docs --out ./html
```

With no source path, mashay recursively scans the current directory for `.md`
files, groups them by folder, and lets you multi-select which ones to build and
set the output directory:

```bash
npx @draekien/mashay process
```

Each `<file>.md` becomes `<file>.html` in the output directory. `--out`
defaults to `out` in the current directory.

When building a batch, a failing document doesn't abort the run — the rest still
build, and each failure is reported to stderr. The process exit code encodes
what went wrong (see [Exit codes](./exit-codes.md)).

`--version` prints the CLI version, useful for checking which release `npx`
resolved:

```bash
npx @draekien/mashay --version
```

`mashay preview [--template <name>] [--theme <name>]` renders a built-in sample
document with the chosen template/theme, serves it from an in-memory local HTTP
server, and opens it in your default browser — nothing is written to disk. It's
for eyeballing a template/theme combination; the server runs until you stop it
with Ctrl+C.

Run it with no flags and mashay prompts you to pick a template, then a theme,
from those installed. Passing a flag locks that dimension in and skips its
prompt, so you're only asked about what you left out; pass both flags to skip
the picker entirely:

```bash
npx @draekien/mashay preview                    # pick template + theme interactively
npx @draekien/mashay preview --template academic  # pick only the theme
npx @draekien/mashay preview --template academic --theme academic  # no prompts
```

`mashay docs [topic]` prints the Markdown formatting rules documented in
[Markdown conventions](./markdown.md) (frontmatter, headings, alerts, code
blocks, mermaid, appendix, Obsidian syntax) — omit `[topic]` for an interactive
browser, or pass a topic id (e.g. `mashay docs alerts`) to print one directly:

```bash
npx @draekien/mashay docs
npx @draekien/mashay docs alerts
```

Each HTML output is a single self-contained document (styles and logo inlined)
that can be shared or emailed directly, with one exception: see
[Mermaid diagrams](./markdown.md#mermaid-diagrams).

## Installing

If you'll be converting documents regularly, install the CLI instead of using
`npx` on every run:

```bash
pnpm add -D @draekien/mashay
# or globally: pnpm add -g @draekien/mashay
# or with npm: npm install -g @draekien/mashay
```

Then invoke it directly:

```bash
mashay process [src] [--out <dir>] [--template <name>] [--theme <name>]
mashay process
```
