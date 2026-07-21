import { z } from "zod";

const ChangelogEntrySchema = z.object({
  version: z.string(),
  date: z.union([z.string(), z.date()]).optional(),
  description: z.string().optional(),
});

export type ChangelogEntry = z.infer<typeof ChangelogEntrySchema>;

export const FrontmatterSchema = z
  .object({
    title: z.string().optional(),
    description: z.string().optional(),
    author: z.string().optional(),
    logo: z.string().optional(),
    date: z.union([z.string(), z.date()]).optional(),
    status: z.string().optional(),
    version: z.string().optional(),
    reviewers: z.array(z.string()).optional(),
    classification: z.string().optional(),
    changelog: z
      .array(
        ChangelogEntrySchema,
        "a revision history is required — add a changelog with at least the initial version",
      )
      .min(
        1,
        "a revision history needs at least one entry — record the initial version",
      ),
  })
  .passthrough();

export type Frontmatter = z.infer<typeof FrontmatterSchema>;

export function formatDate(value: string | Date | undefined): string {
  if (!value) return "";
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime())
    ? String(value)
    : d.toLocaleDateString("en-AU", {
        year: "numeric",
        month: "long",
        day: "numeric",
        timeZone: "UTC",
      });
}
