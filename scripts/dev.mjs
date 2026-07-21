#!/usr/bin/env node
// Dev-only watch server: rebuilds examples/ -> out/ whenever pipeline source or
// example/template/theme files change, and live-reloads any open browser tab via
// SSE so you don't have to refresh manually.
import { exec } from "node:child_process";
import { createReadStream } from "node:fs";
import { readdir, stat } from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(fileURLToPath(import.meta.url), "..", "..");
const OUT_DIR = path.join(ROOT, "out");
const PORT = Number(process.env.PORT) || 5173;

const RELOAD_SCRIPT = `
<script>
  new EventSource("/__dev-reload").onmessage = () => location.reload();
</script>`;

const sseClients = new Set();

function notifyReload() {
  for (const res of sseClients) res.write("data: reload\n\n");
}

function run(command) {
  return new Promise((resolve, reject) => {
    exec(command, { cwd: ROOT }, (err, stdout, stderr) => {
      if (err) {
        console.error(stderr || stdout);
        reject(err);
        return;
      }
      resolve();
    });
  });
}

let building = false;
let rebuildQueued = false;

async function build() {
  if (building) {
    rebuildQueued = true;
    return;
  }
  building = true;
  const start = Date.now();
  try {
    await run("pnpm run build");
    await run("node dist/cli.js examples --out out");
    console.log(`rebuilt in ${Date.now() - start}ms`);
    notifyReload();
  } catch {
    console.error("build failed — fix the error above and save again");
  } finally {
    building = false;
    if (rebuildQueued) {
      rebuildQueued = false;
      await build();
    }
  }
}

let debounceTimer;
function scheduleBuild() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(build, 150);
}

const { watch } = await import("node:fs");
for (const dir of ["src", "examples", "templates", "themes"]) {
  watch(path.join(ROOT, dir), { recursive: true }, scheduleBuild);
}

const MIME = {
  ".html": "text/html",
  ".svg": "image/svg+xml",
  ".js": "text/javascript",
};

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", "http://localhost");

  if (url.pathname === "/__dev-reload") {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });
    sseClients.add(res);
    req.on("close", () => sseClients.delete(res));
    return;
  }

  if (url.pathname === "/") {
    const files = (await readdir(OUT_DIR).catch(() => [])).filter((f) =>
      f.endsWith(".html"),
    );
    const links = files
      .map((f) => `<li><a href="/${f}">${f}</a></li>`)
      .join("");
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(`<!doctype html><body><ul>${links}</ul></body>`);
    return;
  }

  const filePath = path.join(OUT_DIR, decodeURIComponent(url.pathname));
  if (!filePath.startsWith(OUT_DIR)) {
    res.writeHead(403).end();
    return;
  }

  try {
    const info = await stat(filePath);
    if (!info.isFile()) throw new Error("not a file");
    if (filePath.endsWith(".html")) {
      const chunks = [];
      for await (const chunk of createReadStream(filePath)) chunks.push(chunk);
      const html = Buffer.concat(chunks)
        .toString("utf8")
        .replace("</body>", `${RELOAD_SCRIPT}</body>`);
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(html);
    } else {
      res.writeHead(200, {
        "Content-Type":
          MIME[path.extname(filePath)] ?? "application/octet-stream",
      });
      createReadStream(filePath).pipe(res);
    }
  } catch {
    res.writeHead(404).end("Not found");
  }
});

server.listen(PORT, () => {
  console.log(`watching for changes — serving out on http://localhost:${PORT}`);
  build();
});
