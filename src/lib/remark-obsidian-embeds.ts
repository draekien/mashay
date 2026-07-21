import type { Dirent } from "node:fs";
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import type { Image, Root as MdastRoot, Parent, Text } from "mdast";
import { visit } from "unist-util-visit";
import type { VFile } from "vfile";
import { SKIP_DIRS } from "./file-discovery.js";

// Obsidian file embeds: ![[image.png]], ![[image.png|300]] (width), ![[image.png|alt text]].
const EMBED_RE = /!\[\[([^\]]+)\]\]/g;

const IMAGE_MIME: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  svg: "image/svg+xml",
  webp: "image/webp",
  bmp: "image/bmp",
};

const MAX_ANCESTOR_LEVELS = 8;

function splitOnce(
  value: string,
  separator: string,
): [string, string | undefined] {
  const index = value.indexOf(separator);
  return index === -1
    ? [value, undefined]
    : [value.slice(0, index), value.slice(index + separator.length)];
}

async function fileExists(candidate: string): Promise<boolean> {
  try {
    return (await stat(candidate)).isFile();
  } catch {
    return false;
  }
}

async function findInDir(
  dir: string,
  basename: string,
): Promise<string | null> {
  let entries: Dirent[];
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return null;
  }
  const lower = basename.toLowerCase();
  const match = entries.find(
    (entry) => entry.isFile() && entry.name.toLowerCase() === lower,
  );
  return match ? path.join(dir, match.name) : null;
}

// Depth-first search under `dir` for a file named `basename` (case-insensitive), skipping the
// same directories mashay's own file discovery skips.
async function searchDown(
  dir: string,
  basename: string,
): Promise<string | null> {
  let entries: Dirent[];
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return null;
  }

  const direct = await findInDir(dir, basename);
  if (direct) return direct;

  for (const entry of entries) {
    if (
      entry.isDirectory() &&
      !entry.name.startsWith(".") &&
      !SKIP_DIRS.has(entry.name)
    ) {
      const found = await searchDown(path.join(dir, entry.name), basename);
      if (found) return found;
    }
  }
  return null;
}

// Vaults commonly keep attachments in a folder at (or above) the vault root rather than next to
// every note, so once a downward search from the note's own directory comes up empty, walk up
// through ancestor directories checking each one directly and its "attachments" subfolder.
async function searchUp(
  startDir: string,
  basename: string,
): Promise<string | null> {
  let dir = startDir;
  for (let i = 0; i < MAX_ANCESTOR_LEVELS; i++) {
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;

    const direct = await findInDir(dir, basename);
    if (direct) return direct;

    const inAttachments = await findInDir(
      path.join(dir, "attachments"),
      basename,
    );
    if (inAttachments) return inAttachments;
  }
  return null;
}

async function resolveEmbedTarget(
  fileDir: string,
  target: string,
): Promise<string | null> {
  if (target.includes("/") || target.includes("\\")) {
    const direct = path.resolve(fileDir, target);
    if (await fileExists(direct)) return direct;
  }

  const basename = path.basename(target);
  return (
    (await searchDown(fileDir, basename)) ?? (await searchUp(fileDir, basename))
  );
}

// Resolves a single embed target to an inlined <img> when it's a recognized image type,
// otherwise falls back to plain text (the alias if given, else the target name) — mashay has no
// way to transclude another note's content, and unresolvable/non-image embeds would otherwise
// leave raw ![[...]] markup in the output.
async function resolveEmbedNode(
  inner: string,
  fileDir: string | undefined,
): Promise<Text | Image> {
  const [targetPart, extra] = splitOnce(inner, "|");
  const target = targetPart.trim();
  const fallback = (extra ?? target).trim();

  if (!fileDir) return { type: "text", value: fallback };

  const resolved = await resolveEmbedTarget(fileDir, target);
  const ext = resolved ? path.extname(resolved).slice(1).toLowerCase() : "";
  const mime = IMAGE_MIME[ext];
  if (!resolved || !mime) return { type: "text", value: fallback };

  const bytes = await readFile(resolved);
  const url = `data:${mime};base64,${bytes.toString("base64")}`;
  const width = extra && /^\d+$/.test(extra.trim()) ? extra.trim() : undefined;

  return {
    type: "image",
    url,
    alt: width ? target : fallback,
    data: width ? { hProperties: { width } } : undefined,
  };
}

async function expandEmbeds(
  value: string,
  fileDir: string | undefined,
): Promise<Array<Text | Image>> {
  const nodes: Array<Text | Image> = [];
  let lastIndex = 0;

  // matchAll clones EMBED_RE but copies its current lastIndex over (per spec), so a preceding
  // .test() call elsewhere would otherwise make this scan start mid-string.
  EMBED_RE.lastIndex = 0;
  for (const match of value.matchAll(EMBED_RE)) {
    const index = match.index ?? 0;
    if (index > lastIndex) {
      nodes.push({ type: "text", value: value.slice(lastIndex, index) });
    }
    nodes.push(await resolveEmbedNode(match[1], fileDir));
    lastIndex = index + match[0].length;
  }
  if (lastIndex < value.length) {
    nodes.push({ type: "text", value: value.slice(lastIndex) });
  }
  return nodes;
}

export function remarkObsidianEmbeds() {
  return async (tree: MdastRoot, file: VFile) => {
    const fileDir = file.dirname;
    const jobs: Array<() => Promise<void>> = [];

    visit(tree, "text", (node: Text, index, parent: Parent | undefined) => {
      if (!parent || typeof index !== "number") return;
      EMBED_RE.lastIndex = 0;
      if (!EMBED_RE.test(node.value)) return;

      jobs.push(async () => {
        const replacement = await expandEmbeds(node.value, fileDir);
        const at = parent.children.indexOf(node);
        if (at !== -1) parent.children.splice(at, 1, ...replacement);
      });
    });

    for (const job of jobs) await job();
  };
}
