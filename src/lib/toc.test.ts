import { describe, expect, it } from "vitest";
import { buildToc } from "./toc.js";

describe("buildToc", () => {
  it("renders nothing when there are no toc or appendix items", () => {
    expect(buildToc([], [])).toBe("");
  });

  it("renders a single top-level entry as a numbered anchor link", () => {
    const html = buildToc(
      [{ level: 0, id: "intro", number: "1", text: "Intro" }],
      [],
    );
    expect(html).toBe(
      '<nav class="toc"><p class="toc-label">Contents</p><ul><li><a href="#intro"><span class="toc-number">1</span> Intro</a></li></ul></nav>',
    );
  });

  it("nests a deeper-level entry inside its preceding shallower entry", () => {
    const html = buildToc(
      [
        { level: 0, id: "intro", number: "1", text: "Intro" },
        { level: 1, id: "sub", number: "1.1", text: "Sub" },
      ],
      [],
    );
    expect(html).toBe(
      '<nav class="toc"><p class="toc-label">Contents</p><ul><li><a href="#intro"><span class="toc-number">1</span> Intro</a><ul><li><a href="#sub"><span class="toc-number">1.1</span> Sub</a></li></ul></li></ul></nav>',
    );
  });

  it("preserves item order for siblings at the same level", () => {
    const html = buildToc(
      [
        { level: 0, id: "first", number: "1", text: "First" },
        { level: 0, id: "second", number: "2", text: "Second" },
      ],
      [],
    );
    expect(html.indexOf('href="#first"')).toBeLessThan(
      html.indexOf('href="#second"'),
    );
  });

  it("renders appendix items in a separate labeled nav from the main toc", () => {
    const html = buildToc(
      [{ level: 0, id: "intro", number: "1", text: "Intro" }],
      [{ level: 0, id: "gloss", number: "A", text: "Glossary" }],
    );
    expect(html).toContain('<nav class="toc">');
    expect(html).toContain('<nav class="toc toc-appendix">');
    expect(html).toContain('<p class="toc-label">Appendix</p>');
  });

  it("omits the main toc nav entirely when there are only appendix items", () => {
    const html = buildToc(
      [],
      [{ level: 0, id: "gloss", number: "A", text: "Glossary" }],
    );
    expect(html).not.toContain('<nav class="toc">');
    expect(html).toContain('<nav class="toc toc-appendix">');
  });

  it("omits a third-level (level 2) heading from the rendered toc", () => {
    const html = buildToc(
      [
        { level: 0, id: "intro", number: "1", text: "Intro" },
        { level: 1, id: "sub", number: "1.1", text: "Sub" },
        { level: 2, id: "deep", number: "1.1.1", text: "Deep" },
      ],
      [],
    );
    expect(html).toContain('href="#intro"');
    expect(html).toContain('href="#sub"');
    expect(html).not.toContain('href="#deep"');
  });

  it("omits a third-level appendix heading from the rendered appendix toc", () => {
    const html = buildToc(
      [],
      [
        { level: 0, id: "gloss", number: "A", text: "Glossary" },
        { level: 1, id: "gloss-sub", number: "A.1", text: "Sub" },
        { level: 2, id: "gloss-deep", number: "A.1.1", text: "Deep" },
      ],
    );
    expect(html).toContain('href="#gloss"');
    expect(html).toContain('href="#gloss-sub"');
    expect(html).not.toContain('href="#gloss-deep"');
  });
});
