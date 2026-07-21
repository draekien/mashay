import { describe, expect, it } from "vitest";
import { processor } from "./pipeline.js";

async function render(
  markdown: string,
): Promise<{ html: string; data: Record<string, unknown> }> {
  const file = await processor.process(markdown);
  return { html: String(file), data: file.data };
}

describe("alert blockquotes", () => {
  it("turns a bare [!NOTE] marker into an info alert with just a title", async () => {
    const { html } = await render("> [!NOTE]\n");
    expect(html).toMatchSnapshot();
  });

  it("keeps text on the marker line as a separate paragraph inside the alert", async () => {
    const { html } = await render("> [!NOTE] Extra detail on the same line.\n");
    expect(html).toMatchSnapshot();
  });

  it("leaves an ordinary blockquote with no marker untouched", async () => {
    const { html } = await render("> Just a quote, no marker.\n");
    expect(html).toMatchSnapshot();
  });

  it.each([
    ["WARNING", "warn"],
    ["IMPORTANT", "info"],
    ["CAUTION", "warn"],
    ["TIP", "info"],
  ])("maps [!%s] to the alert-%s visual style", async (marker, style) => {
    const { html } = await render(`> [!${marker}]\n`);
    expect(html).toContain(`alert alert-${style}`);
  });
});

describe("heading numbering", () => {
  it("numbers h2/h3 sequentially and resets the sub-counter on the next h2", async () => {
    const { html } = await render("## First\n\n### Sub\n\n## Second\n");
    expect(html).toMatchSnapshot();
  });

  it("records the same outline in file.data.toc", async () => {
    const { data } = await render("## First\n\n### Sub\n\n## Second\n");
    expect(data.toc).toEqual([
      { level: 0, id: "first", number: "1", text: "First" },
      { level: 1, id: "sub", number: "1.1", text: "Sub" },
      { level: 0, id: "second", number: "2", text: "Second" },
    ]);
  });

  it("excludes the Appendix heading itself from numbering and from the toc", async () => {
    const { html, data } = await render("## Appendix\n");
    expect(html).toMatchSnapshot();
    expect(data.toc).toEqual([]);
  });
});

describe("appendix numbering", () => {
  it("numbers appendix h3 subsections with letters, recorded separately from the main toc", async () => {
    const { data } = await render(
      "## Appendix\n\n### Methodology\n\n### Glossary\n",
    );
    expect(data.toc).toEqual([]);
    expect(data.appendixToc).toEqual([
      { level: 0, id: "methodology", number: "A", text: "Methodology" },
      { level: 0, id: "glossary", number: "B", text: "Glossary" },
    ]);
  });
});

describe("mermaid code blocks", () => {
  it("wraps a mermaid-tagged code fence in a mermaid render target and flags the file", async () => {
    const { html, data } = await render(
      "```mermaid\ngraph TD\n  A --- B\n```\n",
    );
    expect(html).toMatchSnapshot();
    expect(data.hasMermaid).toBe(true);
  });

  it("leaves a non-mermaid code fence as an ordinary code block and does not flag the file", async () => {
    const { html, data } = await render("```js\nconsole.log(1)\n```\n");
    expect(html).not.toContain("mermaid-wrapper");
    expect(data.hasMermaid).toBeUndefined();
  });
});

describe("fenced code blocks", () => {
  it("wraps a code fence with a language in a .code-block with a .code-header showing the language", async () => {
    const { html } = await render("```ts\nconst x = 1;\n```\n");
    expect(html).toMatchSnapshot();
  });

  it("renders the fence's meta string as a filename in the header", async () => {
    const { html } = await render("```ts app.ts\nconst x = 1;\n```\n");
    expect(html).toMatchSnapshot();
  });

  it("leaves a fence with no language as a bare pre/code block", async () => {
    const { html } = await render("```\nplain text\n```\n");
    expect(html).not.toContain("code-block");
  });

  it("syntax-highlights a fence with a known language at build time", async () => {
    const { html } = await render('```ts\nconst x = "hi";\n```\n');
    expect(html).toContain('<span class="hljs-keyword">const</span>');
    expect(html).toContain('<span class="hljs-string">"hi"</span>');
  });

  it("leaves a fence with an unknown language unhighlighted but still wrapped", async () => {
    const { html } = await render("```notalanguage\nfoo bar\n```\n");
    expect(html).toContain("code-block");
    expect(html).not.toContain("hljs-");
  });
});

describe("appendix section wrapping", () => {
  it("wraps each appendix h3 subsection in a collapsible details element with the heading as summary", async () => {
    const { html } = await render(
      "## Appendix\n\n### Methodology\n\nSome body text.\n\n### Glossary\n\nMore text.\n",
    );
    expect(html).toMatchSnapshot();
  });
});

describe("obsidian callout aliases", () => {
  it.each([
    ["ABSTRACT", "info"],
    ["TODO", "info"],
    ["SUCCESS", "success"],
    ["DONE", "success"],
    ["QUESTION", "warn"],
    ["ATTENTION", "warn"],
    ["DANGER", "error"],
    ["FAIL", "error"],
    ["BUG", "error"],
  ])("maps Obsidian callout [!%s] to the alert-%s visual style", async (marker, style) => {
    const { html } = await render(`> [!${marker}]\n`);
    expect(html).toContain(`alert alert-${style}`);
  });

  it("tolerates a trailing +/- fold indicator without rendering it", async () => {
    const { html } = await render("> [!TIP]-\n");
    expect(html).toContain("alert alert-info");
    expect(html).not.toContain("]-");
  });

  it("is case-insensitive on the callout type", async () => {
    const { html } = await render("> [!note]\n");
    expect(html).toContain("alert alert-info");
  });

  it("leaves an unrecognized callout type as a plain unstyled blockquote", async () => {
    const { html } = await render("> [!NOTATYPE] Some text.\n");
    expect(html).not.toContain("alert-");
    expect(html).toContain("[!NOTATYPE]");
  });
});

describe("obsidian highlights", () => {
  it("turns ==highlighted text== into a <mark>", async () => {
    const { html } = await render("Some ==highlighted== text.\n");
    expect(html).toContain("<mark>highlighted</mark>");
  });
});

describe("obsidian comments", () => {
  it("strips %%comment%% text entirely", async () => {
    const { html } = await render("Visible %%hidden%% text.\n");
    expect(html).toContain("Visible  text.");
    expect(html).not.toContain("hidden");
  });
});

describe("obsidian block references", () => {
  it("strips a trailing ^block-id from the end of a block", async () => {
    const { html } = await render("Some claim. ^block-id\n");
    expect(html).toContain("Some claim.");
    expect(html).not.toContain("block-id");
  });

  it("does not strip a caret that isn't a trailing block reference", async () => {
    const { html } = await render("2^10 is 1024.\n");
    expect(html).toContain("2^10 is 1024.");
  });
});

describe("obsidian wikilinks", () => {
  it("renders a bare wikilink as plain text", async () => {
    const { html } = await render("See [[Some Note]] for details.\n");
    expect(html).toContain("See Some Note for details.");
  });

  it("renders an aliased wikilink using the alias", async () => {
    const { html } = await render("See [[Some Note|the note]] for details.\n");
    expect(html).toContain("See the note for details.");
  });

  it("renders a heading-only wikilink as Target › Heading", async () => {
    const { html } = await render("See [[Some Note#A Heading]].\n");
    expect(html).toContain("See Some Note › A Heading.");
  });

  it("renders a heading + alias wikilink using just the alias", async () => {
    const { html } = await render("See [[Some Note#A Heading|the section]].\n");
    expect(html).toContain("See the section.");
  });

  it("does not treat an embed ![[...]] as a wikilink", async () => {
    const { html } = await render("![[missing-image.png]]\n");
    expect(html).not.toContain("[[");
  });
});

describe("obsidian wikilinks inside GFM tables", () => {
  it("renders a plain wikilink in a table cell correctly (no pipe collision)", async () => {
    const { html } = await render(
      "| Name | Link |\n| --- | --- |\n| Row | [[Some Note]] |\n",
    );
    expect(html).toContain("<td>Some Note</td>");
  });

  it("requires the alias pipe to be backslash-escaped to survive GFM table parsing", async () => {
    const { html } = await render(
      "| Name | Link |\n| --- | --- |\n| Row | [[Some Note\\|Alias]] |\n",
    );
    expect(html).toContain("<td>Alias</td>");
  });
});
