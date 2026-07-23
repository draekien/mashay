import { defineConfig } from "rolldown";

export default defineConfig({
  input: "src/cli.ts",
  platform: "node",
  // Tailwind's node/oxide packages ship native binaries, and `open` ships an
  // xdg-open helper it resolves relative to its own module path — all must load
  // from node_modules at runtime rather than being bundled into dist/cli.js.
  external: ["@tailwindcss/node", "@tailwindcss/oxide", "tailwindcss", "open"],
  output: {
    dir: "dist",
    format: "esm",
    entryFileNames: "cli.js",
    minify: true,
  },
});
