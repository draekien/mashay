export interface TocItem {
  level: number;
  id: string;
  number: string;
  text: string;
}

declare module "vfile" {
  interface DataMap {
    toc: TocItem[];
    appendixToc: TocItem[];
  }
}

interface TocTreeNode extends TocItem {
  children: TocTreeNode[];
}

function tocToTree(items: TocItem[]): TocTreeNode[] {
  const root: { children: TocTreeNode[] } = { children: [] };
  const stack: { level: number; node: { children: TocTreeNode[] } }[] = [
    { level: -1, node: root },
  ];
  for (const item of items) {
    while (stack.length && stack[stack.length - 1].level >= item.level)
      stack.pop();
    const node: TocTreeNode = { ...item, children: [] };
    stack[stack.length - 1].node.children.push(node);
    stack.push({ level: item.level, node });
  }
  return root.children;
}

function renderTocList(nodes: TocTreeNode[]): string {
  if (nodes.length === 0) return "";
  const items = nodes
    .map(
      (n) =>
        `<li><a href="#${n.id}"><span class="toc-number">${n.number}</span> ${n.text}</a>${renderTocList(n.children)}</li>`,
    )
    .join("");
  return `<ul>${items}</ul>`;
}

// The TOC renders at most 2 heading levels deep (e.g. h2 + h3) to avoid excessive
// nesting in the sidebar; deeper headings are still numbered in the body, just omitted here.
const MAX_TOC_LEVEL = 1;

export function buildToc(
  tocItems: TocItem[],
  appendixItems: TocItem[],
): string {
  const toc = tocItems.filter((item) => item.level <= MAX_TOC_LEVEL);
  const appendix = appendixItems.filter((item) => item.level <= MAX_TOC_LEVEL);
  let html = "";
  if (toc.length > 0) {
    html += `<nav class="toc"><p class="toc-label">Contents</p>${renderTocList(tocToTree(toc))}</nav>`;
  }
  if (appendix.length > 0) {
    html += `<nav class="toc toc-appendix"><p class="toc-label">Appendix</p>${renderTocList(tocToTree(appendix))}</nav>`;
  }
  return html;
}
