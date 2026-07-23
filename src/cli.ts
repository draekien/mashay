#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { createServer } from "node:http";
import path from "node:path";
import {
  cancel,
  groupMultiselect,
  intro,
  isCancel,
  note,
  outro,
  select,
  spinner,
  text,
} from "@clack/prompts";
import chalk from "chalk";
import { Command } from "commander";
import open from "open";
import {
  type BuildSummary,
  buildDocuments,
  DEFAULT_TEMPLATE,
  DEFAULT_THEME,
  listTemplates,
  listThemeSwatches,
  renderToHtml,
  type ThemeSwatch,
} from "./lib/build.js";
import {
  aggregateExitCode,
  BuildError,
  EXIT_UNEXPECTED,
  exitCodeForKind,
} from "./lib/errors.js";
import {
  findMarkdownFilesRecursive,
  resolveMarkdownFiles,
} from "./lib/file-discovery.js";
import {
  FORMATTING_TOPICS,
  type FormattingTopic,
} from "./lib/formatting-docs.js";

// package.json sits one level above this file both in the repo (src/, dist/)
// and in the published package (dist/), so the version is read at runtime
// rather than baked in at bundle time.
const { version } = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8"),
) as { version: string };

interface BuildFlags {
  out: string;
  template?: string;
  theme?: string;
}

const program = new Command();

program
  .name("mashay")
  .description("Convert Markdown into self-contained, styled HTML documents")
  .version(version)
  // Bare `mashay` (no subcommand) prints help; conversion lives under `process`.
  .action(() => {
    program.help();
  });

program
  .command("process")
  .description(
    "Convert Markdown to HTML (omit [src] to pick files interactively)",
  )
  .argument(
    "[src]",
    "markdown file or directory to build (omit to pick files interactively)",
  )
  .option("--out <dir>", "output directory", "out")
  .option("--template <name>", "template to render with (defaults to academic)")
  .option("--theme <name>", "theme to style with (defaults to harbor)")
  // `mashay process <src>` builds directly; `mashay process` (no src) drops into
  // interactive file-picking.
  .action(async (src: string | undefined, opts: BuildFlags) => {
    try {
      if (src) {
        await runDirect(
          src,
          opts.out,
          opts.template ?? DEFAULT_TEMPLATE,
          opts.theme ?? DEFAULT_THEME,
        );
      } else {
        await runInteractive(opts.out, opts.template, opts.theme);
      }
    } catch (err) {
      reportError(err);
    }
  });

function reportError(err: unknown): void {
  if (err instanceof BuildError) {
    console.error(chalk.red(err.message));
    process.exitCode = exitCodeForKind(err.kind);
  } else {
    console.error(chalk.red(err instanceof Error ? err.message : String(err)));
    process.exitCode = EXIT_UNEXPECTED;
  }
}

async function runDirect(
  src: string,
  out: string,
  template: string,
  theme: string,
): Promise<void> {
  const srcPath = path.resolve(process.cwd(), src);
  const outDir = path.resolve(process.cwd(), out);
  const files = await resolveMarkdownFiles(srcPath);
  if (files.length === 0) {
    throw new BuildError("no-input", `no .md files found in ${src}`);
  }
  const summary = await buildDocuments(files, outDir, { template, theme });
  reportResults(summary);
}

async function runInteractive(
  out: string,
  template: string | undefined,
  theme: string | undefined,
): Promise<void> {
  intro(chalk.bold("mashay"));

  const cwd = process.cwd();
  const files = await findMarkdownFilesRecursive(cwd);

  if (files.length === 0) {
    cancel(`No markdown files found under ${cwd}`);
    return;
  }

  const groups: Record<string, { value: string; label: string }[]> = {};
  for (const file of files) {
    const dir = path.relative(cwd, path.dirname(file)) || ".";
    // biome-ignore lint/suspicious/noAssignInExpressions: idiomatic group-by-key accumulation
    (groups[dir] ??= []).push({ value: file, label: path.basename(file) });
  }

  const selected = await groupMultiselect({
    message: "Select documents to build",
    options: groups,
    required: true,
  });

  if (isCancel(selected)) {
    cancel("Cancelled");
    return;
  }

  let selectedTemplate = template;
  if (!selectedTemplate) {
    const choice = await pickName(
      "template",
      await listTemplates(),
      DEFAULT_TEMPLATE,
    );
    if (isCancel(choice)) {
      cancel("Cancelled");
      return;
    }
    selectedTemplate = choice;
  }

  let selectedTheme = theme;
  if (!selectedTheme) {
    const choice = await pickTheme(await listThemeSwatches(), DEFAULT_THEME);
    if (isCancel(choice)) {
      cancel("Cancelled");
      return;
    }
    selectedTheme = choice;
  }

  const outDirAnswer = await text({
    message: "Output directory",
    initialValue: out,
  });

  if (isCancel(outDirAnswer)) {
    cancel("Cancelled");
    return;
  }

  const outDir = path.resolve(cwd, outDirAnswer);

  const s = spinner();
  s.start("Building documents");
  const summary = await buildDocuments(selected as string[], outDir, {
    template: selectedTemplate,
    theme: selectedTheme,
  });
  s.stop("Build complete");

  reportResults(summary);
  const built = summary.results.length;
  const failed = summary.failures.length;
  const where = path.relative(cwd, outDir) || ".";
  outro(
    failed > 0
      ? chalk.yellow(`${built} built, ${failed} failed → ${where}`)
      : chalk.green(
          `${built} document${built === 1 ? "" : "s"} written to ${where}`,
        ),
  );
}

function reportResults(summary: BuildSummary): void {
  for (const r of summary.results) {
    for (const outName of r.outNames) {
      const isHtml = outName.endsWith(".html");
      console.log(
        chalk.green("built"),
        outName + (isHtml && r.hasMermaid ? chalk.dim(" (+ mermaid)") : ""),
      );
    }
  }
  for (const f of summary.failures) {
    console.error(chalk.red("failed"), f.message);
  }
  if (summary.failures.length > 0) {
    process.exitCode = aggregateExitCode(summary.failures.map((f) => f.kind));
  }
}

program
  .command("docs")
  .description(
    "Explore the Markdown formatting rules and supported syntax mashay understands",
  )
  .argument(
    "[topic]",
    "topic id to print directly (omit for an interactive browser)",
  )
  .action(async (topic: string | undefined) => {
    await runDocs(topic);
  });

function findTopic(query: string): FormattingTopic | undefined {
  const q = query.trim().toLowerCase();
  return (
    FORMATTING_TOPICS.find((t) => t.id === q) ??
    FORMATTING_TOPICS.find(
      (t) => t.id.includes(q) || t.title.toLowerCase().includes(q),
    )
  );
}

function formatTopicBody(topic: FormattingTopic): string {
  return topic.example
    ? `${topic.summary}\n\n${chalk.dim("Example:")}\n${topic.example}`
    : topic.summary;
}

async function runDocs(topicId: string | undefined): Promise<void> {
  if (topicId) {
    const topic = findTopic(topicId);
    if (!topic) {
      console.error(chalk.red(`No formatting topic matches "${topicId}".`));
      console.error(
        `Available topics: ${FORMATTING_TOPICS.map((t) => t.id).join(", ")}`,
      );
      process.exitCode = 1;
      return;
    }
    console.log(chalk.bold(topic.title));
    console.log();
    console.log(formatTopicBody(topic));
    return;
  }

  intro(chalk.bold("mashay — formatting rules"));

  while (true) {
    const choice = await select({
      message: "Pick a topic to explore",
      options: [
        ...FORMATTING_TOPICS.map((t) => ({ value: t.id, label: t.title })),
        { value: "__exit", label: "Exit" },
      ],
    });

    if (isCancel(choice) || choice === "__exit") {
      outro("Done");
      return;
    }

    const topic = FORMATTING_TOPICS.find((t) => t.id === choice);
    if (topic) note(formatTopicBody(topic), topic.title);
  }
}

const PREVIEW_MARKDOWN = `---
title: Template & Theme Preview
description: A built-in sample document for previewing a template and theme combination.
author: mashay
date: 2026-07-23
status: Draft
version: "1.0"
reviewers:
  - Reviewer One
  - Reviewer Two
classification: Public
changelog:
  - version: "1.0"
    date: 2026-07-23
    description: Sample document used by the preview command.
---

## Introduction

This document is rendered entirely from a built-in sample so you can see how a
template and theme render prose, headings, lists, tables, code, and callouts
without needing a file of your own.

## Typography

Body text sets the tone of a theme. It should stay readable across long
passages, with comfortable line length and clear emphasis: **bold**, *italic*,
and \`inline code\` all pull their weight here.

### Lists

- Grind size — finer grinds extract faster.
- Water temperature — hotter water extracts more.
- Contact time — longer steeping pulls more into the cup.

### A table

| Method       | Grind  | Time   |
| ------------ | ------ | ------ |
| Pour-over    | Medium | 3 min  |
| French press | Coarse | 4 min  |
| Espresso     | Fine   | 30 sec |

### Code

\`\`\`ts extraction.ts
const strength = (grind: number, tempC: number, seconds: number) =>
  (tempC / 100) * (seconds / 240) * (10 / grind);
\`\`\`

## Callouts

> A good cup is repeatable — write down what you did, or you are only guessing.

> [!NOTE]
> Adjust the numbers above to taste rather than treating them as fixed.

> [!TIP]
> A 1:16 ratio of coffee to water is a reliable place to begin.

> [!IMPORTANT]
> Water is most of the cup; filtered water extracts far better than distilled.

> [!WARNING]
> Water above roughly 96 degrees Celsius pulls harsh, bitter notes.

> [!CAUTION]
> A sealed brewer under pressure can release scalding water suddenly.

## Appendix

### Methodology

Sample content compiled to exercise the template's rendered elements.

### Glossary

- **Extraction** — dissolving soluble compounds from ground coffee into water.
- **Immersion** — grounds steep in a fixed volume of water before separation.
`;

async function servePreview(html: string): Promise<void> {
  const server = createServer((_req, res) => {
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    res.end(html);
  });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;
  const url = `http://localhost:${port}`;
  console.log(chalk.green("preview"), `serving at ${url}`);
  console.log(chalk.dim("Press Ctrl+C to stop."));
  await open(url);
}

async function pickName(
  kind: string,
  names: string[],
  preferred: string | undefined,
): Promise<string | symbol> {
  if (names.length === 0) {
    return preferred ?? kind;
  }
  return select({
    message: `Select a ${kind}`,
    options: names.map((name) => ({ value: name, label: name })),
    initialValue: preferred && names.includes(preferred) ? preferred : names[0],
  });
}

function themeSwatch(colors: string[]): string {
  return colors.map((color) => chalk.hex(color)("■")).join(" ");
}

async function pickTheme(
  themes: ThemeSwatch[],
  preferred: string,
): Promise<string | symbol> {
  if (themes.length === 0) {
    return preferred;
  }
  const width = Math.max(...themes.map((theme) => theme.name.length));
  return select({
    message: "Select a theme",
    options: themes.map((theme) => ({
      value: theme.name,
      label: `${theme.name.padEnd(width)}  ${themeSwatch(theme.colors)}`,
    })),
    initialValue: themes.some((theme) => theme.name === preferred)
      ? preferred
      : themes[0].name,
  });
}

async function resolvePreviewSelection(opts: {
  template?: string;
  theme?: string;
}): Promise<{ template: string; theme: string } | undefined> {
  if (opts.template && opts.theme) {
    return { template: opts.template, theme: opts.theme };
  }

  intro(chalk.bold("mashay preview"));

  let template = opts.template;
  if (!template) {
    const choice = await pickName("template", await listTemplates(), undefined);
    if (isCancel(choice)) {
      cancel("Cancelled");
      return undefined;
    }
    template = choice;
  }

  let theme = opts.theme;
  if (!theme) {
    const choice = await pickTheme(await listThemeSwatches(), DEFAULT_THEME);
    if (isCancel(choice)) {
      cancel("Cancelled");
      return undefined;
    }
    theme = choice;
  }

  return { template, theme };
}

program
  .command("preview")
  .description(
    "Preview a template/theme combination in the browser with a built-in sample",
  )
  .option("--template <name>", "template to render with")
  .option("--theme <name>", "theme to style with (defaults to harbor)")
  .action(async (opts: { template?: string; theme?: string }) => {
    try {
      const selection = await resolvePreviewSelection(opts);
      if (!selection) return;
      const { html } = await renderToHtml(
        PREVIEW_MARKDOWN,
        path.resolve(process.cwd(), "preview.md"),
        selection,
      );
      await servePreview(html);
    } catch (err) {
      reportError(err);
    }
  });

await program.parseAsync();
