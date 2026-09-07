import { z } from "zod";

/**
 * Студия контента — типы и zod-схемы (docs/TZ-CONTENT-STUDIO.md §5.2).
 * Спецификация поста хранится в content_posts.spec (jsonb) и валидируется
 * на входе в билд и при сохранении из админки.
 */

export const CANVAS = {
  post: { w: 1080, h: 1350 },
  square: { w: 1080, h: 1080 },
  story: { w: 1080, h: 1920 },
} as const;

export type PostFormat = keyof typeof CANVAS;
export const FORMATS = Object.keys(CANVAS) as PostFormat[];

export const SLIDE_TYPES = [
  "cover", "stat", "points", "prices", "compare", "case", "cta",
  "terminal", "take", "word", "ui", "plate", "palette", "hl",
] as const;
export type SlideType = (typeof SLIDE_TYPES)[number];

/* ── слайды: обязательные поля по ТЗ §5.2 ── */

const base = {
  tone: z.enum(["dark", "light", "paper"]).optional(),
  frame: z.boolean().optional(),
  eyebrow: z.string().optional(),
  foot: z.string().optional(),
  swipe: z.string().optional(),
};

export const slideSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("cover"), title: z.string().min(1), subtitle: z.string().optional(), ...base }),
  z.object({ type: z.literal("stat"), value: z.string().min(1), unit: z.string().optional(), title: z.string().optional(), note: z.string().optional(), ...base }),
  z.object({
    type: z.literal("points"),
    title: z.string().optional(),
    items: z.array(z.object({ title: z.string().min(1), text: z.string().optional(), n: z.string().optional() })).min(1),
    ...base,
  }),
  z.object({
    type: z.literal("prices"),
    title: z.string().optional(),
    note: z.string().optional(),
    items: z.array(z.object({ what: z.string().min(1), val: z.string().min(1) })).min(1),
    ...base,
  }),
  z.object({
    type: z.literal("compare"),
    title: z.string().optional(),
    note: z.string().optional(),
    left: z.object({ cap: z.string(), big: z.string(), sub: z.string() }),
    right: z.object({ cap: z.string(), big: z.string(), sub: z.string() }),
    ...base,
  }),
  z.object({ type: z.literal("case"), title: z.string().optional(), image: z.string().optional(), text: z.string().optional(), tags: z.array(z.string()).optional(), ...base }),
  z.object({ type: z.literal("cta"), title: z.string().min(1), text: z.string().optional(), action: z.string().optional(), ...base }),
  z.object({
    type: z.literal("terminal"),
    title: z.string().optional(),
    window: z.string().optional(),
    text: z.string().optional(),
    lines: z.array(z.union([z.string(), z.object({ text: z.string(), kind: z.enum(["cmd", "out", "ok", "warn", "err", "comment"]).optional() })])).min(1),
    ...base,
  }),
  z.object({ type: z.literal("take"), text: z.string().min(1), note: z.string().optional(), ...base }),
  z.object({ type: z.literal("word"), line1: z.string().optional(), line2: z.string().min(1), line3: z.string().optional(), ...base }),
  z.object({
    type: z.literal("ui"),
    title: z.string().min(1),
    name: z.string().optional(),
    glyph: z.string().optional(),
    subtitle: z.string().optional(),
    actions: z.array(z.string()).max(3).optional(),
    ...base,
  }),
  z.object({ type: z.literal("plate"), hook: z.string().min(1), ask: z.string().optional(), note: z.string().optional(), image: z.string().optional(), ...base }),
  z.object({ type: z.literal("palette"), title: z.string().optional(), colors: z.array(z.string()).optional(), text: z.string().optional(), tags: z.array(z.string()).optional(), ...base }),
  z.object({ type: z.literal("hl"), word: z.string().min(1), note: z.string().optional(), ...base }),
]);

export type Slide = z.infer<typeof slideSchema>;

export const captionSchema = z
  .object({
    default: z.string().optional(),
    telegram: z.string().optional(),
    instagram: z.string().optional(),
    threads: z.string().optional(),
    short: z.string().optional(),
    linkedin: z.string().optional(),
    alt: z.string().optional(),
  })
  .partial();

export const PLATFORMS = ["telegram", "instagram", "threads", "facebook", "linkedin"] as const;
export type Platform = (typeof PLATFORMS)[number];

export const postSpecSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  title: z.string().min(1),
  style: z.string().default("studio"),
  format: z.enum(["post", "square", "story"]).default("post"),
  platforms: z
    .array(z.preprocess((v) => String(v).toLowerCase(), z.enum(PLATFORMS)))
    .default([]),
  slides: z.array(slideSchema).min(1),
  caption: captionSchema.default({}),
  hashtags: z.array(z.string()).default([]),
});

export type PostSpec = z.infer<typeof postSpecSchema>;

/* ── контракт темы (ТЗ §5.3) ── */

export interface ThemeFont {
  family: string;
  /** slug имени файла woff2: <slug>-<subset>-<weight>-normal.woff2 */
  slug: string;
  weights: number[];
}

export interface PostTheme {
  key: string;
  name: string;
  description: string;
  fonts: ThemeFont[];
  /** Только для превью-свотчей в админке. */
  palette: Record<string, string>;
  supports: SlideType[];
  /** Единственное, что реально нужно рендеру. */
  css(width: number, height: number): string;
}

/** Мета подвала слайдов. */
export interface PostMeta {
  handle: string;
  site: string;
}

export const DEFAULT_META: PostMeta = {
  handle: "@skylinedigital.uz",
  site: "skyline-digital.uz",
};

export interface GuardIssue {
  level: "error" | "warning";
  code: string;
  message: string;
  path: string;
}
