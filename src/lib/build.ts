import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import { VFile } from "vfile";
import { buildChangelog, buildEyebrow, buildMetaGrid } from "./doc-header.js";
import {
  type Frontmatter,
  FrontmatterSchema,
  formatDate,
} from "./frontmatter.js";
import { processor } from "./pipeline.js";
import { buildToc } from "./toc.js";

const PACKAGE_ROOT = path.resolve(import.meta.dirname, "..");
const TEMPLATE_DIR = path.join(PACKAGE_ROOT, "whitepapers", "template");
const MERMAID_CDN_URL =
  "https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js";

interface TemplateAssets {
  template: string;
  styles: string;
  mermaidScript: string;
}

const RASTER_LOGO_MIME: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".avif": "image/avif",
};

// Resolves the optional per-document logo from frontmatter, relative to the
// Markdown source file, and inlines it so the output stays self-contained: an
// SVG is embedded as-is, a raster image as a base64 data: URI. Returns an empty
// string when no logo is set, leaving the masthead logo slot empty.
async function resolveLogo(
  logoPath: string | undefined,
  srcPath: string,
): Promise<string> {
  if (!logoPath) return "";
  const resolved = path.resolve(path.dirname(srcPath), logoPath);
  const ext = path.extname(resolved).toLowerCase();
  if (ext === ".svg") {
    return await readFile(resolved, "utf8");
  }
  const mime = RASTER_LOGO_MIME[ext];
  if (!mime) {
    throw new Error(
      `unsupported logo format "${ext}" in ${srcPath}: use an SVG or a PNG/JPEG/GIF/WebP/AVIF image`,
    );
  }
  const data = await readFile(resolved);
  return `<img src="data:${mime};base64,${data.toString("base64")}" alt="" />`;
}

async function renderHtml(
  assets: TemplateAssets,
  frontmatter: Frontmatter,
  logo: string,
  content: string,
  srcPath: string,
  base: string,
  outDir: string,
): Promise<{ outName: string; hasMermaid: boolean }> {
  const file = await processor.process(
    new VFile({ value: content, path: srcPath }),
  );
  const html = String(file);

  // Function-form replacements: a string second arg to replace/replaceAll interprets
  // $&, $`, $' etc., and the mermaid bundle (and user content) can easily contain those.
  const page = assets.template
    .replaceAll("{{title}}", () => frontmatter.title ?? base)
    .replaceAll("{{description}}", () => frontmatter.description ?? "")
    .replaceAll("{{author}}", () => frontmatter.author ?? "")
    .replaceAll("{{eyebrow}}", () => buildEyebrow(frontmatter.status))
    .replaceAll("{{metaGrid}}", () =>
      buildMetaGrid({
        version: frontmatter.version,
        date: formatDate(frontmatter.date),
        author: frontmatter.author,
        reviewers: frontmatter.reviewers,
        classification: frontmatter.classification,
      }),
    )
    .replaceAll("{{changelog}}", () =>
      buildChangelog(frontmatter.changelog, formatDate),
    )
    .replaceAll("{{toc}}", () =>
      buildToc(file.data.toc ?? [], file.data.appendixToc ?? []),
    )
    .replaceAll("{{content}}", () => html)
    .replace("{{styles}}", () => assets.styles)
    .replace("{{logo}}", () => logo)
    .replace("{{mermaid}}", () =>
      file.data.hasMermaid ? assets.mermaidScript : "",
    );

  const outName = `${base}.html`;
  await writeFile(path.join(outDir, outName), page, "utf8");
  return { outName, hasMermaid: Boolean(file.data.hasMermaid) };
}

async function renderOne(
  assets: TemplateAssets,
  srcPath: string,
  outDir: string,
): Promise<{ outNames: string[]; hasMermaid: boolean }> {
  const raw = await readFile(srcPath, "utf8");
  const { data, content } = matter(raw);
  const parsed = FrontmatterSchema.safeParse(data);
  if (!parsed.success) {
    throw new Error(
      `invalid frontmatter in ${srcPath}: ${parsed.error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join("; ")}`,
    );
  }
  const frontmatter = parsed.data;
  const base = path.basename(srcPath, ".md");
  const logo = await resolveLogo(frontmatter.logo, srcPath);

  const html = await renderHtml(
    assets,
    frontmatter,
    logo,
    content,
    srcPath,
    base,
    outDir,
  );

  return { outNames: [html.outName], hasMermaid: html.hasMermaid };
}

async function loadTemplateAssets(): Promise<TemplateAssets> {
  const template = await readFile(
    path.join(TEMPLATE_DIR, "template.html"),
    "utf8",
  );
  const tokens = await readFile(
    path.join(TEMPLATE_DIR, "assets", "tokens.css"),
    "utf8",
  );
  const whitepaperCss = await readFile(
    path.join(TEMPLATE_DIR, "whitepaper.css"),
    "utf8",
  );
  const styles = `${tokens}\n${whitepaperCss}`;

  const mermaidScript = [
    `<script src="${MERMAID_CDN_URL}"></script>`,
    `<script>mermaid.initialize({ startOnLoad: true, securityLevel: "strict" });</script>`,
  ].join("\n");

  return { template, styles, mermaidScript };
}

export interface BuildResult {
  file: string;
  outNames: string[];
  hasMermaid: boolean;
}

/** Renders each given Markdown file to `outDir` as self-contained HTML. */
export async function buildWhitepapers(
  files: string[],
  outDir: string,
): Promise<BuildResult[]> {
  if (files.length === 0) return [];

  await mkdir(outDir, { recursive: true });
  const assets = await loadTemplateAssets();

  const results: BuildResult[] = [];
  for (const file of files) {
    const { outNames, hasMermaid } = await renderOne(assets, file, outDir);
    results.push({ file, outNames, hasMermaid });
  }
  return results;
}
