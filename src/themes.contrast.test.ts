import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const THEMES_DIR = path.resolve(import.meta.dirname, "..", "themes");

const AA_NORMAL = 4.5;

function channel(value: number): number {
  const s = value / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string): number {
  const n = hex.replace("#", "");
  const r = Number.parseInt(n.slice(0, 2), 16);
  const g = Number.parseInt(n.slice(2, 4), 16);
  const b = Number.parseInt(n.slice(4, 6), 16);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrast(fg: string, bg: string): number {
  const [hi, lo] = [luminance(fg), luminance(bg)].sort((a, b) => b - a);
  return (hi + 0.05) / (lo + 0.05);
}

function readTokens(name: string): Record<string, string> {
  const css = readFileSync(path.join(THEMES_DIR, name, "theme.css"), "utf8");
  const tokens: Record<string, string> = {};
  for (const m of css.matchAll(/--color-([\w-]+):\s*(#[0-9a-fA-F]{6})/g)) {
    tokens[m[1]] = m[2];
  }
  return tokens;
}

// Foreground/background token pairs the academic template renders as text, each
// of which must clear WCAG AA (4.5:1). Metadata-voice pairs (muted labels, TOC
// numbers) are excluded: the shipped reference intentionally runs those below
// this floor, so enforcing it would reject legitimate palettes.
const PAIRS: { fg: string; bg: string; role: string }[] = [
  { fg: "text", bg: "background", role: "body text" },
  { fg: "primary-600", bg: "background", role: "link" },
  { fg: "neutral-000", bg: "primary-600", role: "heading-chip text" },
  { fg: "neutral-000", bg: "tertiary-900", role: "masthead title" },
  { fg: "primary-400", bg: "tertiary-900", role: "masthead eyebrow" },
  { fg: "primary-400", bg: "neutral-1000", role: "syntax keyword" },
  { fg: "secondary-400", bg: "neutral-1000", role: "syntax string" },
  { fg: "secondary-500", bg: "neutral-1000", role: "syntax number" },
  { fg: "tertiary-400", bg: "neutral-1000", role: "syntax title" },
  { fg: "tertiary-500", bg: "neutral-1000", role: "syntax attribute" },
  { fg: "neutral-500", bg: "neutral-1000", role: "syntax comment" },
  { fg: "error-400", bg: "neutral-1000", role: "syntax deletion" },
  { fg: "secondary-1000", bg: "secondary-600", role: "status badge" },
  { fg: "information-800", bg: "information-100", role: "info alert title" },
  { fg: "success-800", bg: "success-100", role: "success alert title" },
  { fg: "alert-800", bg: "alert-100", role: "warn alert title" },
  { fg: "error-800", bg: "error-100", role: "error alert title" },
];

const themes = readdirSync(THEMES_DIR, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name);

describe("theme colour tokens clear the AA contrast floor", () => {
  it("discovers at least one theme", () => {
    expect(themes.length).toBeGreaterThan(0);
  });

  describe.each(themes)("%s", (name) => {
    const tokens = readTokens(name);

    it.each(PAIRS)("$role ($fg on $bg) clears 4.5:1", ({ fg, bg }) => {
      expect(tokens[fg], `missing --color-${fg}`).toBeDefined();
      expect(tokens[bg], `missing --color-${bg}`).toBeDefined();
      expect(contrast(tokens[fg], tokens[bg])).toBeGreaterThanOrEqual(
        AA_NORMAL,
      );
    });
  });
});
