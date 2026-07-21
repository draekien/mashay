import type {
  Element,
  ElementContent,
  Root as HastRoot,
  RootContent,
} from "hast";
import { textContent } from "./text-content.js";

// Wraps each h3 subsection under an "## Appendix" heading in a native <details> element,
// using the h3 (with its heading-number span) as the <summary>.
export function rehypeAppendix() {
  return (tree: HastRoot) => {
    const children = tree.children;
    const isHeadingTextMatch = (
      node: RootContent,
      tagName: string,
      label: string,
    ): boolean =>
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

    const isH2 = (node: RootContent): node is Element =>
      node.type === "element" && node.tagName === "h2";
    const isH3 = (node: RootContent): node is Element =>
      node.type === "element" && node.tagName === "h3";
    const isElementContent = (node: RootContent): node is ElementContent =>
      node.type !== "doctype";

    const result = children.slice(0, appendixIdx + 1);
    let i = appendixIdx + 1;
    while (i < children.length && !isH2(children[i])) {
      const node = children[i];
      if (isH3(node)) {
        const groupBody: ElementContent[] = [];
        i++;
        while (
          i < children.length &&
          !isH2(children[i]) &&
          !isH3(children[i])
        ) {
          const child = children[i];
          if (isElementContent(child)) groupBody.push(child);
          i++;
        }
        const details: Element = {
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
        };
        result.push(details);
        continue;
      }
      result.push(node);
      i++;
    }
    result.push(...children.slice(i));
    tree.children = result;
  };
}
