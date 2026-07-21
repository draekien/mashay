import type { Emphasis, Root as MdastRoot } from "mdast";
import { findAndReplace } from "mdast-util-find-and-replace";

// Obsidian block comments: %%hidden text%%. Only matches within a single text node, so a
// comment spanning a blank line (a paragraph break) is not stripped — a documented limitation.
const COMMENT_RE = /%%[\s\S]*?%%/g;

// Obsidian block references (e.g. "Some claim. ^block-id"): an invisible anchor id, always at
// the very end of the block they tag. Only stripped when it's the last thing in a text node.
const BLOCK_REF_RE = /[ \t]\^[A-Za-z0-9-]+$/g;

// Obsidian wikilinks: [[Note]], [[Note|Alias]], [[Note#Heading]], [[Note#Heading|Alias]]. Embeds
// (![[...]]) are handled separately by remarkObsidianEmbeds, which runs first and consumes them,
// so anything still matching here is a genuine note-to-note link.
const WIKILINK_RE = /(?<!!)\[\[([^\]]+)\]\]/g;

// Obsidian highlights: ==highlighted text==.
const HIGHLIGHT_RE = /==([^=\n]+)==/g;

function splitOnce(
  value: string,
  separator: string,
): [string, string | undefined] {
  const index = value.indexOf(separator);
  return index === -1
    ? [value, undefined]
    : [value.slice(0, index), value.slice(index + separator.length)];
}

// mashay renders each Markdown file independently with no notion of a vault, so a wikilink's
// target may never end up published as HTML — it's rendered as plain text rather than a link
// that's liable to 404.
function wikilinkText(inner: string): string {
  const [beforeAlias, alias] = splitOnce(inner, "|");
  if (alias) return alias.trim();

  const [target, heading] = splitOnce(beforeAlias, "#");
  const trimmedTarget = target.trim();
  if (heading) {
    return trimmedTarget
      ? `${trimmedTarget} › ${heading.trim()}`
      : heading.trim();
  }
  return trimmedTarget;
}

export function remarkObsidianInline() {
  return (tree: MdastRoot) => {
    findAndReplace(tree, [
      [COMMENT_RE, () => ""],
      [BLOCK_REF_RE, () => ""],
      [WIKILINK_RE, (_match: string, inner: string) => wikilinkText(inner)],
      [
        HIGHLIGHT_RE,
        (_match: string, text: string): Emphasis => ({
          type: "emphasis",
          data: { hName: "mark" },
          children: [{ type: "text", value: text }],
        }),
      ],
    ]);
  };
}
