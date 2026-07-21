import type { Element, Root as HastRoot, RootContent } from "hast";
import { visit } from "unist-util-visit";
import type { VFile } from "vfile";
import { textContent } from "./text-content.js";
import type { TocItem } from "./toc.js";

function isAppendixHeading(node: RootContent): boolean {
  return (
    node.type === "element" &&
    node.tagName === "h2" &&
    textContent(node).trim().toLowerCase() === "appendix"
  );
}

function letterFor(n: number): string {
  return String.fromCharCode(64 + n);
}

function prependNumberSpan(node: Element, number: string): void {
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
export function rehypeHeadingNumbering() {
  const levelOf: Record<string, number> = { h2: 0, h3: 1, h4: 2 };
  return (tree: HastRoot, file: VFile) => {
    const counts = [0, 0, 0];
    const appendixCounts = [0, 0];
    const toc: TocItem[] = [];
    const appendixToc: TocItem[] = [];
    let inAppendix = false;

    visit(tree, "element", (node) => {
      const levelIdx = levelOf[node.tagName];
      if (levelIdx === undefined) return;

      if (levelIdx === 0 && isAppendixHeading(node)) {
        inAppendix = true;
        return;
      }

      const id =
        typeof node.properties.id === "string" ? node.properties.id : "";

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
          id,
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
        id,
        number,
        text: textContent(node),
      });
      prependNumberSpan(node, number);
    });

    file.data.toc = toc;
    file.data.appendixToc = appendixToc;
  };
}
