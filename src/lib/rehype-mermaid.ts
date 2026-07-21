import type { Element, Root as HastRoot } from "hast";
import { visit } from "unist-util-visit";
import type { VFile } from "vfile";
import { textContent } from "./text-content.js";

declare module "vfile" {
  interface DataMap {
    hasMermaid: boolean;
  }
}

// Turns fenced ```mermaid blocks into <div class="mermaid"> for the mermaid.js renderer,
// and flags file.data.hasMermaid so the mermaid bundle is only inlined into pages that need it.
export function rehypeMermaid() {
  return (tree: HastRoot, file: VFile) => {
    visit(tree, "element", (node, index, parent) => {
      if (node.tagName !== "pre" || !parent || index === undefined) return;
      const code = node.children.find(
        (c): c is Element => c.type === "element" && c.tagName === "code",
      );
      if (!code) return;
      const classes = Array.isArray(code.properties.className)
        ? code.properties.className
        : [];
      if (!classes.includes("language-mermaid")) return;

      file.data.hasMermaid = true;
      const wrapper: Element = {
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
      parent.children[index] = wrapper;
    });
  };
}
