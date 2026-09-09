# Templates and themes

mashay separates *layout* from *styling*:

- **Templates** are `templates/<name>/template.html` (an HTML skeleton whose
  chrome and layout are authored with Tailwind utility classes referencing
  `var(--color-*)` tokens) plus a colocated `templates/<name>/template.css` — the
  non-colour design tokens (fonts, spacing, radii, transitions, z-index), the
  component/structural CSS, and the typography plugin's `--tw-prose-*` mappings.
- **Themes** are `themes/<name>/theme.css` files containing **colour tokens
  only** — a standardized `--color-*` set that every template is written
  against. Swapping the theme swaps the palette; because the token names are
  shared, any theme pairs with any template.

Select them with `--template <name>` (default `academic`) and `--theme <name>`
(default `harbor`). Six templates ship, each a different document world built on
the same colour-token contract:

- **`academic`** (the default) — a calm executive brief: navy masthead, a sticky
  navigation rail, teal numbered heading chips, serif body.
- **`swiss`** — International Typographic Style: a system grotesque, thick
  section rules, and the section numbers hung large in a left gutter.
- **`handbook`** — a screen-documentation interface: a sticky left nav rail
  carrying the table of contents beside a comfortable reading column.
- **`editorial`** — a literary long-read: a centred serif display nameplate, a
  drop cap, rule-underlined section labels, and blockquotes set as pull-quotes.
- **`blueprint`** — engineering drafting: a grid-paper ground, monospace chrome,
  and a bordered corner title block.
- **`journal`** — a scientific preprint: a centred title/author block, an
  Abstract box, a classical Contents list, and justified serif body.

They pair with six themes: `harbor` (the default), `slate`, `oxblood`, `forest`,
`plum`, and `sepia`. Template and theme are chosen independently, so any theme
pairs with any template:

```bash
mashay process ./my-doc.md --theme sepia
mashay process ./my-doc.md --template blueprint --theme slate
```

Unknown template or theme names error with the list of available names. The
architecture is built so more templates and themes can be added later.

## Custom templates and themes

`--template` and `--theme` also take a **directory path** — any value carrying a
path separator (`./brand`, `../shared/house-style`, an absolute path) is read as
a directory on disk rather than a bundled name. mashay looks for
`template.html`/`template.css` in the `--template` directory and `theme.css` in
the `--theme` directory, so one directory can serve as both.

Start from a bundled pair rather than a blank file:

```bash
mashay eject ./brand --template swiss --theme oxblood
# ejected brand/template.html
# ejected brand/template.css
# ejected brand/theme.css

mashay process ./my-doc.md --template ./brand --theme ./brand
```

A bare directory name is *not* read as a path — `--template brand` looks for a
bundled template called `brand` and errors. Write `./brand`.

Two constraints apply to an ejected copy:

- **Relative `@import`s in `template.css`/`theme.css` don't resolve.** The CSS is
  compiled with mashay's own package as the Tailwind base directory, so
  `@import "tailwindcss"` resolves out of mashay's dependencies and
  `@import "./tokens.css"` does not. Keep each file self-contained.
- **A custom theme must define the whole `--color-*` set.** Templates are written
  against the standardized token contract; a token the theme omits resolves to
  nothing wherever the template uses it. Editing the values in an ejected
  `theme.css` is safe — deleting declarations is not.

The `template.html` skeleton is filled by substituting `{{title}}`,
`{{description}}`, `{{eyebrow}}`, `{{logo}}`, `{{metaGrid}}`, `{{changelog}}`,
`{{toc}}`, `{{content}}`, `{{styles}}`, and `{{mermaid}}`. Chrome is authored
with Tailwind utilities referencing `var(--color-*)`, and the generated
component classes (`.heading-number`, `.toc`, `.alert-*`, `.code-block`,
`.appendix-entry`, `.changelog`, `.mermaid-wrapper`, `.doc-info-*`) are
available to any template.

At build time, Tailwind v4 and `@tailwindcss/typography` compile only the CSS
the page actually uses, and it's inlined into a single `<style>` block — so the
output is one self-contained `.html` file. The only exception: a document
containing a Mermaid diagram still loads Mermaid's renderer from a CDN at view
time.

> _Coming later: a `--style` preview command for browsing template/theme
> combinations._
