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

At build time, Tailwind v4 and `@tailwindcss/typography` compile only the CSS
the page actually uses, and it's inlined into a single `<style>` block — so the
output is one self-contained `.html` file. The only exception: a document
containing a Mermaid diagram still loads Mermaid's renderer from a CDN at view
time.

> _Coming later: a `--style` preview command for browsing template/theme
> combinations._
