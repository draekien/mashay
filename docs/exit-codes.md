# Exit codes

`mashay process` exits `0` when every document builds and non-zero on any
failure. Per-document failures are isolated — one bad document is reported to
stderr but never stops the rest of a batch — while setup problems (unknown
template/theme, missing input, an uncreatable output directory) abort the whole
run. When a batch fails, the code is the specific one below if every failure
shares one kind, or `30` (mixed) if they differ; the full per-document breakdown
always prints regardless.

| Code | Meaning |
|---|---|
| 0 | Success — every document built, no failures |
| 1 | Unexpected or unclassified error |
| 10 | Unknown `--template` name |
| 11 | Unknown `--theme` name |
| 12 | No input found (missing source path, or a directory with no `.md` files) |
| 13 | Output directory could not be created |
| 20 | A document's frontmatter is malformed |
| 21 | A document's logo is missing or an unsupported format |
| 22 | A source file could not be read |
| 23 | A document failed to render |
| 30 | Mixed — a batch produced more than one distinct failure kind |

This table is also available at the terminal via `mashay docs exit-codes`.
