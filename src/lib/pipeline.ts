import rehypeHighlight from "rehype-highlight";
import rehypeRaw from "rehype-raw";
import rehypeSlug from "rehype-slug";
import rehypeStringify from "rehype-stringify";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";
import { rehypeAppendix } from "./rehype-appendix.js";
import { rehypeCodeBlock } from "./rehype-code-block.js";
import { rehypeHeadingNumbering } from "./rehype-heading-numbering.js";
import { rehypeMermaid } from "./rehype-mermaid.js";
import { remarkAlerts } from "./remark-alerts.js";
import { remarkObsidianEmbeds } from "./remark-obsidian-embeds.js";
import { remarkObsidianInline } from "./remark-obsidian-inline.js";

export const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkAlerts)
  .use(remarkObsidianEmbeds)
  .use(remarkObsidianInline)
  // allowDangerousHtml keeps raw HTML as `raw` nodes; rehypeRaw (below) reparses
  // them into real hast so inline HTML in the Markdown renders.
  .use(remarkRehype, { allowDangerousHtml: true })
  .use(rehypeSlug)
  .use(rehypeHeadingNumbering)
  .use(rehypeMermaid)
  // After rehypeMermaid so mermaid fences (already replaced with a div) are never
  // highlighted; build-time highlighting keeps the output self-contained.
  .use(rehypeHighlight)
  .use(rehypeCodeBlock)
  .use(rehypeAppendix)
  // Runs last so raw-HTML reparsing doesn't strip the fence `meta` (filename)
  // that rehypeCodeBlock reads, nor the ids/numbering added upstream.
  .use(rehypeRaw)
  .use(rehypeStringify);
