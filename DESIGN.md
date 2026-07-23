---
name: mashay
description: Visual design system for mashay — the product-wide architecture, token contract, and invariants every template and theme upholds, with the academic template + theme as the shipped reference implementation.
colors:
  header-navy: "#023e5c"
  brand-teal: "#0c7e96"
  teal-glow: "#90dfef"
  teal-wash: "#f2fbfd"
  amber-badge: "#ffb733"
  ink: "#1b242d"
  paper: "#ffffff"
  surface: "#f0f3f6"
  rule-line: "#dbe0e6"
  slate-muted: "#7c8a98"
  code-night: "#0f1419"
typography:
  display:
    fontFamily: "'Segoe UI Variable Text', 'Segoe UI', system-ui, sans-serif"
    fontSize: "clamp(1.75rem, 1.25rem + 2.2vw, 2.5rem)"
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: "-0.01em"
  headline:
    fontFamily: "'Segoe UI Variable Text', 'Segoe UI', system-ui, sans-serif"
    fontSize: "1.625rem"
    fontWeight: 600
    lineHeight: 1.25
  title:
    fontFamily: "'Segoe UI Variable Text', 'Segoe UI', system-ui, sans-serif"
    fontSize: "1.3125rem"
    fontWeight: 600
    lineHeight: 1.25
  body:
    fontFamily: "Charter, 'Bitstream Charter', 'Sitka Text', Cambria, Georgia, serif"
    fontSize: "1.0625rem"
    fontWeight: 400
    lineHeight: 1.7
  label:
    fontFamily: "'Segoe UI Variable Text', 'Segoe UI', system-ui, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 700
    letterSpacing: "0.05em"
rounded:
  sm: "2px"
  md: "4px"
  lg: "8px"
spacing:
  xxs: "4px"
  xs: "8px"
  sm: "16px"
  md: "24px"
  lg: "32px"
  xl: "48px"
components:
  toc-link:
    textColor: "{colors.brand-teal}"
    rounded: "{rounded.sm}"
    padding: "4px 8px"
  toc-link-hover:
    backgroundColor: "{colors.teal-wash}"
    textColor: "{colors.brand-teal}"
  heading-chip:
    backgroundColor: "{colors.brand-teal}"
    textColor: "{colors.paper}"
    rounded: "{rounded.md}"
    size: "1.75rem"
  status-badge:
    backgroundColor: "{colors.amber-badge}"
    rounded: "{rounded.sm}"
    padding: "2px 8px"
  masthead:
    backgroundColor: "{colors.header-navy}"
    textColor: "{colors.paper}"
    padding: "32px 32px 24px"
---

# Design System: mashay

## 1. Overview

This is the visual design system for **mashay** as a product: the architecture,
the token contract, and the invariants that hold for *every* template and theme
mashay renders — not just the one that ships today. It has two levels:

- **The system** — how styling is structured, the standardized token contract
  every template is written against, and the cross-cutting rules
  (self-containment, the numbered spine, accessibility, token-only styling) that
  any template or theme must honour to belong to mashay.
- **A template + theme** — one committed aesthetic built on that contract, each
  bringing its own Creative North Star. Exactly one ships today: **academic**,
  documented in sections 2–6 as the reference implementation. Its concrete
  tokens populate this file's frontmatter.

### The two-layer architecture

Styling is split across colocated layers so colour and everything-else vary
independently:

- **`themes/<name>/theme.css` — colour tokens only.** A theme is a pure
  palette: it defines just the standardized `--color-*` custom properties, the
  token contract every template is written against. A new theme is authored by
  overriding this same set of names with new values.
- **`templates/<name>/template.css` + `template.html` — everything
  template-specific.** The non-colour design tokens (`--font-*`, `--spacing-*`,
  `--radius-*`, `--transition-*`, `--z-*`), the component/structural rules, and
  the `--tw-prose-*` mappings — all referencing the theme's colour tokens. The
  chrome and layout are Tailwind utility classes in `template.html` (also
  referencing the colour tokens), and the Markdown body is styled by
  `@tailwindcss/typography`'s `prose` classes with those `--tw-prose-*` values
  re-asserted on top.

Because the colour tokens are standardized, **any theme pairs with any
template**. A new template brings its own `template.html` + `template.css`; a
new theme only retunes the palette.

### System invariants (every template & theme)

These are product-level, not academic-specific — a new template or theme
inherits them:

- **Self-contained output.** Styles and any logo inline into a single HTML file;
  web fonts are prohibited, so type comes from system-resident stacks. A feature
  may pull a runtime CDN dependency (as a Mermaid diagram loads its renderer at
  view time) only when it is declared to require network access to render.
- **Token-only styling.** Every colour, space, radius, and duration is a
  `var(--*)` reference — no raw hex, px, or z-index (see **The Token Rule**). A
  theme retunes the whole look by overriding tokens.
- **The numbered spine.** Generated heading numbering (1, 1.1, A for appendices)
  with `tabular-nums` in the TOC is mashay's structural signature; a template
  preserves it rather than inventing competing markers (see **The Numbered Spine
  Rule**).
- **Accessibility floor.** Body text clears WCAG AA (4.5:1); every transition
  pairs an explicit property + easing with a `prefers-reduced-motion: reduce`
  override.
- **Authority from structure, not decoration.** The rendered document earns
  trust through numbering, hierarchy, and ruled dividers — never gradients,
  hype, or ornament.

### The academic reference implementation

**Creative North Star: "The Executive Brief"**

Every academic-themed document is a calm executive briefing: a clear agenda (the
sticky table of contents), numbered sections, disciplined metadata, and no
noise — everything in service of a decision. The reader should feel handed a
prepared, authoritative brief, not a rendered README. Design authority comes
from structure — numbering, ruled dividers, a branded masthead — never from
decoration.

academic is a strict application of the design tokens (colours in
`themes/academic/theme.css`, the rest in `templates/academic/template.css`). It
explicitly rejects generic SaaS marketing (no
gradients, no hype), the dry Word-doc export (unstyled walls of text), the
dev-tool README (monospace-heavy, unstyled), and academic-paper austerity. It
is a reading surface: a single measured column (max 44rem, ~70ch) on white
paper, flanked by a quiet navigation rail, opened by a deep-navy masthead that
carries the entire accent moment.

**academic's key characteristics:**
- Token-only styling — every color, space, radius, and duration is a `var(--*)` reference defined in the theme, so a new theme retunes the whole look by overriding tokens.
- One saturated accent moment (the navy masthead); the body is calm ink-on-paper.
- Structure as ornament: numbered heading chips, tabular TOC numerals, ruled section breaks.
- Flat, border-delineated surfaces; 4px-grid spacing; small radii (2/4/8px).
- Self-contained output: styles and any logo inline in a single HTML file.

## 2. Colors

Sections 2–6 document the **academic** reference implementation. Rules marked
*(system-wide)* are invariants every template/theme inherits; the rest are
academic's own expression of them.

A restrained strategy: ink on paper with one teal voice, anchored by a single
drenched navy masthead.

### Primary
- **Header Navy** (#023e5c, `--color-tertiary-900`): the masthead background — the one drenched brand surface per document, deep blue underscored by a 4px Brand Teal rule; its internal hairline uses `--color-tertiary-700`.
- **Brand Teal** (#0c7e96, `--color-primary-600`): the working accent — links, TOC entries, `h2` heading chips, appendix letters. It marks "interactive or structural," never decorative fill.
- **Teal Glow** (#90dfef, `--color-primary-400`): eyebrow and doc-ID text on the navy masthead only — legible brand color on the dark surface.
- **Teal Wash** (#f2fbfd, `--color-primary-100`): hover tint behind TOC links; the only background use of the brand hue.

### Secondary
- **Amber Badge** (#ffb733, `--color-secondary-600`): status badges in the masthead (DRAFT, FINAL) with near-black amber-1000 text. Nowhere else.

### Neutral
- **Ink** (#1b242d, `--color-text`): all body copy.
- **Paper** (#ffffff, `--color-background`): the page.
- **Surface** (#f0f3f6, `--color-neutral-200`): table/code headers, inline-code background.
- **Rule Line** (#dbe0e6, `--color-neutral-300`): every border and divider — tables, code blocks, appendix entries, section rules, footer.
- **Slate Muted** (#7c8a98, `--color-neutral-600`): labels, TOC numbers, captions, footer text — metadata voice, never body copy.
- **Code Night** (#0f1419, `--color-neutral-1000`): code block background with white text.

Status colors follow the semantic scales: alert callouts use
`--color-information-*` (info), `--color-alert-*` (warn), and `--color-error-*`
(error) — 100-series tinted background with the 600-series accent.

### Named Rules
**The One Masthead Rule.** Header Navy appears exactly once, as the document
masthead. The body never uses dark or saturated surfaces except code blocks.

**The Token Rule** *(system-wide).* No raw hex, px, or z-index values —
prohibited. Every value resolves to a `--color-*`, `--spacing-*`, `--radius-*`,
`--shadow-*`, `--z-*`, or `--transition-*` token from the token set.

## 3. Typography

**Display Font:** "Segoe UI Variable Text" / "Segoe UI" (system-ui fallbacks) — the structure voice
**Body Font:** Charter / "Bitstream Charter" / "Sitka Text" / Cambria / Georgia — the reading voice
**Label/Mono Font:** browser monospace default for code

**Character:** A two-voice document: quiet sans for everything structural
(masthead, headings, TOC, labels, tables, alert titles) and a high-quality
system serif for long-form prose — the contrast that marks "prepared brief"
rather than "webpage." Both stacks are system-resident: output must stay
self-contained, so web fonts are prohibited.

### Hierarchy
- **Display** (600, clamp(1.75rem → 2.5rem), 1.15, -0.01em, balanced): the document title, white on the navy masthead. One per document.
- **Headline** (600, 1.625rem, 1.25): `h2` sections in sans, led by a teal numbered chip; all but the first open with a ruled top border.
- **Title** (600, 1.3125rem, 1.25): `h3` subsections in sans with muted inline numbers (1.1, 1.2).
- **Body** (400, 1.0625rem serif, 1.7): ink on paper in a max 44rem column (~66ch); paragraphs and list items use `text-wrap: pretty`.
- **Label** (700, 0.6875–0.75rem sans, 0.05–0.06em tracking, UPPERCASE): masthead eyebrow, metadata labels, table and code headers — the "brief stamp" voice.

### Named Rules
**The Numbered Spine Rule** *(system-wide).* Every `h2`/`h3`/`h4` carries
generated numbering (1, 1.1, A for appendices) with `tabular-nums` in the TOC.
Numbering is the document's spine; never suppress it or add competing markers.

**The Two Voices Rule.** Serif is for reading (body prose, blockquotes, the
masthead subtitle in italic); sans is for structure (headings, labels, TOC,
tables, alert titles). Never mix the voices within one role. Never load a web
font *(system-wide)* — self-containment outranks typographic novelty, and this
holds for every template and theme.

## 4. Elevation

The system is flat. Depth is conveyed entirely by 1px Rule Line borders,
Surface-tinted headers, and small radii — shadow tokens exist in the token
set but this surface uses none at rest. The only layered moment is the Mermaid
lightbox: a full-viewport scrim (`--color-overlay`, 50%) at
`--z-component-modal` with a white content panel.

### Named Rules
**The Ruled-Not-Raised Rule.** Containers (tables, code blocks, appendix
entries, the revision-history disclosure, diagrams) are delineated by a 1px
`--color-neutral-300` border and `--radius-medium` corners — never by drop
shadows.

## 5. Components

### Masthead (signature)
- **Style:** Header Navy band, white display title, Slate/neutral-400 subtitle, optional inlined logo (2rem, light wordmark; configured per document via the `logo` frontmatter field, empty by default), 4px Brand Teal bottom rule.
- **Eyebrow row:** uppercase Teal Glow eyebrow + doc ID, optional Amber status badge.
- **Meta grid:** auto-fit columns of label/value pairs (author, date, version) above a tertiary-700 hairline.

### Table of Contents
- **Style:** sticky left rail (14rem), collapsing above content on narrow viewports; print-hidden.
- **Links:** Brand Teal, 0.9rem, `--radius-small`; hover fills with Teal Wash over `--transition-fast` ease-in-out.
- **Numbers:** Slate Muted, `tabular-nums`; appendices grouped separately with letters.

### Heading Chips
- **Shape:** 1.75rem square, `--radius-medium`.
- **Style:** Brand Teal fill, white 700-weight number, inline-flex beside the `h2` text.

### Alert Callouts
- **Style:** 100-series tinted background, full 1px border in the matching 300-series (Ruled-Not-Raised — no side-stripes), `--radius-medium`, 600-weight sans title in the 800-series color for AA contrast.
- **Variants:** four styles following Obsidian callout semantics — NOTE/TIP/IMPORTANT → info (information scale), SUCCESS/CHECK/DONE → success (success scale), WARNING/CAUTION/QUESTION → warn (alert scale), DANGER/ERROR/FAILURE/BUG → error (error scale).

### Tables & Code Blocks
- **Tables:** 1px Rule Line frame with `--radius-medium`, Surface uppercase label header, row hover tint (neutral-100), no vertical rules.
- **Code:** Code Night block inside a ruled container with a Surface header bar carrying uppercase language tag and filename; inline code sits on Surface with `--radius-small`.
- **Syntax highlighting:** applied at build time (highlight.js classes) on the Code Night surface. A restrained four-hue theme, all chosen from the light end of their scale to clear WCAG AA (4.5:1) on `--color-neutral-1000`: Brand Teal (`--color-primary-400`) for keywords/literals; secondary teal-adjacent amber (`--color-secondary-400` strings, `--color-secondary-500` numbers/meta); tertiary blue (`--color-tertiary-400` titles/names, `--color-tertiary-500` attributes/types); `--color-neutral-500` italic comments; `--color-error-400` deletions. No fifth hue — restraint over exhaustive token coverage.

### Revision History (Changelog)
- **Style:** a collapsed-by-default `<details class="changelog">` disclosure at the top of the content column, inside `<main>` and above the article body — sharing the appendix entry's visual language rather than a standalone band.
- **Container:** 1px Rule Line border, `--radius-medium`, no shadow (Ruled-Not-Raised).
- **Summary:** 600-weight sans at 0.9375rem; native marker replaced by the same right-aligned CSS chevron as appendix entries, rotating over `--transition-fast`; Teal Wash hover fill; inset 2px Brand Teal `focus-visible` outline; a Rule Line divider appears once open.
- **Table:** borderless — hairline neutral-200 row dividers only; `th` is uppercase 0.6875rem Slate Muted with a neutral-300 underline (the Label voice).

### Appendix Entries
- **Style:** collapsible `<details>` cards — 1px Rule Line border, `--radius-medium`, 600-weight sans summary row with a teal letter (A, B, C).
- **Disclosure:** the native marker is replaced by a right-aligned CSS chevron that rotates from down to up over `--transition-fast`; the whole summary row is the hit target, fills with Teal Wash on hover (matching TOC links), and takes an inset 2px Brand Teal `focus-visible` outline.
- **Open state:** a Rule Line divider separates the summary from the revealed content.

### Mermaid Diagrams
- **Style:** centered inside a ruled container, `zoom-in` cursor; click opens the lightbox (scrim + white panel, `zoom-out` to dismiss).

## 6. Do's and Don'ts

The token, numbered-spine, self-containment, and accessibility do's below are
system-wide invariants; the anti-references (no SaaS marketing, Word-doc export,
dev-tool README, or academic-paper density) are academic's committed rejections,
which a future template may restate in its own terms.

### Do:
- **Do** reference tokens for every value — colors, spacing (4px grid), radii (2/4/8px), transitions. The Token Rule is absolute.
- **Do** keep the masthead as the single accent-saturated surface; body surfaces stay Paper, Surface, and Rule Line.
- **Do** keep any masthead logo a light wordmark on the navy masthead, sized to the 2rem slot; the logo is configured per document and inlined, not bundled.
- **Do** preserve the numbered spine (chips, tabular TOC numerals, lettered appendices) in any new template or theme.
- **Do** keep body text at Ink (#1b242d) on Paper — 4.5:1+ contrast; Slate Muted is for metadata only, never paragraphs.
- **Do** pair every transition with an explicit property and easing (`background var(--transition-fast) ease-in-out`) and a `prefers-reduced-motion: reduce` override.

### Don't:
- **Don't** drift toward "generic SaaS marketing" — no gradients, no hero metrics, no glassmorphism, no hype styling.
- **Don't** regress to the "dry Word-doc export" — unstyled walls of text with no masthead, TOC, or numbering.
- **Don't** let output feel like a "dev-tool README" — monospace-heavy, unstyled, utilitarian.
- **Don't** adopt "academic paper" density — no two-column layouts, no footnote thickets.
- **Don't** add drop shadows to resting surfaces — the Ruled-Not-Raised Rule governs all containers.
- **Don't** use Amber outside masthead status badges, or `--color-special-*` / `--color-ai-*` anywhere in documents.
- **Don't** widen the reading column past 44rem or shrink body copy below 1rem — the brief must read comfortably end-to-end.
