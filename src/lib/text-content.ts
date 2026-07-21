import type { ElementContent, RootContent } from "hast";

export function textContent(node: ElementContent | RootContent): string {
  if (node.type === "text") return node.value;
  if ("children" in node) return node.children.map(textContent).join("");
  return "";
}
