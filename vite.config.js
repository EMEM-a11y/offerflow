import { defineConfig } from "vite";
import { copyFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { SEED_QUESTIONS } from "./src/question-bank.js";

export default defineConfig(({ command }) => ({
  base: process.env.OFFERFLOW_BASE || "/",
  // Old, disabled question banks stay on disk but are not published with the site.
  publicDir: command === "build" ? false : "public",
  plugins: [{
    name: "publish-active-public-assets",
    apply: "build",
    async closeBundle() {
      const files = new Set(["assets/wooden-fish-v3.png", "example-question-bank.json", "data/campus-jobs-snapshot.json", "data/radar-updates.json", "data/official-live-jobs.json"]);
      for (const question of SEED_QUESTIONS) {
        for (const image of [question.image, ...(question.images || []), ...(question.optionImages || [])].filter(Boolean)) {
          if (image.startsWith("/question-images/") && !image.includes("..")) files.add(image.slice(1));
        }
      }
      for (const file of files) {
        const target = resolve("dist", file);
        await mkdir(dirname(target), { recursive: true });
        await copyFile(resolve("public", file), target);
      }
    },
  }],
  server: { fs: { deny: [".env", ".env.*", "**/.git/**", "**/private/**", "**/work/**", "**/tmp/**"] } },
}));
