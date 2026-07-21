#!/usr/bin/env node
import { readFileSync } from "node:fs";
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
import { type BuildResult, buildDocuments } from "./lib/build.js";
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
  template: string;
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
  .option("--template <name>", "template to render with", "academic")
  .option(
    "--theme <name>",
    "theme to style with (defaults to the template name)",
  )
  // `mashay process <src>` builds directly; `mashay process` (no src) drops into
  // interactive file-picking.
  .action(async (src: string | undefined, opts: BuildFlags) => {
    const theme = opts.theme ?? opts.template;
    try {
      if (src) {
        await runDirect(src, opts.out, opts.template, theme);
      } else {
        await runInteractive(opts.out, opts.template, theme);
      }
    } catch (err) {
      console.error(
        chalk.red(err instanceof Error ? err.message : String(err)),
      );
      process.exitCode = 1;
    }
  });

async function runDirect(
  src: string,
  out: string,
  template: string,
  theme: string,
): Promise<void> {
  const srcPath = path.resolve(process.cwd(), src);
  const outDir = path.resolve(process.cwd(), out);
  const files = await resolveMarkdownFiles(srcPath);
  const results = await buildDocuments(files, outDir, { template, theme });
  reportResults(results);
}

async function runInteractive(
  out: string,
  template: string,
  theme: string,
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
  const results = await buildDocuments(selected as string[], outDir, {
    template,
    theme,
  });
  s.stop("Build complete");

  reportResults(results);
  outro(
    chalk.green(
      `${results.length} document${results.length === 1 ? "" : "s"} written to ${path.relative(cwd, outDir) || "."}`,
    ),
  );
}

function reportResults(results: BuildResult[]): void {
  for (const r of results) {
    for (const outName of r.outNames) {
      const isHtml = outName.endsWith(".html");
      console.log(
        chalk.green("built"),
        outName + (isHtml && r.hasMermaid ? chalk.dim(" (+ mermaid)") : ""),
      );
    }
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

await program.parseAsync();
