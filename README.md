# mashay

Converts Markdown into self-contained, styled HTML documents — a single file
with all styles (and any logo) inlined, ready to share or email.

The name is *mâché*, as in papier-mâché (say it "mash-AY"): mashay layers your
Markdown — content, styles, logo, everything — into one finished, self-contained
document, the way papier-mâché layers paper into a single solid object.

## Quick start

Run it from anywhere without installing anything permanently:

```bash
npx @draekien/mashay process ./my-doc.md          # build one file
npx @draekien/mashay process ./docs --out ./html  # build a directory
npx @draekien/mashay process                      # pick files interactively
npx @draekien/mashay preview                       # preview a template/theme in the browser
```

Conversion is the `process` subcommand; each `<file>.md` becomes `<file>.html`
in the output directory (`--out`, default `out`). `mashay preview` opens a
built-in sample in your browser to try a template/theme combination without a
file of your own, prompting you to pick the template and theme. Running bare
`mashay` prints help. See the
[CLI reference](./docs/cli.md) for installing, flags, and the `mashay docs`
explorer.

## Documentation

- [CLI reference](./docs/cli.md) — commands, flags, interactive mode, installing
- [Exit codes](./docs/exit-codes.md) — what each `process` exit code means
- [Templates and themes](./docs/templates-and-themes.md) — layout vs. styling, `--template`/`--theme`, and the bundled themes (`harbor`, `slate`, `oxblood`, `forest`, `plum`, `sepia`)
- [Markdown conventions](./docs/markdown.md) — frontmatter, headings, alerts, code blocks, mermaid, appendix, Obsidian syntax
- [Contributing](./docs/contributing.md) — project layout, development commands, publishing

## Agent skill

Coding agents can install the `using-mashay` skill straight from this repo:

```bash
npx skills add draekien/mashay --skill using-mashay
```

This installs the `using-mashay` skill, which explains how to invoke the CLI
and how to author Markdown its pipeline understands.

## License

MIT
