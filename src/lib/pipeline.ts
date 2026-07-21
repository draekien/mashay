import rehypeHighlight from "rehype-highlight";
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
  .use(remarkRehype)
  .use(rehypeSlug)
  .use(rehypeHeadingNumbering)
  .use(rehypeMermaid)
  // After rehypeMermaid so mermaid fences (already replaced with a div) are never
  // highlighted; build-time highlighting keeps the output self-contained.
  .use(rehypeHighlight)
  .use(rehypeCodeBlock)
  .use(rehypeAppendix)
  .use(rehypeStringify);
