#!/usr/bin/env node
/**
 * Сборка контента: спецификация поста (JSON) → HTML-слайды + подписи по площадкам.
 *
 *   node scripts/content/build.mjs              # собрать все посты
 *   node scripts/content/build.mjs ceny-sajta   # собрать один
 *
 * Рендер в PNG — отдельным шагом: scripts/content/render.mjs
 * Почему две стадии: HTML собирается где угодно и мгновенно, браузер нужен
 * только на втором шаге. В CI это разные джобы, локально — две команды.
 */
import { readFileSync, readdirSync, mkdirSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { slideHtml } from "./slides.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "../..");
const POSTS = join(HERE, "posts");
const OUT = join(HERE, "out");

const META = {
  handle: "@skyline.digital.uz",
  site: "skyline-digital.uz",
};

/** Пути к картинкам в спецификации даются от корня репозитория. */
const resolveImages = (slides) =>
  slides.map((s) => (s.image ? { ...s, image: join(ROOT, s.image.replace(/^\//, "")) } : s));

function captionFile(post) {
  const tags = (post.hashtags ?? []).join(" ");
  const c = post.caption ?? {};
  const block = (title, body, note) => `## ${title}\n${note ? `_${note}_\n\n` : ""}${body}\n`;

  return `# ${post.title}

Формат: ${post.format === "story" ? "сторис" : "карусель"} · слайдов: ${post.slides.length}
Площадки: ${(post.platforms ?? []).join(" · ")}

---

${block("Instagram", `${c.instagram ?? c.default ?? ""}\n\n${tags}`, "до 2200 знаков, не больше 30 хэштегов")}
---

${block("Telegram", c.telegram ?? c.default ?? "", "разметка Markdown, ссылки живые")}
---

${block("Threads", c.threads ?? c.short ?? c.default ?? "", "до 500 знаков, ровно один хэштег")}
---

${block("LinkedIn", c.linkedin ?? "", "на английском, до 3000 знаков")}
`;
}

function buildPost(file) {
  const post = JSON.parse(readFileSync(join(POSTS, file), "utf8"));
  const dir = join(OUT, post.slug);
  // Чистим папку, но не падаем, если файлы удалить нельзя (примонтированная ФС
  // без прав на unlink). Слайды всё равно перезаписываются по именам.
  if (existsSync(dir)) {
    try {
      rmSync(dir, { recursive: true });
    } catch {
      /* переживём: ниже перезапишем поверх */
    }
  }
  mkdirSync(dir, { recursive: true });

  const slides = resolveImages(post.slides);
  slides.forEach((slide, i) => {
    const n = String(i + 1).padStart(2, "0");
    writeFileSync(join(dir, `${n}.html`), slideHtml(slide, META, post.format, post.style), "utf8");
  });

  writeFileSync(join(dir, "caption.md"), captionFile(post), "utf8");
  writeFileSync(join(dir, "post.json"), JSON.stringify(post, null, 2), "utf8");
  return { slug: post.slug, slides: slides.length, format: post.format, style: post.style };
}

const only = process.argv[2];
const files = readdirSync(POSTS)
  .filter((f) => f.endsWith(".json"))
  .filter((f) => !only || f === `${only}.json`);

if (!files.length) {
  console.error(only ? `Нет спецификации posts/${only}.json` : "В posts/ нет ни одного .json");
  process.exit(1);
}

mkdirSync(OUT, { recursive: true });
for (const f of files) {
  const r = buildPost(f);
  console.log(`собран  ${r.slug.padEnd(26)} ${(r.style ?? "studio").padEnd(7)} ${r.format.padEnd(6)} ${r.slides} слайд(ов)`);
}
console.log(`\nHTML в scripts/content/out/ — дальше: node scripts/content/render.mjs`);
