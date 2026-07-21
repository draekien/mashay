// Builds the optional pieces of the document header banner that render only when
// the corresponding frontmatter field is present, so a whitepaper with none of these
// fields falls back to the plain "Whitepaper" eyebrow with no meta grid. The changelog
// (required by the frontmatter schema) renders as a collapsed disclosure at the top of
// the content column.

import type { ChangelogEntry } from "./frontmatter.js";

export interface MetaGridFields {
  version?: string;
  date?: string;
  author?: string;
  reviewers?: string[];
  classification?: string;
}

export function buildEyebrow(status?: string): string {
  if (!status) return `<span class="eyebrow">Whitepaper</span>`;
  return `<span class="status-badge">${status}</span>`;
}

export function buildMetaGrid(fields: MetaGridFields): string {
  const entries: [string, string][] = (
    [
      ["Version", fields.version],
      ["Date", fields.date],
      ["Author", fields.author],
      ["Reviewers", fields.reviewers?.join(", ")],
      ["Classification", fields.classification],
    ] as [string, string | undefined][]
  ).filter((entry): entry is [string, string] => Boolean(entry[1]));

  if (entries.length === 0) return "";

  const items = entries
    .map(
      ([label, value]) =>
        `<div class="doc-info-item"><span class="label">${label}</span><span class="value">${value}</span></div>`,
    )
    .join("");
  return `<div class="doc-info-grid">${items}</div>`;
}

export function buildChangelog(
  entries: ChangelogEntry[] | undefined,
  formatDate: (value: string | Date | undefined) => string,
): string {
  if (!entries || entries.length === 0) return "";

  const rows = entries
    .map(
      (entry) =>
        `<tr><td>${entry.version}</td><td>${formatDate(entry.date)}</td><td>${entry.description ?? ""}</td></tr>`,
    )
    .join("");

  return (
    `<details class="changelog">` +
    `<summary>Revision History</summary>` +
    `<table><thead><tr><th>Version</th><th>Date</th><th>Description</th></tr></thead>` +
    `<tbody>${rows}</tbody></table>` +
    `</details>`
  );
}
