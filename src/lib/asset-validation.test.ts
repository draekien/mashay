import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  readColorTokens,
  TEMPLATE_PLACEHOLDERS,
  validateTemplate,
  validateTheme,
} from "./asset-validation.js";

const MINIMAL = "<html><head>{{styles}}</head><body>{{content}}</body></html>";

describe("validateTemplate", () => {
  it("accepts a template carrying only the required placeholders", () => {
    expect(validateTemplate(MINIMAL)).toEqual([]);
  });

  it("accepts every documented placeholder", () => {
    const html = TEMPLATE_PLACEHOLDERS.map((name) => `{{${name}}}`).join("\n");
    expect(validateTemplate(html)).toEqual([]);
  });

  it("reports a missing {{content}} placeholder", () => {
    const problems = validateTemplate("<html>{{styles}}</html>");
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain("{{content}}");
  });

  it("reports a missing {{styles}} placeholder", () => {
    const problems = validateTemplate("<html>{{content}}</html>");
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain("{{styles}}");
  });

  it("reports a misspelt placeholder that would survive into the output", () => {
    const problems = validateTemplate(`${MINIMAL}{{tocc}}`);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain("{{tocc}}");
  });

  // Substitution is an exact string match, so `{{ content }}` is never filled —
  // and without this check it would also satisfy the required-placeholder test.
  it("reports a spaced placeholder rather than treating it as known", () => {
    const problems = validateTemplate("<html>{{styles}}{{ content }}</html>");
    expect(problems).toHaveLength(2);
    expect(problems[0]).toContain("missing the {{content}} placeholder");
    expect(problems[1]).toContain("{{ content }}");
  });

  it("collapses a placeholder repeated throughout a template", () => {
    const problems = validateTemplate(`${MINIMAL}{{oops}}{{oops}}`);
    expect(problems).toHaveLength(1);
    expect(problems[0].match(/\{\{oops\}\}/g)).toHaveLength(1);
  });
});

describe("readColorTokens", () => {
  it("reads declared token names and ignores their values", () => {
    const css = ":root { --color-text: #101828; --font-body: serif; }";
    expect(readColorTokens(css)).toEqual(new Set(["text"]));
  });
});

describe("validateTheme", () => {
  it("accepts a theme declaring every required token", () => {
    const css = "--color-text: #101828; --color-background: #ffffff;";
    expect(validateTheme(css, ["text", "background"])).toEqual([]);
  });

  it("reports the tokens a theme omits", () => {
    const problems = validateTheme("--color-text: #101828;", [
      "text",
      "background",
    ]);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain("--color-background");
    expect(problems[0]).not.toContain("--color-text");
  });

  it("truncates a long list of missing tokens", () => {
    const required = Array.from({ length: 12 }, (_, i) => `shade-${i}`);
    const problems = validateTheme("", required);
    expect(problems[0]).toContain("missing 12 colour tokens");
    expect(problems[0]).toContain("(and 4 more)");
  });
});

// Every shipped asset must satisfy the contract mashay enforces on a custom
// one; a new template or theme is covered here with no wiring.
const ROOT = path.resolve(import.meta.dirname, "..", "..");

function names(dir: string): string[] {
  return readdirSync(path.join(ROOT, dir), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
}

describe("bundled assets satisfy the contract", () => {
  it.each(names("templates"))("template %s is valid", (name) => {
    const html = readFileSync(
      path.join(ROOT, "templates", name, "template.html"),
      "utf8",
    );
    expect(validateTemplate(html)).toEqual([]);
  });

  const required = readColorTokens(
    readFileSync(path.join(ROOT, "themes", "harbor", "theme.css"), "utf8"),
  );

  it.each(names("themes"))("theme %s declares every token", (name) => {
    const css = readFileSync(
      path.join(ROOT, "themes", name, "theme.css"),
      "utf8",
    );
    expect(validateTheme(css, required)).toEqual([]);
  });
});
