/**
 * A classified build failure. The setup kinds (unknown-template, unknown-theme,
 * no-input, output-dir) abort the whole run; the document kinds (frontmatter,
 * logo, source-read, render) are isolated so a batch can continue past them.
 */
export type BuildErrorKind =
  | "unknown-template"
  | "unknown-theme"
  | "no-input"
  | "output-dir"
  | "frontmatter"
  | "logo"
  | "source-read"
  | "render";

/** A build failure tagged with the {@link BuildErrorKind} that produced it. */
export class BuildError extends Error {
  constructor(
    readonly kind: BuildErrorKind,
    message: string,
  ) {
    super(message);
    this.name = "BuildError";
  }
}

/** Exit code returned when every document builds successfully. */
export const EXIT_SUCCESS = 0;
/** Exit code returned for an error that has no more specific classification. */
export const EXIT_UNEXPECTED = 1;
/** Exit code returned when a batch fails with more than one distinct kind. */
export const EXIT_MIXED = 30;

/** One row of the exit-code taxonomy; `kind` is set when a code maps to a {@link BuildErrorKind}. */
export interface ExitCodeEntry {
  code: number;
  description: string;
  kind?: BuildErrorKind;
}

/** Every exit code mashay can return, each with a human-readable description. */
export const EXIT_CODE_TABLE: ExitCodeEntry[] = [
  {
    code: EXIT_SUCCESS,
    description: "Success — every document built, no failures.",
  },
  { code: EXIT_UNEXPECTED, description: "Unexpected or unclassified error." },
  {
    code: 10,
    kind: "unknown-template",
    description: "Unknown --template name.",
  },
  { code: 11, kind: "unknown-theme", description: "Unknown --theme name." },
  {
    code: 12,
    kind: "no-input",
    description:
      "No input found — the source path is missing or a directory held no .md files.",
  },
  {
    code: 13,
    kind: "output-dir",
    description: "Output directory could not be created.",
  },
  {
    code: 20,
    kind: "frontmatter",
    description: "A document's frontmatter is malformed.",
  },
  {
    code: 21,
    kind: "logo",
    description: "A document's logo is missing or an unsupported format.",
  },
  {
    code: 22,
    kind: "source-read",
    description: "A source file could not be read.",
  },
  { code: 23, kind: "render", description: "A document failed to render." },
  {
    code: EXIT_MIXED,
    description:
      "Mixed — a batch produced more than one distinct failure kind.",
  },
];

const CODE_BY_KIND = new Map<BuildErrorKind, number>();
for (const entry of EXIT_CODE_TABLE) {
  if (entry.kind) CODE_BY_KIND.set(entry.kind, entry.code);
}

/** Exit code for a single classified failure. */
export function exitCodeForKind(kind: BuildErrorKind): number {
  return CODE_BY_KIND.get(kind) ?? EXIT_UNEXPECTED;
}

/**
 * Aggregate exit code for a batch's per-document failure kinds: the specific
 * code when every failure shares one kind, EXIT_MIXED when they differ, and
 * EXIT_SUCCESS when there were none.
 */
export function aggregateExitCode(kinds: BuildErrorKind[]): number {
  if (kinds.length === 0) return EXIT_SUCCESS;
  if (new Set(kinds).size === 1) return exitCodeForKind(kinds[0]);
  return EXIT_MIXED;
}
