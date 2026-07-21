import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);

// This exercises the real built CLI (dist/cli.js) rather than importing src/lib/build.ts
// directly: PACKAGE_ROOT/TEMPLATE_DIR are resolved via import.meta.dirname relative to the
// bundled file's location, so template loading only resolves correctly once bundled.
const ROOT = path.resolve(import.meta.dirname, "..");
const CLI = path.join(ROOT, "dist", "cli.js");
const FIXTURE = path.join(ROOT, "whitepapers", "src", "example-whitepaper.md");
const OBSIDIAN_FIXTURE = path.join(
  ROOT,
  "whitepapers",
  "src",
  "example-obsidian-whitepaper.md",
);

let outDir: string;

beforeEach(async () => {
  outDir = await mkdtemp(path.join(tmpdir(), "mashay-cli-test-"));
});

afterEach(async () => {
  await rm(outDir, { recursive: true, force: true });
});

describe("built CLI end-to-end", () => {
  it("prints the package version for --version", async () => {
    const pkg = JSON.parse(
      await readFile(path.join(ROOT, "package.json"), "utf8"),
    ) as { version: string };

    const { stdout } = await execFileAsync("node", [CLI, "--version"]);
    expect(stdout.trim()).toBe(pkg.version);
  });

  it("renders the example whitepaper fixture to a self-contained HTML file", async () => {
    await execFileAsync("node", [CLI, "whitepaper", FIXTURE, "--out", outDir]);

    const html = await readFile(
      path.join(outDir, "example-whitepaper.html"),
      "utf8",
    );

    expect(html).toMatchSnapshot();
  });

  it("omits the mermaid script from a fixture with no mermaid blocks", async () => {
    const plainFixture = path.join(outDir, "plain.md");
    await writeFile(
      plainFixture,
      '---\nchangelog:\n  - version: "1.0"\n    description: Initial version.\n---\n\n## Just a heading\n\nSome text.\n',
    );

    await execFileAsync("node", [
      CLI,
      "whitepaper",
      plainFixture,
      "--out",
      outDir,
    ]);

    const html = await readFile(path.join(outDir, "plain.html"), "utf8");
    expect(html).not.toContain("cdn.jsdelivr.net/npm/mermaid");
  });

  it("fails the build when a file has no changelog revision history", async () => {
    const noChangelog = path.join(outDir, "no-changelog.md");
    await writeFile(noChangelog, "## Just a heading\n\nSome text.\n");

    await expect(
      execFileAsync("node", [CLI, "whitepaper", noChangelog, "--out", outDir]),
    ).rejects.toThrow(/changelog.*revision history/is);
  });

  it("renders the Obsidian-vault-style fixture (wikilinks, embeds, callouts, highlights) to self-contained HTML", async () => {
    await execFileAsync("node", [
      CLI,
      "whitepaper",
      OBSIDIAN_FIXTURE,
      "--out",
      outDir,
    ]);

    const html = await readFile(
      path.join(outDir, "example-obsidian-whitepaper.html"),
      "utf8",
    );
    expect(html).toMatchSnapshot();
  });
});
