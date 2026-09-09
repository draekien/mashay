/**
 * Every placeholder a `template.html` may use. Each is substituted at render
 * time; one that is absent from the template simply renders nothing.
 */
export const TEMPLATE_PLACEHOLDERS = [
  "title",
  "description",
  "author",
  "eyebrow",
  "logo",
  "metaGrid",
  "changelog",
  "toc",
  "content",
  "styles",
  "mermaid",
] as const;

// Substitution is an exact `{{name}}` match, so a spaced or misspelt
// placeholder is silently left in the rendered output rather than filled.
const REQUIRED_PLACEHOLDERS: Record<string, string> = {
  content: "the document body would not be rendered at all",
  styles: "no CSS would be inlined, leaving an unstyled document",
};

const KNOWN = new Set<string>(TEMPLATE_PLACEHOLDERS);

function knownList(): string {
  return TEMPLATE_PLACEHOLDERS.map((name) => `{{${name}}}`).join(", ");
}

/**
 * Reports everything wrong with a `template.html`, as one message per problem —
 * a required placeholder it omits, or a placeholder mashay does not recognise
 * and would leave in the output verbatim. An empty array means it is usable.
 */
export function validateTemplate(html: string): string[] {
  const problems: string[] = [];

  for (const [name, consequence] of Object.entries(REQUIRED_PLACEHOLDERS)) {
    if (!html.includes(`{{${name}}}`)) {
      problems.push(`missing the {{${name}}} placeholder — ${consequence}`);
    }
  }

  const unknown = new Set<string>();
  for (const match of html.matchAll(/\{\{([^}]*)\}\}/g)) {
    if (!KNOWN.has(match[1])) unknown.add(match[0]);
  }
  if (unknown.size > 0) {
    problems.push(
      `unrecognised placeholder${unknown.size === 1 ? "" : "s"} ${[...unknown].join(", ")} — left in the output verbatim. Known placeholders: ${knownList()}`,
    );
  }

  return problems;
}

/** Names of the `--color-*` tokens a theme stylesheet declares. */
export function readColorTokens(css: string): Set<string> {
  const names = new Set<string>();
  for (const match of css.matchAll(/--color-([\w-]+)\s*:/g)) {
    names.add(match[1]);
  }
  return names;
}

const MISSING_SHOWN = 8;

/**
 * Reports whether a theme stylesheet declares every colour token in `required`.
 * Templates are written against the full token set, so one a theme omits
 * resolves to nothing wherever a template uses it. An empty array means the
 * theme satisfies the contract.
 */
export function validateTheme(
  css: string,
  required: Iterable<string>,
): string[] {
  const declared = readColorTokens(css);
  const missing = [...required].filter((name) => !declared.has(name));
  if (missing.length === 0) return [];

  const shown = missing
    .slice(0, MISSING_SHOWN)
    .map((name) => `--color-${name}`)
    .join(", ");
  const rest =
    missing.length > MISSING_SHOWN
      ? ` (and ${missing.length - MISSING_SHOWN} more)`
      : "";
  return [
    `missing ${missing.length} colour token${missing.length === 1 ? "" : "s"} the templates rely on: ${shown}${rest}`,
  ];
}
