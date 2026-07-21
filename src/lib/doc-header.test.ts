import { describe, expect, it } from "vitest";
import { buildChangelog, buildEyebrow, buildMetaGrid } from "./doc-header.js";
import { formatDate } from "./frontmatter.js";

describe("buildEyebrow", () => {
  it("falls back to a plain 'Whitepaper' label when status is absent", () => {
    expect(buildEyebrow(undefined)).toBe(
      `<span class="eyebrow">Whitepaper</span>`,
    );
  });

  it("renders a status badge span when status is present", () => {
    expect(buildEyebrow("Draft")).toBe(
      `<span class="status-badge">Draft</span>`,
    );
  });
});

describe("buildMetaGrid", () => {
  it("returns an empty string when no fields are present", () => {
    expect(buildMetaGrid({})).toBe("");
  });

  it("renders only the fields that are present, in a fixed label order", () => {
    const result = buildMetaGrid({ date: "13 July 2026", author: "Jane Doe" });
    expect(result).toBe(
      `<div class="doc-info-grid">` +
        `<div class="doc-info-item"><span class="label">Date</span><span class="value">13 July 2026</span></div>` +
        `<div class="doc-info-item"><span class="label">Author</span><span class="value">Jane Doe</span></div>` +
        `</div>`,
    );
  });

  it("joins a reviewers list with commas", () => {
    const result = buildMetaGrid({ reviewers: ["Jane Doe", "John Smith"] });
    expect(result).toBe(
      `<div class="doc-info-grid">` +
        `<div class="doc-info-item"><span class="label">Reviewers</span><span class="value">Jane Doe, John Smith</span></div>` +
        `</div>`,
    );
  });
});

describe("buildChangelog", () => {
  it("returns an empty string when there are no entries", () => {
    expect(buildChangelog(undefined, formatDate)).toBe("");
    expect(buildChangelog([], formatDate)).toBe("");
  });

  it("renders a collapsed details disclosure with a table row per entry, in the given order", () => {
    const result = buildChangelog(
      [
        { version: "1.1", date: "2026-07-13", description: "Added charts." },
        { version: "1.0", date: "2026-06-01", description: "Initial release." },
      ],
      formatDate,
    );
    expect(result).toBe(
      `<details class="changelog">` +
        `<summary>Revision History</summary>` +
        `<table><thead><tr><th>Version</th><th>Date</th><th>Description</th></tr></thead>` +
        `<tbody>` +
        `<tr><td>1.1</td><td>13 July 2026</td><td>Added charts.</td></tr>` +
        `<tr><td>1.0</td><td>1 June 2026</td><td>Initial release.</td></tr>` +
        `</tbody></table>` +
        `</details>`,
    );
  });

  it("renders an empty description cell when a description is omitted", () => {
    const result = buildChangelog([{ version: "1.0" }], formatDate);
    expect(result).toContain("<td>1.0</td><td></td><td></td>");
  });
});
