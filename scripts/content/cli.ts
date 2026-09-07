/**
 * Студия контента — CLI (тонкая обёртка над src/lib/content, ТЗ §5.1).
 *
 *   npm run content -- build [slug]    # спека → HTML + caption.md (+guard)
 *   npm run content -- render [slug]   # HTML → PNG (нужен Chrome)
 *   npm run content -- all [slug]      # build + render
 *
 * Спеки: scripts/content/posts/*.json · Выход: scripts/content/out/<slug>/
 */
import { readFileSync, readdirSync, mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { buildPost } from "../../src/lib/content/build";
import { runGuard, guardBlocks } from "../../src/lib/content/guard";
import { renderSlides } from "../../src/lib/content/render";
import { postSpecSchema, type PostFormat } from "../../src/lib/content/types";

const HERE = resolve(__dirname);
const ROOT = resolve(HERE, "../..");
const POSTS = join(HERE, "posts");
const OUT = join(HERE, "out");

function loadSpecs(only?: string) {
  const files = readdirSync(POSTS)
    .filter((f) => f.endsWith(".json"))
    .filter((f) => !only || f === `${only}.json`);
  if (!files.length) {
    console.error(only ? `Нет спецификации posts/${only}.json` : "В posts/ нет .json");
    process.exit(1);
  }
  return files.map((f) => {
    const raw = JSON.parse(readFileSync(join(POSTS, f), "utf8"));
    // Пути к картинкам в спеке — от корня репозитория.
    raw.slides = (raw.slides ?? []).map((s: { image?: string }) =>
      s.image && !s.image.startsWith("data:") && !s.image.startsWith("http")
        ? { ...s, image: join(ROOT, s.image.replace(/^\//, "")) }
        : s,
    );
    return raw;
  });
}

async function main() {
  const [cmd = "all", only] = process.argv.slice(2);
  const doBuild = cmd === "build" || cmd === "all";
  const doRender = cmd === "render" || cmd === "all";

  for (const raw of loadSpecs(only)) {
    const spec = postSpecSchema.parse(raw);
    const dir = join(OUT, spec.slug);
    mkdirSync(dir, { recursive: true });

    if (doBuild) {
      const issues = runGuard(spec);
      for (const i of issues) console.log(`  guard ${i.level.padEnd(7)} ${i.code}: ${i.message} (${i.path})`);
      if (guardBlocks(issues)) {
        console.error(`✗ ${spec.slug}: guard заблокировал сборку`);
        process.exitCode = 1;
        continue;
      }
      const built = buildPost(raw);
      built.slides.forEach((html, i) =>
        writeFileSync(join(dir, `${String(i + 1).padStart(2, "0")}.html`), html, "utf8"),
      );
      writeFileSync(join(dir, "caption.md"), built.captionMd, "utf8");
      writeFileSync(join(dir, "post.json"), JSON.stringify(spec, null, 2), "utf8");
      console.log(`собран      ${spec.slug.padEnd(24)} ${spec.style.padEnd(7)} ${spec.format.padEnd(6)} ${built.slides.length} слайд(ов)`);
    }

    if (doRender) {
      const htmls = readdirSync(dir)
        .filter((f) => f.endsWith(".html"))
        .sort()
        .map((f) => readFileSync(join(dir, f), "utf8"));
      if (!htmls.length) {
        console.error(`✗ ${spec.slug}: нечего рендерить — сначала build`);
        continue;
      }
      const pngs = await renderSlides(htmls, spec.format as PostFormat, { type: "png" });
      pngs.forEach((buf, i) =>
        writeFileSync(join(dir, `${String(i + 1).padStart(2, "0")}.png`), buf),
      );
      console.log(`отрендерен  ${spec.slug.padEnd(24)} ${pngs.length} PNG`);
    }
  }
}

main().catch((e) => {
  console.error("content CLI failed:", e);
  process.exit(1);
});
