import type { Element, Root as HastRoot, RootContent } from "hast";
import { visit } from "unist-util-visit";

// mdast-util-to-hast copies the mdast code node's fence meta string onto this field, but
// only documents it in prose; it doesn't ship the type augmentation itself.
declare module "hast" {
  interface Data {
    meta?: string;
  }
}

const LANG_CLASS = /^language-(.+)$/;

// Wraps a fenced code block's <pre> in a bordered .code-block with a .code-header showing
// the language, and — if the fence's info-string carries a meta word (e.g. ```ts app.ts) —
// the filename. Mermaid blocks are already replaced with a <div> by rehypeMermaid by the
// time this runs, so they're skipped naturally; a fence with no language is left untouched.
export function rehypeCodeBlock() {
  return (tree: HastRoot) => {
    visit(tree, "element", (node, index, parent) => {
      if (node.tagName !== "pre" || !parent || index === undefined) return;
      const code = node.children.find(
        (c): c is Element => c.type === "element" && c.tagName === "code",
      );
      if (!code) return;

      const classes = Array.isArray(code.properties.className)
        ? code.properties.className.map(String)
        : [];
      const langClass = classes.find((c) => LANG_CLASS.test(c));
      if (!langClass) return;
      const lang = langClass.match(LANG_CLASS)?.[1] ?? "";

      const meta =
        typeof code.data?.meta === "string" ? code.data.meta.trim() : "";

      const headerChildren: Element[] = [
        {
          type: "element",
          tagName: "span",
          properties: { className: ["lang"] },
          children: [{ type: "text", value: lang }],
        },
      ];
      if (meta) {
        headerChildren.push({
          type: "element",
          tagName: "span",
          properties: { className: ["filename"] },
          children: [{ type: "text", value: meta }],
        });
      }

      const wrapper: Element = {
        type: "element",
        tagName: "div",
        properties: { className: ["code-block"] },
        children: [
          {
            type: "element",
            tagName: "div",
            properties: { className: ["code-header"] },
            children: headerChildren,
          },
          node,
        ],
      };
      (parent.children as RootContent[])[index] = wrapper;
    });
  };
}
