#!/usr/bin/env node
/**
 * Кладёт woff2 фирменных шрифтов рядом с собой. Источник — npm-пакеты
 * @fontsource/*, то есть те же файлы, что отдаёт Google Fonts, но через
 * реестр, который доступен и локально, и в CI.
 *
 *   node src/lib/content/fonts/fetch.mjs
 *
 * Шрифты не коммитятся (см. .gitignore) — эта команда часть сборки.
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, copyFileSync, existsSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));

const WANT = {
  unbounded: ["600", "700"],
  "golos-text": ["400", "500", "600"],
  "jetbrains-mono": ["400", "700"],
};
const SUBSETS = ["cyrillic", "latin"];

const tmp = mkdtempSync(join(tmpdir(), "skyline-fonts-"));
console.log("Ставлю пакеты шрифтов во временную папку…");
execFileSync(
  "npm",
  ["i", "--no-audit", "--no-fund", "--prefix", tmp, ...Object.keys(WANT).map((p) => `@fontsource/${p}`)],
  { stdio: "inherit" },
);

let copied = 0;
for (const [pkg, weights] of Object.entries(WANT)) {
  const dir = join(tmp, "node_modules", "@fontsource", pkg, "files");
  if (!existsSync(dir)) {
    console.error(`Не нашёл файлы пакета @fontsource/${pkg}`);
    process.exit(1);
  }
  for (const w of weights) {
    for (const s of SUBSETS) {
      const name = `${pkg}-${s}-${w}-normal.woff2`;
      if (readdirSync(dir).includes(name)) {
        copyFileSync(join(dir, name), join(HERE, name));
        copied++;
      }
    }
  }
}
console.log(`Готово: ${copied} файлов в src/lib/content/fonts/`);
