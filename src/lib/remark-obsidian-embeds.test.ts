import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { VFile } from "vfile";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { processor } from "./pipeline.js";

// A 1x1 transparent PNG.
const PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "mashay-embed-test-"));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

async function render(markdown: string, notePath: string) {
  const file = await processor.process(
    new VFile({ value: markdown, path: notePath }),
  );
  return String(file);
}

describe("obsidian image embeds", () => {
  it("inlines an image found next to the note as a base64 data URI", async () => {
    const notePath = path.join(dir, "note.md");
    await writeFile(
      path.join(dir, "photo.png"),
      Buffer.from(PNG_BASE64, "base64"),
    );

    const html = await render("![[photo.png]]\n", notePath);

    expect(html).toContain("<img");
    expect(html).toContain("data:image/png;base64,");
  });

  it("finds an image in a nested subdirectory below the note", async () => {
    const notePath = path.join(dir, "note.md");
    await mkdir(path.join(dir, "assets"));
    await writeFile(
      path.join(dir, "assets", "photo.png"),
      Buffer.from(PNG_BASE64, "base64"),
    );

    const html = await render("![[photo.png]]\n", notePath);

    expect(html).toContain("data:image/png;base64,");
  });

  it("finds an image in an ancestor's attachments folder", async () => {
    await mkdir(path.join(dir, "attachments"));
    await writeFile(
      path.join(dir, "attachments", "photo.png"),
      Buffer.from(PNG_BASE64, "base64"),
    );
    await mkdir(path.join(dir, "notes"));
    const notePath = path.join(dir, "notes", "note.md");

    const html = await render("![[photo.png]]\n", notePath);

    expect(html).toContain("data:image/png;base64,");
  });

  it("applies a numeric |width as the rendered image's width attribute", async () => {
    const notePath = path.join(dir, "note.md");
    await writeFile(
      path.join(dir, "photo.png"),
      Buffer.from(PNG_BASE64, "base64"),
    );

    const html = await render("![[photo.png|300]]\n", notePath);

    expect(html).toContain('width="300"');
  });

  it("uses a non-numeric |text as alt text rather than a width", async () => {
    const notePath = path.join(dir, "note.md");
    await writeFile(
      path.join(dir, "photo.png"),
      Buffer.from(PNG_BASE64, "base64"),
    );

    const html = await render("![[photo.png|A nice photo]]\n", notePath);

    expect(html).toContain('alt="A nice photo"');
    expect(html).not.toContain("width=");
  });

  it("falls back to plain text (the target name) when the embed can't be resolved", async () => {
    const notePath = path.join(dir, "note.md");

    const html = await render("![[missing.png]]\n", notePath);

    expect(html).toContain("missing.png");
    expect(html).not.toContain("<img");
  });

  it("falls back to plain text for a non-image embed target", async () => {
    const notePath = path.join(dir, "note.md");
    await writeFile(path.join(dir, "other.pdf"), "not really a pdf");

    const html = await render("![[other.pdf]]\n", notePath);

    expect(html).toContain("other.pdf");
    expect(html).not.toContain("<img");
  });
});
