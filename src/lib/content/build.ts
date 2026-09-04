import { createHash } from "node:crypto";
import { DEFAULT_META, postSpecSchema, type PostMeta, type PostSpec } from "./types";
import { slideHtml } from "./slides";

/**
 * Сборка поста: валидированная спецификация → HTML-строки слайдов + caption.md.
 * Чистая функция без fs — файлами/Storage занимаются CLI и админка.
 */

export function specHash(spec: PostSpec): string {
  return createHash("sha256")
    .update(JSON.stringify({ slides: spec.slides, style: spec.style, format: spec.format }))
    .digest("hex");
}

export interface BuiltPost {
  spec: PostSpec;
  hash: string;
  /** По одному самодостаточному HTML-документу на слайд. */
  slides: string[];
  captionMd: string;
}

export function buildPost(rawSpec: unknown, meta: PostMeta = DEFAULT_META): BuiltPost {
  const spec = postSpecSchema.parse(rawSpec);
  const slides = spec.slides.map((s) => slideHtml(s, meta, spec.format, spec.style));
  return { spec, hash: specHash(spec), slides, captionMd: captionFile(spec) };
}

export function captionFile(post: PostSpec): string {
  const tags = (post.hashtags ?? []).join(" ");
  const c = post.caption ?? {};
  const block = (title: string, body: string, note?: string) =>
    `## ${title}\n${note ? `_${note}_\n\n` : ""}${body}\n`;

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
