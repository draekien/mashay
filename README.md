# mashay

Converts Markdown into self-contained, styled HTML documents — a single file
with all styles (and any logo) inlined, ready to share or email.

## Quick start

Run it from anywhere without installing anything permanently:

```bash
npx @draekien/mashay process ./my-doc.md          # build one file
npx @draekien/mashay process ./docs --out ./html  # build a directory
npx @draekien/mashay process                      # pick files interactively
```

Conversion is the `process` subcommand; each `<file>.md` becomes `<file>.html`
in the output directory (`--out`, default `out`). Running bare `mashay` prints
help. See the [CLI reference](./docs/cli.md) for installing, flags, and the
`mashay docs` explorer.

## Documentation

- [CLI reference](./docs/cli.md) — commands, flags, interactive mode, installing
- [Exit codes](./docs/exit-codes.md) — what each `process` exit code means
- [Templates and themes](./docs/templates-and-themes.md) — layout vs. styling, `--template`/`--theme`
- [Markdown conventions](./docs/markdown.md) — frontmatter, headings, alerts, code blocks, mermaid, appendix, Obsidian syntax
- [Contributing](./docs/contributing.md) — project layout, development commands, publishing

## Claude Code skill

Agents using [Claude Code](https://claude.com/claude-code) can install the
`using-mashay` skill straight from this repo:

```bash
npx skills add draekien/mashay --skill using-mashay
```

This installs `.claude/skills/using-mashay/SKILL.md`, which explains how to
invoke the CLI and how to author Markdown its pipeline understands.

## License

MIT
