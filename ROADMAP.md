# Roadmap

Planned work that isn't scheduled yet. Items here are directional, not commitments.

## Light/dark mode in templates

Today a theme is **colour tokens only**, and every template is authored for a
light surface. That makes a true dark theme impossible to express as a theme
alone: several tokens do double duty that only reconciles on a light page —
for example `--color-primary-600` is both the page link colour and the
heading-chip background (which has fixed light text), and `--color-neutral-200`
is both the masthead's metadata text (on the always-dark masthead) and the
page's code/table-header surfaces. On a light page one value serves both; on a
dark page they pull in opposite directions.

The intended fix is to make **mode** a first-class dimension of a template
rather than something a theme fakes:

- Let a template define light and dark surface mappings, splitting the
  double-duty tokens (masthead-text vs. page-surface, link vs. chip) so a dark
  surface renders correctly.
- Add mode selection to the CLI: a `--mode <light|dark|auto>` flag on `process`
  and `preview`, plus an interactive control in the pickers (alongside template
  and theme). `auto` would honour the reader's `prefers-color-scheme`.
- Keep output self-contained — an `auto` document ships both surfaces inline and
  switches via media query, with no extra request.

This unblocks the shelved **midnight** dark theme, which the current
colour-only contract can't render legibly.
