import { describe, expect, it } from "vitest";
import { FrontmatterSchema, formatDate } from "./frontmatter.js";

describe("FrontmatterSchema", () => {
  it("rejects an object with no changelog — a revision history is required", () => {
    const result = FrontmatterSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("accepts changelog-only frontmatter (all other fields are optional)", () => {
    const result = FrontmatterSchema.safeParse({
      changelog: [{ version: "1.0" }],
    });
    expect(result.success).toBe(true);
  });

  it("rejects an empty changelog list", () => {
    const result = FrontmatterSchema.safeParse({ changelog: [] });
    expect(result.success).toBe(false);
  });

  it("accepts all documented fields", () => {
    const result = FrontmatterSchema.safeParse({
      title: "Title",
      description: "Description",
      author: "Author",
      date: "2026-07-13",
      status: "Draft",
      version: "1.0",
      reviewers: ["Jane Doe", "John Smith"],
      classification: "Internal",
      changelog: [
        { version: "1.0", date: "2026-07-13", description: "Initial release." },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("rejects reviewers given as a single string instead of a list", () => {
    const result = FrontmatterSchema.safeParse({ reviewers: "Jane Doe" });
    expect(result.success).toBe(false);
  });

  it("rejects a changelog entry missing a version", () => {
    const result = FrontmatterSchema.safeParse({
      changelog: [{ date: "2026-07-13", description: "Missing version." }],
    });
    expect(result.success).toBe(false);
  });

  it("accepts a Date object for the date field", () => {
    // gray-matter parses unquoted YAML date scalars into real Date objects,
    // so the schema must accept that shape, not just strings.
    const result = FrontmatterSchema.safeParse({
      date: new Date("2026-07-13"),
      changelog: [{ version: "1.0" }],
    });
    expect(result.success).toBe(true);
  });

  it("passes through fields not in the documented schema", () => {
    const result = FrontmatterSchema.safeParse({
      tags: ["a", "b"],
      changelog: [{ version: "1.0" }],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.tags).toEqual(["a", "b"]);
    }
  });

  it("rejects a title that isn't a string", () => {
    const result = FrontmatterSchema.safeParse({ title: 123 });
    expect(result.success).toBe(false);
  });
});

describe("formatDate", () => {
  it("returns an empty string for undefined", () => {
    expect(formatDate(undefined)).toBe("");
  });

  it("formats an ISO date string as en-AU long-form (day month year)", () => {
    expect(formatDate("2026-07-13")).toBe("13 July 2026");
  });

  it("formats a Date object the same as its equivalent ISO string", () => {
    expect(formatDate(new Date("2026-01-05"))).toBe("5 January 2026");
  });

  it("returns the original string unchanged when it doesn't parse as a date", () => {
    expect(formatDate("not-a-date")).toBe("not-a-date");
  });
});
