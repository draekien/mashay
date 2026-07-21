import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);

async function runCli(
  args: string[],
): Promise<{ code: number; stdout: string; stderr: string }> {
  try {
    const { stdout, stderr } = await execFileAsync("node", [CLI, ...args]);
    return { code: 0, stdout, stderr };
  } catch (err) {
    const e = err as { code?: number; stdout?: string; stderr?: string };
    return {
      code: e.code ?? 1,
      stdout: e.stdout ?? "",
      stderr: e.stderr ?? "",
    };
  }
}

async function fileExists(p: string): Promise<boolean> {
  try {
    await readFile(p);
    return true;
  } catch {
    return false;
  }
}

// This exercises the real built CLI (dist/cli.js) rather than importing src/lib/build.ts
// directly: PACKAGE_ROOT/TEMPLATE_DIR are resolved via import.meta.dirname relative to the
// bundled file's location, so template loading only resolves correctly once bundled.
const ROOT = path.resolve(import.meta.dirname, "..");
const CLI = path.join(ROOT, "dist", "cli.js");
const FIXTURE = path.join(ROOT, "examples", "example.md");
const OBSIDIAN_FIXTURE = path.join(ROOT, "examples", "example-obsidian.md");

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

  it("renders the example fixture to a self-contained HTML file", async () => {
    await execFileAsync("node", [CLI, "process", FIXTURE, "--out", outDir]);

    const html = await readFile(path.join(outDir, "example.html"), "utf8");

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
      "process",
      plainFixture,
      "--out",
      outDir,
    ]);

    const html = await readFile(path.join(outDir, "plain.html"), "utf8");
    expect(html).not.toContain("cdn.jsdelivr.net/npm/mermaid");
  });

  it("builds a file with no changelog (the changelog is optional)", async () => {
    const noChangelog = path.join(outDir, "no-changelog.md");
    await writeFile(noChangelog, "## Just a heading\n\nSome text.\n");

    await execFileAsync("node", [CLI, "process", noChangelog, "--out", outDir]);

    const html = await readFile(path.join(outDir, "no-changelog.html"), "utf8");
    expect(html).not.toContain("Revision History");
  });

  it("renders the Obsidian-vault-style fixture (wikilinks, embeds, callouts, highlights) to self-contained HTML", async () => {
    await execFileAsync("node", [
      CLI,
      "process",
      OBSIDIAN_FIXTURE,
      "--out",
      outDir,
    ]);

    const html = await readFile(
      path.join(outDir, "example-obsidian.html"),
      "utf8",
    );
    expect(html).toMatchSnapshot();
  });
});

describe("per-file error isolation and exit codes", () => {
  let srcDir: string;

  beforeEach(async () => {
    srcDir = await mkdtemp(path.join(tmpdir(), "mashay-src-test-"));
  });

  afterEach(async () => {
    await rm(srcDir, { recursive: true, force: true });
  });

  it("isolates a bad document from the rest of a batch", async () => {
    await writeFile(path.join(srcDir, "good.md"), "## Ok\n\nFine.\n");
    await writeFile(
      path.join(srcDir, "bad.md"),
      "---\ntitle: 123\n---\n\n## Nope\n",
    );

    const { code, stderr } = await runCli(["process", srcDir, "--out", outDir]);

    expect(await fileExists(path.join(outDir, "good.html"))).toBe(true);
    expect(await fileExists(path.join(outDir, "bad.html"))).toBe(false);
    expect(stderr).toContain("invalid frontmatter");
    // single failure kind (frontmatter) → its specific code
    expect(code).toBe(20);
  });

  it("exits 30 (mixed) when a batch fails with more than one kind", async () => {
    await writeFile(path.join(srcDir, "good.md"), "## Ok\n\nFine.\n");
    await writeFile(
      path.join(srcDir, "bad-fm.md"),
      "---\ntitle: 123\n---\n\n## Nope\n",
    );
    await writeFile(
      path.join(srcDir, "bad-logo.md"),
      "---\nlogo: does-not-exist.svg\n---\n\n## Nope\n",
    );

    const { code } = await runCli(["process", srcDir, "--out", outDir]);

    expect(await fileExists(path.join(outDir, "good.html"))).toBe(true);
    expect(code).toBe(30);
  });

  it("exits 10 for an unknown template", async () => {
    await writeFile(path.join(srcDir, "good.md"), "## Ok\n\nFine.\n");

    const { code, stderr } = await runCli([
      "process",
      srcDir,
      "--out",
      outDir,
      "--template",
      "nope",
    ]);

    expect(stderr).toContain('unknown template "nope"');
    expect(code).toBe(10);
  });

  it("exits 12 when the source path has no markdown", async () => {
    const { code } = await runCli(["process", srcDir, "--out", outDir]);
    expect(code).toBe(12);
  });

  it("documents the exit-code taxonomy via `mashay docs exit-codes`", async () => {
    const { stdout, code } = await runCli(["docs", "exit-codes"]);
    expect(code).toBe(0);
    expect(stdout).toContain("30");
    expect(stdout).toContain("mixed");
  });
});
