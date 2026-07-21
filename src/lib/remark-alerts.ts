import type { ElementContent, Properties } from "hast";
import type { Blockquote, Root as MdastRoot, Paragraph } from "mdast";
import { visit } from "unist-util-visit";

// mdast-util-to-hast reads/writes these fields to bridge mdast -> hast, but only
// documents them in prose; it doesn't ship the type augmentation itself.
declare module "mdast" {
  interface Data {
    hName?: string;
    hProperties?: Properties;
    hChildren?: ElementContent[];
  }
}

// GitHub-style alert blockquotes (> [!NOTE], [!TIP], [!WARNING], [!IMPORTANT], [!CAUTION]) plus
// Obsidian's broader callout vocabulary (same "> [!type]" syntax, more type names, and an
// optional trailing +/- fold indicator for its collapsible callouts). Consolidated to four
// visual styles per the whitepaper template: info, success, warn, error. Style grouping
// follows Obsidian's semantics rather than GitHub's — important/hint are aliases of tip
// (info, not error) and caution/attention are aliases of warning (warn, not error) — so
// only genuinely negative types (danger, error, failure, bug) render red. The fold
// indicator is accepted but has no effect — the whitepaper alert box is never collapsible.
const ALERT_STYLE: Record<string, string> = {
  note: "info",
  tip: "info",
  warning: "warn",
  important: "info",
  caution: "warn",
  abstract: "info",
  summary: "info",
  tldr: "info",
  info: "info",
  todo: "info",
  hint: "info",
  success: "success",
  check: "success",
  done: "success",
  question: "warn",
  help: "warn",
  faq: "warn",
  example: "info",
  quote: "info",
  cite: "info",
  attention: "warn",
  danger: "error",
  error: "error",
  failure: "error",
  fail: "error",
  missing: "error",
  bug: "error",
};
const ALERT_LABEL: Record<string, string> = {
  note: "Note",
  tip: "Tip",
  warning: "Warning",
  important: "Important",
  caution: "Caution",
  abstract: "Summary",
  summary: "Summary",
  tldr: "Summary",
  info: "Info",
  todo: "Todo",
  hint: "Tip",
  success: "Success",
  check: "Success",
  done: "Success",
  question: "Question",
  help: "Question",
  faq: "Question",
  example: "Example",
  quote: "Quote",
  cite: "Quote",
  attention: "Warning",
  danger: "Danger",
  error: "Error",
  failure: "Failure",
  fail: "Failure",
  missing: "Failure",
  bug: "Bug",
};
const ALERT_MARKER = /^\[!([A-Za-z]+)\][+-]?\s*/i;

export function remarkAlerts() {
  return (tree: MdastRoot) => {
    visit(tree, "blockquote", (node: Blockquote) => {
      const firstParagraph = node.children[0];
      if (firstParagraph?.type !== "paragraph") return;
      const firstText = firstParagraph.children[0];
      if (firstText?.type !== "text") return;

      const match = ALERT_MARKER.exec(firstText.value);
      if (!match) return;

      const type = match[1].toLowerCase();
      if (!(type in ALERT_STYLE)) return;
      firstText.value = firstText.value.slice(match[0].length);
      if (firstText.value === "" && firstParagraph.children.length === 1) {
        node.children.shift();
      }

      node.data = {
        hName: "div",
        hProperties: { className: ["alert", `alert-${ALERT_STYLE[type]}`] },
      };
      const titleParagraph: Paragraph = {
        type: "paragraph",
        data: { hName: "p", hProperties: { className: ["alert-title"] } },
        children: [{ type: "text", value: ALERT_LABEL[type] }],
      };
      node.children.unshift(titleParagraph);
    });
  };
}
