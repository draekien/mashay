import { readdir, stat } from "node:fs/promises";
import path from "node:path";

/** Resolves a CLI-provided source argument (a single .md file, or a directory of .md files) to a flat file list. */
export async function resolveMarkdownFiles(srcPath: string): Promise<string[]> {
  const srcStat = await stat(srcPath);

  if (srcStat.isDirectory()) {
    const entries = await readdir(srcPath);
    return entries
      .filter((f) => f.endsWith(".md"))
      .map((f) => path.join(srcPath, f));
  }

  if (!srcPath.endsWith(".md")) {
    throw new Error(
      `expected a .md file or a directory of .md files, got: ${srcPath}`,
    );
  }
  return [srcPath];
}

export const SKIP_DIRS = new Set(["node_modules", ".git", "dist", "out"]);

/** Recursively finds all .md files under `root`, for interactive selection. */
export async function findMarkdownFilesRecursive(
  root: string,
): Promise<string[]> {
  const entries = await readdir(root, { withFileTypes: true });
  const results: string[] = [];

  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;
    const fullPath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      results.push(...(await findMarkdownFilesRecursive(fullPath)));
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      results.push(fullPath);
    }
  }

  return results;
}
