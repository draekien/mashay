import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import rehypeSlug from "rehype-slug";
import rehypeStringify from "rehype-stringify";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";
import { visit } from "unist-util-visit";

const ROOT = path.resolve(import.meta.dirname, "..");
const SRC_DIR = path.join(ROOT, "whitepapers", "src");
const DIST_DIR = path.join(ROOT, "whitepapers", "dist");
const TEMPLATE_DIR = path.join(ROOT, "whitepapers", "template");
const MERMAID_CDN_URL =
  "https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js";

// GitHub-style alert blockquotes: > [!NOTE] / [!TIP] / [!WARNING] / [!IMPORTANT] / [!CAUTION]
// Consolidated to three visual styles per the whitepaper template: info, warn, error.
const ALERT_STYLE = {
  note: "info",
  tip: "info",
  warning: "warn",
  important: "error",
  caution: "error",
};
const ALERT_LABEL = {
  note: "Note",
  tip: "Tip",
  warning: "Warning",
  important: "Important",
  caution: "Caution",
};
const ALERT_MARKER = /^\[!(NOTE|TIP|WARNING|IMPORTANT|CAUTION)\]\s*\n?/;

function textContent(node) {
  if (node.type === "text") return node.value;
  if (node.children) return node.children.map(textContent).join("");
  return "";
}

function remarkAlerts() {
  return (tree) => {
    visit(tree, "blockquote", (node) => {
      const firstParagraph = node.children[0];
      if (!firstParagraph || firstParagraph.type !== "paragraph") return;
      const firstText = firstParagraph.children[0];
      if (!firstText || firstText.type !== "text") return;

      const match = ALERT_MARKER.exec(firstText.value);
      if (!match) return;

      const type = match[1].toLowerCase();
      firstText.value = firstText.value.slice(match[0].length);
      if (firstText.value === "" && firstParagraph.children.length === 1) {
        node.children.shift();
      }

      node.data = {
        hName: "div",
        hProperties: { className: ["alert", `alert-${ALERT_STYLE[type]}`] },
      };
      node.children.unshift({
        type: "paragraph",
        data: { hName: "p", hProperties: { className: ["alert-title"] } },
        children: [{ type: "text", value: ALERT_LABEL[type] }],
      });
    });
  };
}

function isAppendixHeading(node) {
  return (
    node.type === "element" &&
    node.tagName === "h2" &&
    textContent(node).trim().toLowerCase() === "appendix"
  );
}

function letterFor(n) {
  return String.fromCharCode(64 + n);
}

function prependNumberSpan(node, number) {
  node.children.unshift({
    type: "element",
    tagName: "span",
    properties: { className: ["heading-number"] },
    children: [{ type: "text", value: `${number}. ` }],
  });
}

// Numbers h2/h3/h4 headings (1, 1.1, 1.1.1 ...), switching to a letter scheme (A, A.1 ...)
// once an "## Appendix" heading is reached. Records two outlines: file.data.toc (main) and
// file.data.appendixToc (appendix entries), rendered as separate TOC groups.
function rehypeHeadingNumbering() {
  const levelOf = { h2: 0, h3: 1, h4: 2 };
  return (tree, file) => {
    const counts = [0, 0, 0];
    const appendixCounts = [0, 0];
    const toc = [];
    const appendixToc = [];
    let inAppendix = false;

    visit(tree, "element", (node) => {
      const levelIdx = levelOf[node.tagName];
      if (levelIdx === undefined) return;

      if (levelIdx === 0 && isAppendixHeading(node)) {
        inAppendix = true;
        return;
      }

      if (inAppendix) {
        const apIdx = levelIdx - 1;
        if (apIdx < 0) return;
        appendixCounts[apIdx]++;
        for (let i = apIdx + 1; i < appendixCounts.length; i++)
          appendixCounts[i] = 0;
        const number =
          apIdx === 0
            ? letterFor(appendixCounts[0])
            : `${letterFor(appendixCounts[0])}.${appendixCounts.slice(1, apIdx + 1).join(".")}`;
        appendixToc.push({
          level: apIdx,
          id: node.properties.id,
          number,
          text: textContent(node),
        });
        prependNumberSpan(node, number);
        return;
      }

      counts[levelIdx]++;
      for (let i = levelIdx + 1; i < counts.length; i++) counts[i] = 0;
      const number = counts.slice(0, levelIdx + 1).join(".");
      toc.push({
        level: levelIdx,
        id: node.properties.id,
        number,
        text: textContent(node),
      });
      prependNumberSpan(node, number);
    });

    file.data.toc = toc;
    file.data.appendixToc = appendixToc;
  };
}

// Turns fenced ```mermaid blocks into <div class="mermaid"> for the mermaid.js renderer,
// and flags file.data.hasMermaid so the mermaid bundle is only inlined into pages that need it.
function rehypeMermaid() {
  return (tree, file) => {
    visit(tree, "element", (node, index, parent) => {
      if (node.tagName !== "pre" || !parent) return;
      const code = node.children.find((c) => c.tagName === "code");
      const classes = code?.properties?.className ?? [];
      if (!classes.includes("language-mermaid")) return;

      file.data.hasMermaid = true;
      parent.children[index] = {
        type: "element",
        tagName: "div",
        properties: { className: ["mermaid-wrapper"] },
        children: [
          {
            type: "element",
            tagName: "div",
            properties: { className: ["mermaid"] },
            children: [{ type: "text", value: textContent(code) }],
          },
        ],
      };
    });
  };
}

// Wraps each h3 subsection under an "## Appendix" heading in a native <details> element,
// using the h3 (with its heading-number span) as the <summary>.
function rehypeAppendix() {
  return (tree) => {
    const children = tree.children;
    const isHeadingTextMatch = (node, tagName, label) =>
      node.type === "element" &&
      node.tagName === tagName &&
      textContent(node)
        .replace(/^[\d.]+\.\s*/, "")
        .trim()
        .toLowerCase() === label;

    const appendixIdx = children.findIndex((n) =>
      isHeadingTextMatch(n, "h2", "appendix"),
    );
    if (appendixIdx === -1) return;

    const result = children.slice(0, appendixIdx + 1);
    let i = appendixIdx + 1;
    while (
      i < children.length &&
      !(children[i].type === "element" && children[i].tagName === "h2")
    ) {
      const node = children[i];
      if (node.type === "element" && node.tagName === "h3") {
        const groupBody = [];
        i++;
        while (
          i < children.length &&
          !(
            children[i].type === "element" &&
            ["h2", "h3"].includes(children[i].tagName)
          )
        ) {
          groupBody.push(children[i]);
          i++;
        }
        result.push({
          type: "element",
          tagName: "details",
          properties: { className: ["appendix-entry"] },
          children: [
            {
              type: "element",
              tagName: "summary",
              properties: {},
              children: node.children,
            },
            ...groupBody,
          ],
        });
        continue;
      }
      result.push(node);
      i++;
    }
    result.push(...children.slice(i));
    tree.children = result;
  };
}

const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkAlerts)
  .use(remarkRehype)
  .use(rehypeSlug)
  .use(rehypeHeadingNumbering)
  .use(rehypeMermaid)
  .use(rehypeAppendix)
  .use(rehypeStringify);

function formatDate(value) {
  if (!value) return "";
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime())
    ? String(value)
    : d.toLocaleDateString("en-AU", {
        year: "numeric",
        month: "long",
        day: "numeric",
        timeZone: "UTC",
      });
}

function tocToTree(items) {
  const root = { children: [] };
  const stack = [{ level: -1, node: root }];
  for (const item of items) {
    while (stack.length && stack[stack.length - 1].level >= item.level)
      stack.pop();
    const node = { ...item, children: [] };
    stack[stack.length - 1].node.children.push(node);
    stack.push({ level: item.level, node });
  }
  return root.children;
}

function renderTocList(nodes) {
  if (nodes.length === 0) return "";
  const items = nodes
    .map(
      (n) =>
        `<li><a href="#${n.id}"><span class="toc-number">${n.number}</span> ${n.text}</a>${renderTocList(n.children)}</li>`,
    )
    .join("");
  return `<ul>${items}</ul>`;
}

function buildToc(tocItems, appendixItems) {
  let html = "";
  if (tocItems.length > 0) {
    html += `<nav class="toc"><p class="toc-label">Contents</p>${renderTocList(tocToTree(tocItems))}</nav>`;
  }
  if (appendixItems.length > 0) {
    html += `<nav class="toc toc-appendix"><p class="toc-label">Appendix</p>${renderTocList(tocToTree(appendixItems))}</nav>`;
  }
  return html;
}

async function renderOne({ template, styles, logo, mermaidScript }, srcPath) {
  const raw = await readFile(srcPath, "utf8");
  const { data: frontmatter, content } = matter(raw);
  const file = await processor.process(content);
  const html = String(file);

  // Function-form replacements: a string second arg to replace/replaceAll interprets
  // $&, $`, $' etc., and the mermaid bundle (and user content) can easily contain those.
  const page = template
    .replaceAll(
      "{{title}}",
      () => frontmatter.title ?? path.basename(srcPath, ".md"),
    )
    .replaceAll("{{description}}", () => frontmatter.description ?? "")
    .replaceAll("{{author}}", () => frontmatter.author ?? "")
    .replaceAll("{{date}}", () => formatDate(frontmatter.date))
    .replaceAll("{{toc}}", () =>
      buildToc(file.data.toc ?? [], file.data.appendixToc ?? []),
    )
    .replaceAll("{{content}}", () => html)
    .replace("{{styles}}", () => styles)
    .replace("{{logo}}", () => logo)
    .replace("{{mermaid}}", () => (file.data.hasMermaid ? mermaidScript : ""));

  const outName = path.basename(srcPath, ".md") + ".html";
  const outPath = path.join(DIST_DIR, outName);
  await writeFile(outPath, page, "utf8");
  console.log(`built ${outName}${file.data.hasMermaid ? " (+ mermaid)" : ""}`);
}

async function main() {
  await mkdir(DIST_DIR, { recursive: true });

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
  const logo = "";
  const styles = `${tokens}\n${whitepaperCss}`;

  const mermaidScript = [
    `<script src="${MERMAID_CDN_URL}"></script>`,
    `<script>mermaid.initialize({ startOnLoad: true, securityLevel: "strict" });</script>`,
  ].join("\n");

  const entries = await readdir(SRC_DIR);
  const mdFiles = entries.filter((f) => f.endsWith(".md"));

  if (mdFiles.length === 0) {
    console.log(`no markdown files found in ${SRC_DIR}`);
    return;
  }

  for (const entry of mdFiles) {
    await renderOne(
      { template, styles, logo, mermaidScript },
      path.join(SRC_DIR, entry),
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
