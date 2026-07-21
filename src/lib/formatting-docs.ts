export interface FormattingTopic {
  id: string;
  title: string;
  summary: string;
  example?: string;
}

// Kept in sync with .claude/skills/using-mashay/SKILL.md — update both when
// pipeline behavior (frontmatter fields, alert markers, Obsidian syntax, etc.) changes.
export const FORMATTING_TOPICS: FormattingTopic[] = [
  {
    id: "frontmatter",
    title: "Frontmatter",
    summary:
      "Every field is optional. Unrecognized extra fields pass through without error, but a field of the wrong shape (e.g. a non-string title, or reviewers given as a string instead of a list) fails the build. Omit title and the output's <title> falls back to the source filename.\n\n" +
      "status renders as a small badge above the title; when omitted, no eyebrow is rendered at all. version, date, author, reviewers (comma-joined), and classification render as a meta grid below the subtitle — each only appears when set, and the whole grid is omitted when none of the five are set.\n\n" +
      "logo is an optional path to an image (SVG or a raster format like PNG/JPEG), resolved relative to the Markdown source file, inlined into the masthead logo slot — SVGs embedded as-is, raster images as a base64 data: URI. Omit it and the masthead renders with no logo.\n\n" +
      'changelog is an optional list of { version, date, description } entries (date/description optional, version required). When present it renders as a collapsed "Revision History" disclosure at the top of the content column, rows in the given order.',
    example: [
      "---",
      "title: A Field Guide to Coffee Brewing",
      "description: How grind size, water, and time shape a cup.",
      "author: Jane Researcher",
      "logo: logo.svg",
      "date: 2026-07-13",
      "status: Draft",
      'version: "1.0"',
      "reviewers:",
      "  - Jane Doe",
      "  - John Smith",
      "classification: Internal",
      "changelog:",
      '  - version: "1.0"',
      "    date: 2026-07-13",
      "    description: Initial release.",
      "---",
    ].join("\n"),
  },
  {
    id: "headings",
    title: "Headings and numbering",
    summary:
      "# is reserved for the auto-generated document title — start body sections at ##. Headings auto-number (1, 1.1, 1.1.1), resetting deeper counters whenever a shallower heading appears.\n\n" +
      "In the main body, the sidebar TOC only lists ## and ### levels; #### is still numbered but omitted from the TOC — reserve #### for detail that doesn't need direct navigation. Headings under the Appendix follow a different rule (see the appendix topic).\n\n" +
      "Anchor links use the heading text slugified (lowercased, hyphenated), ignoring the generated number.",
    example: "[see The Problem](#the-problem)",
  },
  {
    id: "alerts",
    title: "Alert blockquotes",
    summary:
      "GitHub-style alert blockquotes, grouped into four visual styles following Obsidian's callout semantics (important and hint are aliases of tip; caution and attention are aliases of warning — only genuinely negative types render as errors). The five GitHub markers map as: [!NOTE], [!TIP], and [!IMPORTANT] → info; [!WARNING] and [!CAUTION] → warn.\n\n" +
      "Obsidian's broader callout vocabulary is also recognized case-insensitively — [!ABSTRACT]/[!SUMMARY]/[!TLDR]/[!INFO]/[!TODO]/[!HINT]/[!EXAMPLE]/[!QUOTE]/[!CITE] → info; [!SUCCESS]/[!CHECK]/[!DONE] → success; [!QUESTION]/[!HELP]/[!FAQ]/[!ATTENTION] → warn; [!DANGER]/[!ERROR]/[!FAILURE]/[!FAIL]/[!MISSING]/[!BUG] → error. Obsidian's optional trailing fold indicator ([!TIP]+ or [!TIP]-) is accepted but ignored — the alert box is never collapsible.\n\n" +
      "The marker must be the first line of the blockquote. Text on the same line as the marker becomes a separate paragraph below the alert title, same as text on following lines.\n\n" +
      "A blockquote with no recognized marker renders as an ordinary <blockquote> — no special styling.",
    example: "> [!NOTE]\n> Some contextual detail.",
  },
  {
    id: "mermaid",
    title: "Mermaid diagrams",
    summary:
      "Diagrams render client-side and are click-to-zoom (opens a lightbox on click). The Mermaid renderer script is only inlined into files that actually contain a mermaid code block — a document with a diagram needs internet access at view time, since the renderer loads from a CDN rather than being inlined.",
    example: "```mermaid\nflowchart LR\n    A[Start] --> B[End]\n```",
  },
  {
    id: "appendix",
    title: "Appendix section",
    summary:
      'A ## Appendix heading (matched case-insensitively on its text, ignoring any number prefix) switches every following ### into its own lettered numbering (A, B, C, ...) and every following #### into a sub-level under that letter (A.1, A.2, ...), gives them a separate "Appendix" group in the TOC, and wraps each ### (and its content) in a collapsible <details> element using the heading as the <summary>. Unlike the main body, both ### and #### appear in the Appendix TOC.\n\n' +
      "Put ## Appendix last. Appendix lettering never reverts to normal numbering, even after another ## heading — a ## placed after the appendix gets no number and is dropped from every TOC, while its own ###/#### children keep advancing the appendix letter sequence. Avoid this structure entirely; treat the appendix as the document's final section.\n\n" +
      "Only ### headings under the appendix become collapsible entries; other content placed directly under ## Appendix, before its first ###, sits outside any <details> wrapper.",
  },
  {
    id: "code-blocks",
    title: "Code blocks",
    summary:
      "A fenced code block with a language tag renders in a bordered .code-block with a header showing the language, and is syntax-highlighted at build time (highlight.js common languages; an unrecognized language renders unhighlighted). Add a meta word after the language to show it as a filename in the header instead. A fence with no language tag renders as a plain <pre><code> with no header or highlighting. Mermaid fences are handled separately and never get this wrapping.",
    example: "```ts app.ts\nconst x = 1;\n```",
  },
  {
    id: "obsidian-wikilinks",
    title: "Obsidian: wikilinks",
    summary:
      "mashay is often run directly against a Markdown file exported from (or still living in) an Obsidian vault. There is no vault-wide concept of what other notes will ever be published as HTML, so wikilinks render as plain text — nothing 404s.\n\n" +
      "[[Note]], [[Note|Alias]], [[Note#Heading]], [[Note#Heading|Alias]] all render as plain text: the alias if given, else Note › Heading, else just the bare target or heading. They are never turned into <a> links.",
    example:
      "[[Related Note]]\n[[Related Note#Some Heading|the relevant section]]",
  },
  {
    id: "obsidian-embeds",
    title: "Obsidian: image embeds",
    summary:
      "![[image.png]] resolves the file relative to the source Markdown file (searching downward through subdirectories, then upward through ancestor directories and their attachments folders — common vault layouts), then inlines it as a base64 data: URI, matching mashay's self-contained-output philosophy.\n\n" +
      "![[image.png|300]] sets a pixel width; ![[image.png|alt text]] (non-numeric) sets alt text instead. An embed that can't be resolved to a file, or resolves to a non-image file, falls back to plain text (the alt/target name) rather than leaving raw ![[...]] markup in the output.",
    example:
      "![[diagram.png]]\n![[diagram.png|300]]\n![[diagram.png|A nice diagram]]",
  },
  {
    id: "obsidian-inline",
    title: "Obsidian: highlights, comments, block references",
    summary:
      "Highlights — ==text== renders as <mark>text</mark>.\n\n" +
      "Comments — %%text%% is stripped entirely. Only matches within a single paragraph/line — a comment spanning a blank line is not stripped.\n\n" +
      "Block references — a trailing ^block-id at the very end of a block is stripped (the anchor has no meaning outside the vault); a caret elsewhere in the text (e.g. 2^10) is left alone.",
    example:
      "This is ==important== and has a comment. %%not rendered%% It also has a block ref. ^ref-1",
  },
  {
    id: "obsidian-tables",
    title: "Obsidian: wikilinks inside GFM tables",
    summary:
      "A bare [[Note]] works in a table cell with no changes needed. An aliased wikilink's | collides with the table's own column separator, since GFM tokenizes table cells before any wikilink parsing runs — escape it as [[Note\\|Alias]] (backslash before the pipe) so the cell parses correctly; [[Note#Heading|Alias]] needs the same escape.",
    example:
      "| Term | Related |\n| --- | --- |\n| Plain | [[Related Note]] |\n| Aliased | [[Related Note\\|Alias]] |",
  },
  {
    id: "constraints",
    title: "Formatting constraints",
    summary:
      "Tables, strikethrough, autolinks, and task lists (GitHub-flavored Markdown) are all supported. Raw HTML embedded in the Markdown is rendered through — inline (e.g. <span>) and block-level elements both pass into the output.",
  },
];
