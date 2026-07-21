import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  findMarkdownFilesRecursive,
  resolveMarkdownFiles,
} from "./file-discovery.js";

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "mashay-test-"));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("resolveMarkdownFiles", () => {
  it("returns the path itself when given a single .md file", async () => {
    const file = path.join(dir, "one.md");
    await writeFile(file, "# One");

    await expect(resolveMarkdownFiles(file)).resolves.toEqual([file]);
  });

  it("rejects a single file that isn't .md", async () => {
    const file = path.join(dir, "one.txt");
    await writeFile(file, "not markdown");

    await expect(resolveMarkdownFiles(file)).rejects.toThrow(
      /expected a \.md file or a directory/,
    );
  });

  it("returns only the .md files directly inside a directory", async () => {
    await writeFile(path.join(dir, "a.md"), "# A");
    await writeFile(path.join(dir, "b.md"), "# B");
    await writeFile(path.join(dir, "c.txt"), "not markdown");

    const result = await resolveMarkdownFiles(dir);

    expect(result.sort()).toEqual(
      [path.join(dir, "a.md"), path.join(dir, "b.md")].sort(),
    );
  });

  it("returns an empty list for a directory with no .md files", async () => {
    await writeFile(path.join(dir, "c.txt"), "not markdown");

    await expect(resolveMarkdownFiles(dir)).resolves.toEqual([]);
  });

  it("does not descend into subdirectories", async () => {
    await mkdir(path.join(dir, "nested"));
    await writeFile(path.join(dir, "nested", "deep.md"), "# Deep");

    await expect(resolveMarkdownFiles(dir)).resolves.toEqual([]);
  });
});

describe("findMarkdownFilesRecursive", () => {
  it("finds .md files nested arbitrarily deep", async () => {
    await mkdir(path.join(dir, "a", "b"), { recursive: true });
    await writeFile(path.join(dir, "top.md"), "# Top");
    await writeFile(path.join(dir, "a", "mid.md"), "# Mid");
    await writeFile(path.join(dir, "a", "b", "deep.md"), "# Deep");

    const result = await findMarkdownFilesRecursive(dir);

    expect(result.sort()).toEqual(
      [
        path.join(dir, "top.md"),
        path.join(dir, "a", "mid.md"),
        path.join(dir, "a", "b", "deep.md"),
      ].sort(),
    );
  });

  it("skips node_modules, .git, dist, and out directories", async () => {
    for (const skipped of ["node_modules", ".git", "dist", "out"]) {
      await mkdir(path.join(dir, skipped), { recursive: true });
      await writeFile(path.join(dir, skipped, "hidden.md"), "# Hidden");
    }
    await writeFile(path.join(dir, "visible.md"), "# Visible");

    const result = await findMarkdownFilesRecursive(dir);

    expect(result).toEqual([path.join(dir, "visible.md")]);
  });

  it("skips dotfiles and dot-directories", async () => {
    await mkdir(path.join(dir, ".hidden-dir"), { recursive: true });
    await writeFile(path.join(dir, ".hidden-dir", "inside.md"), "# Inside");
    await writeFile(path.join(dir, ".dotfile.md"), "# Dotfile");
    await writeFile(path.join(dir, "visible.md"), "# Visible");

    const result = await findMarkdownFilesRecursive(dir);

    expect(result).toEqual([path.join(dir, "visible.md")]);
  });

  it("returns an empty list when no markdown files exist", async () => {
    await writeFile(path.join(dir, "notes.txt"), "not markdown");

    await expect(findMarkdownFilesRecursive(dir)).resolves.toEqual([]);
  });
});
