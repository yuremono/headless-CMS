/**
 * CMS の SCSS をフロント向け CSS（globals.css / index.css）に出力する。
 * 使用: CSS_OUT_DIR=../0529headless-front/css node scripts/build-front-css.mjs
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import postcss from "postcss";
import tailwindcss from "tailwindcss";
import autoprefixer from "autoprefixer";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = path.resolve(
  ROOT,
  process.env.CSS_OUT_DIR ?? "../0529headless-front/css",
);
const TMP_DIR = path.join(OUT_DIR, ".scss-build");

const ENTRIES = [
  { scss: "scss/globals.scss", css: "globals.css" },
  { scss: "index.scss", css: "index.css" },
];

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

function runSass(inputScss, outputCss) {
  const result = spawnSync(
    "npx",
    ["sass", inputScss, outputCss, "--style=expanded", "--no-source-map"],
    { cwd: ROOT, stdio: "inherit", env: process.env },
  );
  if (result.status !== 0) {
    throw new Error(`sass failed for ${inputScss}`);
  }
}

async function runPostcss(inputCss, outputCss) {
  const css = await fs.readFile(inputCss, "utf8");
  const tailwindConfig = path.join(ROOT, "tailwind.config.cjs");
  const result = await postcss([
    tailwindcss(tailwindConfig),
    autoprefixer(),
  ]).process(css, { from: inputCss, to: outputCss });
  await fs.writeFile(outputCss, result.css);
}

async function main() {
  await ensureDir(OUT_DIR);
  await ensureDir(TMP_DIR);

  for (const { scss, css } of ENTRIES) {
    const pre = path.join(TMP_DIR, css.replace(/\.css$/, ".pre.css"));
    const out = path.join(OUT_DIR, css);
    runSass(scss, pre);
    await runPostcss(pre, out);
    console.log(`Wrote ${out}`);
  }

  await fs.rm(TMP_DIR, { recursive: true, force: true });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
