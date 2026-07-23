import { access, mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { compile } from "@tailwindcss/node";
import { Scanner } from "@tailwindcss/oxide";
import matter from "gray-matter";
import { VFile } from "vfile";
import type { ZodError } from "zod";
import { buildChangelog, buildEyebrow, buildMetaGrid } from "./doc-header.js";
import { BuildError, type BuildErrorKind } from "./errors.js";
import {
  type Frontmatter,
  FrontmatterSchema,
  formatDate,
} from "./frontmatter.js";
import { processor } from "./pipeline.js";
import { buildToc } from "./toc.js";

const PACKAGE_ROOT = path.resolve(import.meta.dirname, "..");
const TEMPLATES_DIR = path.join(PACKAGE_ROOT, "templates");
const THEMES_DIR = path.join(PACKAGE_ROOT, "themes");

/**
 * The theme applied when none is chosen. Themes are named independently of
 * templates, so this is an explicit default rather than the template's name.
 */
export const DEFAULT_THEME = "harbor";
const MERMAID_CDN_URL =
  "https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js";

export interface BuildOptions {
  template: string;
  theme: string;
}

interface TemplateAssets {
  template: string;
  cssInput: string;
  mermaidScript: string;
}

function reason(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function formatFrontmatterError(srcPath: string, error: ZodError): string {
  const lines = error.issues.map(
    (issue) => `  - ${issue.path.join(".") || "(root)"}: ${issue.message}`,
  );
  return `invalid frontmatter in ${srcPath}:\n${lines.join("\n")}`;
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
    try {
      return await readFile(resolved, "utf8");
    } catch (err) {
      throw new BuildError(
        "logo",
        `logo "${logoPath}" (from frontmatter in ${srcPath}) could not be read — looked for ${resolved}: ${reason(err)}`,
      );
    }
  }
  const mime = RASTER_LOGO_MIME[ext];
  if (!mime) {
    throw new BuildError(
      "logo",
      `unsupported logo format "${ext}" in ${srcPath}: use an SVG or a PNG/JPEG/GIF/WebP/AVIF image`,
    );
  }
  try {
    const data = await readFile(resolved);
    return `<img src="data:${mime};base64,${data.toString("base64")}" alt="" />`;
  } catch (err) {
    throw new BuildError(
      "logo",
      `logo "${logoPath}" (from frontmatter in ${srcPath}) could not be read — looked for ${resolved}: ${reason(err)}`,
    );
  }
}

async function assemblePage(
  assets: TemplateAssets,
  frontmatter: Frontmatter,
  logo: string,
  content: string,
  srcPath: string,
  base: string,
): Promise<{ page: string; hasMermaid: boolean }> {
  const file = await processor.process(
    new VFile({ value: content, path: srcPath }),
  );
  const html = String(file);

  // Function-form replacements: a string second arg to replace/replaceAll interprets
  // $&, $`, $' etc., and the mermaid bundle (and user content) can easily contain those.
  // The `{{styles}}` slot is left untouched here so the assembled page can be scanned
  // for Tailwind candidates before the compiled CSS is inlined.
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
    .replace("{{logo}}", () => logo)
    .replace("{{mermaid}}", () =>
      file.data.hasMermaid ? assets.mermaidScript : "",
    );

  const styles = await compilePageCss(assets.cssInput, page);
  const finalPage = page.replace("{{styles}}", () => styles);

  return { page: finalPage, hasMermaid: Boolean(file.data.hasMermaid) };
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
  const { page, hasMermaid } = await assemblePage(
    assets,
    frontmatter,
    logo,
    content,
    srcPath,
    base,
  );
  const outName = `${base}.html`;
  await writeFile(path.join(outDir, outName), page, "utf8");
  return { outName, hasMermaid };
}

function parseDocument(
  raw: string,
  srcPath: string,
): { frontmatter: Frontmatter; content: string } {
  let data: { [key: string]: unknown };
  let content: string;
  try {
    const file = matter(raw);
    data = file.data;
    content = file.content;
  } catch (err) {
    throw new BuildError(
      "frontmatter",
      `could not parse frontmatter in ${srcPath}: ${reason(err)}`,
    );
  }

  const parsed = FrontmatterSchema.safeParse(data);
  if (!parsed.success) {
    throw new BuildError(
      "frontmatter",
      formatFrontmatterError(srcPath, parsed.error),
    );
  }
  return { frontmatter: parsed.data, content };
}

async function renderOne(
  assets: TemplateAssets,
  srcPath: string,
  outDir: string,
): Promise<{ outNames: string[]; hasMermaid: boolean }> {
  let raw: string;
  try {
    raw = await readFile(srcPath, "utf8");
  } catch (err) {
    throw new BuildError(
      "source-read",
      `could not read ${srcPath}: ${reason(err)}`,
    );
  }

  const { frontmatter, content } = parseDocument(raw, srcPath);
  const base = path.basename(srcPath, ".md");
  const logo = await resolveLogo(frontmatter.logo, srcPath);

  try {
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
  } catch (err) {
    if (err instanceof BuildError) throw err;
    throw new BuildError(
      "render",
      `failed to render ${srcPath}: ${reason(err)}`,
    );
  }
}

async function listNames(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

/**
 * Lists the names of the available templates, sorted alphabetically. Each name
 * is usable as a `--template` value or `BuildOptions.template`.
 */
export function listTemplates(): Promise<string[]> {
  return listNames(TEMPLATES_DIR);
}

/**
 * Lists the names of the available themes, sorted alphabetically. Each name is
 * usable as a `--theme` value or `BuildOptions.theme`.
 */
export function listThemes(): Promise<string[]> {
  return listNames(THEMES_DIR);
}

async function resolveTemplateFile(name: string): Promise<string> {
  const file = path.join(TEMPLATES_DIR, name, "template.html");
  try {
    await access(file);
    return file;
  } catch {
    const available = await listNames(TEMPLATES_DIR);
    throw new BuildError(
      "unknown-template",
      `unknown template "${name}" — available templates: ${available.join(", ") || "(none)"}`,
    );
  }
}

async function resolveThemeFile(name: string): Promise<string> {
  const file = path.join(THEMES_DIR, name, "theme.css");
  try {
    await access(file);
    return file;
  } catch {
    const available = await listNames(THEMES_DIR);
    throw new BuildError(
      "unknown-theme",
      `unknown theme "${name}" — available themes: ${available.join(", ") || "(none)"}`,
    );
  }
}

// Assembles the Tailwind v4 input: the framework and typography plugin, then
// the theme's colour tokens, then the template's own CSS (non-colour tokens,
// component rules, and `--tw-prose-*` mappings). The theme and template CSS
// are plain (unlayered), so they are emitted after Tailwind's @layer blocks and
// reliably win over the generated `prose` utilities. The template CSS is
// optional — a template styled purely with utilities can omit template.css.
async function buildCssInput(
  themeFile: string,
  templateCssFile: string,
): Promise<string> {
  const theme = await readFile(themeFile, "utf8");
  const templateCss = await readFile(templateCssFile, "utf8").catch(() => "");
  return [
    '@import "tailwindcss";',
    '@plugin "@tailwindcss/typography";',
    theme,
    templateCss,
  ].join("\n");
}

// Compiles the CSS for a single assembled page. A fresh compiler is created per
// document: Tailwind's `compiler.build(candidates)` accumulates candidates
// across calls, so reusing one compiler across a batch would leak every earlier
// document's utilities into later pages (and make per-doc output order-
// dependent). Re-parsing the input per document is cheap at the document counts
// this tool handles. The page is scanned for candidate class names so only the
// CSS it needs is emitted; Tailwind's leading license comment is stripped.
async function compilePageCss(cssInput: string, html: string): Promise<string> {
  const compiler = await compile(cssInput, {
    base: PACKAGE_ROOT,
    onDependency: () => {},
  });
  const scanner = new Scanner({});
  const candidates = scanner.scanFiles([{ content: html, extension: "html" }]);
  const css = compiler.build(candidates);
  return css.replace(/^\/\*![\s\S]*?\*\/\s*/, "");
}

async function loadTemplateAssets(
  options: BuildOptions,
): Promise<TemplateAssets> {
  const templateFile = await resolveTemplateFile(options.template);
  const themeFile = await resolveThemeFile(options.theme);
  const templateCssFile = path.join(path.dirname(templateFile), "template.css");

  const template = await readFile(templateFile, "utf8");
  const cssInput = await buildCssInput(themeFile, templateCssFile);

  const mermaidScript = [
    `<script src="${MERMAID_CDN_URL}"></script>`,
    `<script>mermaid.initialize({ startOnLoad: true, securityLevel: "strict" });</script>`,
  ].join("\n");

  return { template, cssInput, mermaidScript };
}

/**
 * Renders a Markdown source string to a self-contained HTML string using the
 * given template/theme, without writing anything to disk. `srcPath` is the
 * notional path of the source: it names the document in pipeline diagnostics,
 * seeds the output title's fallback, and anchors relative frontmatter paths
 * (e.g. `logo`). Throws a BuildError for an unknown template/theme, invalid
 * frontmatter, or a render failure.
 */
export async function renderToHtml(
  raw: string,
  srcPath: string,
  options: BuildOptions,
): Promise<{ html: string; hasMermaid: boolean }> {
  const assets = await loadTemplateAssets(options);
  const { frontmatter, content } = parseDocument(raw, srcPath);
  const base = path.basename(srcPath, ".md");
  const logo = await resolveLogo(frontmatter.logo, srcPath);
  const { page, hasMermaid } = await assemblePage(
    assets,
    frontmatter,
    logo,
    content,
    srcPath,
    base,
  );
  return { html: page, hasMermaid };
}

export interface BuildResult {
  file: string;
  outNames: string[];
  hasMermaid: boolean;
}

export interface BuildFailure {
  file: string;
  kind: BuildErrorKind;
  message: string;
}

export interface BuildSummary {
  results: BuildResult[];
  failures: BuildFailure[];
}

/**
 * Renders each given Markdown file to `outDir` as self-contained HTML. Setup
 * problems (unknown template/theme, uncreatable output directory) throw a
 * BuildError and abort the whole run; per-document failures are caught and
 * returned in `failures` so one bad document never stops the rest of a batch.
 */
export async function buildDocuments(
  files: string[],
  outDir: string,
  options: BuildOptions,
): Promise<BuildSummary> {
  if (files.length === 0) return { results: [], failures: [] };

  try {
    await mkdir(outDir, { recursive: true });
  } catch (err) {
    throw new BuildError(
      "output-dir",
      `could not create output directory ${outDir}: ${reason(err)}`,
    );
  }
  const assets = await loadTemplateAssets(options);

  const results: BuildResult[] = [];
  const failures: BuildFailure[] = [];
  for (const file of files) {
    try {
      const { outNames, hasMermaid } = await renderOne(assets, file, outDir);
      results.push({ file, outNames, hasMermaid });
    } catch (err) {
      if (err instanceof BuildError) {
        failures.push({ file, kind: err.kind, message: err.message });
      } else {
        failures.push({
          file,
          kind: "render",
          message: `failed to render ${file}: ${reason(err)}`,
        });
      }
    }
  }
  return { results, failures };
}
