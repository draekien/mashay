import { defineConfig } from "rolldown";

export default defineConfig({
  input: "src/cli.ts",
  platform: "node",
  output: {
    dir: "dist",
    format: "esm",
    entryFileNames: "cli.js",
    minify: true,
  },
});
