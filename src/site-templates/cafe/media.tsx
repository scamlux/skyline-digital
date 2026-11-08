/* eslint-disable @next/next/no-img-element -- шаблон переносимый (без next/image): адаптивные <img srcset> с готовыми webp */
import type { ImgHTMLAttributes, ReactElement } from "react";
import type { GlyphKind } from "./data";

/** Фото кофейни лежит в public/templates/cafe/img как <имя>-<ширина>.webp. */
const BASE = "/templates/cafe/img";

type W = 240 | 480 | 960 | 1280;

export const imgSrc = (name: string, w: W): string => `${BASE}/${name}-${w}.webp`;
export const imgSet = (name: string, widths: W[]): string => widths.map((w) => `${imgSrc(name, w)} ${w}w`).join(", ");

interface PhotoProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "srcSet" | "alt"> {
  name: string;
  widths: W[];
  /** Ширина для атрибута src (запасной вариант). */
  src: W;
  width: number;
  height: number;
}

/** Адаптивное фото; alt пустой — фото декоративно, рядом всегда есть подпись. */
export function Photo({ name, widths, src, width, height, sizes, ...rest }: PhotoProps) {
  // Ленивые картинки — ниже первого экрана: низкий приоритет, чтобы не отнимать канал у hero-фото.
  const priority = rest.loading === "lazy" ? ({ fetchPriority: "low" } as const) : {};
  return <img src={imgSrc(name, src)} srcSet={imgSet(name, widths)} sizes={sizes} width={width} height={height} alt="" decoding="async" {...priority} {...rest} />;
}

/** Нарисованная плитка для позиций, у которых нет файла фото: плоская графика в токенах стиля (--glyph-1…3). */
export function Glyph({ kind }: { kind: GlyphKind }) {
  return (
    <svg viewBox="0 0 120 120" className="cf-glyph" aria-hidden="true" focusable="false">
      {GLYPHS[kind]}
    </svg>
  );
}

const SEEDS = [
  [44, 46, -20],
  [74, 42, 30],
  [52, 74, 70],
  [80, 70, -40],
  [62, 58, 10],
];

const GLYPHS: Record<GlyphKind, ReactElement> = {
  cup: (
    <>
      <path d="M44 26c-6-8 6-12 0-20M60 28c-7-9 7-14 0-24M76 26c-6-8 6-12 0-20" fill="none" stroke="var(--glyph-3)" strokeWidth="4" strokeLinecap="round" opacity="0.7" />
      <path d="M24 44h64v26a28 28 0 0 1-28 28h-8a28 28 0 0 1-28-28V44Z" fill="var(--glyph-2)" />
      <path d="M88 52h6a12 12 0 0 1 0 24h-8" fill="none" stroke="var(--glyph-2)" strokeWidth="8" strokeLinecap="round" />
      <ellipse cx="56" cy="45" rx="32" ry="6" fill="var(--glyph-3)" />
      <ellipse cx="56" cy="46" rx="26" ry="3.5" fill="var(--glyph-1)" />
      <ellipse cx="56" cy="108" rx="40" ry="5" fill="var(--glyph-1)" opacity="0.55" />
    </>
  ),
  iced: (
    <>
      <path d="M32 30h56l-7 70a8 8 0 0 1-8 7H47a8 8 0 0 1-8-7l-7-70Z" fill="var(--glyph-3)" opacity="0.75" />
      <path d="M35 52h50l-4 48a8 8 0 0 1-8 7H47a8 8 0 0 1-8-7l-4-48Z" fill="var(--glyph-2)" />
      <path d="M38 52h44l-1 12H39l-1-12Z" fill="var(--glyph-1)" />
      <rect x="46" y="40" width="16" height="16" rx="4" fill="var(--glyph-3)" transform="rotate(-10 54 48)" />
      <rect x="64" y="44" width="14" height="14" rx="4" fill="var(--glyph-3)" transform="rotate(14 71 51)" opacity="0.9" />
      <path d="M68 8 62 40" stroke="var(--glyph-1)" strokeWidth="6" strokeLinecap="round" />
    </>
  ),
  matcha: (
    <>
      <path d="M26 46h68v26a30 30 0 0 1-30 30h-8a30 30 0 0 1-30-30V46Z" fill="var(--glyph-3)" />
      <path d="M30 56h60v16a26 26 0 0 1-26 26h-8a26 26 0 0 1-26-26V56Z" fill="#7da158" />
      <ellipse cx="60" cy="46" rx="34" ry="7" fill="#c9dba6" />
      <path d="M44 46c6-4 10 4 16 0s10 4 16 0" stroke="#f3f6e9" strokeWidth="4" strokeLinecap="round" fill="none" />
    </>
  ),
  glass: (
    <>
      <path d="M32 24h56l-6 72a8 8 0 0 1-8 7H46a8 8 0 0 1-8-7l-6-72Z" fill="var(--glyph-3)" opacity="0.7" />
      <path d="M35 44h50l-4 52a8 8 0 0 1-8 7H47a8 8 0 0 1-8-7l-4-52Z" fill="var(--glyph-1)" />
      <circle cx="60" cy="68" r="15" fill="var(--glyph-2)" />
      <path d="M60 53v30M45 68h30M49.5 57.5l21 21M70.5 57.5l-21 21" stroke="var(--glyph-3)" strokeWidth="2.5" opacity="0.8" />
      <path d="M78 10 66 40" stroke="var(--glyph-2)" strokeWidth="6" strokeLinecap="round" />
    </>
  ),
  croissant: (
    <>
      <path d="M12 76c4-34 28-48 48-48s44 14 48 48c-8 6-16 4-22-2-4 10-14 14-26 14s-22-4-26-14c-6 6-14 8-22 2Z" fill="var(--glyph-1)" />
      <path d="M44 32c-2 14-2 30 2 48M60 28c-2 16-2 34 0 54M76 32c2 14 2 30-2 48" stroke="var(--glyph-2)" strokeWidth="5" strokeLinecap="round" fill="none" opacity="0.55" />
      <path d="M24 70c-2 4-4 6-8 6M96 70c2 4 4 6 8 6" stroke="var(--glyph-2)" strokeWidth="5" strokeLinecap="round" opacity="0.55" />
      <circle cx="56" cy="40" r="3" fill="var(--glyph-3)" />
      <circle cx="68" cy="44" r="3" fill="var(--glyph-3)" />
    </>
  ),
  cookie: (
    <>
      <circle cx="60" cy="60" r="44" fill="var(--glyph-1)" />
      <circle cx="60" cy="60" r="44" fill="none" stroke="var(--glyph-3)" strokeWidth="3" strokeDasharray="2 9" strokeLinecap="round" />
      {SEEDS.map(([x, y, r]) => (
        <path key={`${x}-${y}`} d="M0-7c4 3 6 6 6 9a6 6 0 0 1-12 0c0-3 2-6 6-9Z" transform={`translate(${x} ${y}) rotate(${r})`} fill="var(--glyph-2)" />
      ))}
    </>
  ),
  plate: (
    <>
      <ellipse cx="60" cy="68" rx="48" ry="34" fill="var(--glyph-3)" opacity="0.8" />
      <ellipse cx="60" cy="66" rx="38" ry="26" fill="var(--surface)" />
      <circle cx="46" cy="60" r="14" fill="var(--glyph-1)" />
      <circle cx="68" cy="56" r="14" fill="var(--glyph-1)" />
      <circle cx="60" cy="72" r="14" fill="var(--glyph-1)" />
      <circle cx="56" cy="64" r="5" fill="var(--glyph-2)" />
    </>
  ),
  toast: (
    <>
      <path d="M22 50a16 16 0 0 1 16-16h44a16 16 0 0 1 16 16v4a8 8 0 0 1-4 7v33a8 8 0 0 1-8 8H34a8 8 0 0 1-8-8V61a8 8 0 0 1-4-7v-4Z" fill="var(--glyph-1)" />
      <path d="M34 50h52v44H34V50Z" fill="#9fb878" />
      <ellipse cx="60" cy="72" rx="16" ry="12" fill="#c9dba6" />
      <circle cx="60" cy="72" r="6" fill="var(--glyph-2)" />
      <circle cx="44" cy="58" r="3" fill="var(--glyph-3)" />
      <circle cx="76" cy="86" r="3" fill="var(--glyph-3)" />
    </>
  ),
  bowl: (
    <>
      <path d="M18 62h84a42 42 0 0 1-42 42 42 42 0 0 1-42-42Z" fill="var(--glyph-2)" />
      <path d="M26 62c4-14 16-22 34-22s30 8 34 22H26Z" fill="var(--glyph-3)" />
      <circle cx="46" cy="52" r="5" fill="var(--glyph-1)" />
      <circle cx="64" cy="48" r="6" fill="var(--glyph-1)" />
      <circle cx="78" cy="55" r="5" fill="#c4553a" />
      <circle cx="56" cy="58" r="4" fill="#c4553a" />
    </>
  ),
  cake: (
    <>
      <path d="M14 90 30 44a8 8 0 0 1 8-6h56a8 8 0 0 1 8 10l-12 44a8 8 0 0 1-8 6H22a8 8 0 0 1-8-8Z" fill="var(--glyph-1)" />
      <path d="M18 76 28 50h72l-6 22H18Z" fill="var(--glyph-3)" />
      <path d="M32 50c0 10 8 10 8 0s8-8 8 0 8 10 8 0 8-8 8 0 8 10 8 0" fill="var(--glyph-2)" />
      <circle cx="82" cy="30" r="9" fill="#c4553a" />
      <path d="M82 22c2-6 6-8 10-8" stroke="#4f6a42" strokeWidth="3" strokeLinecap="round" fill="none" />
    </>
  ),
  brownie: (
    <>
      <rect x="22" y="34" width="76" height="56" rx="12" fill="var(--glyph-2)" />
      <rect x="22" y="34" width="76" height="22" rx="12" fill="var(--glyph-3)" />
      <path d="M36 46h10M58 44h14M82 48h6" stroke="var(--glyph-1)" strokeWidth="4" strokeLinecap="round" />
      <path d="M34 72h20M64 76h22" stroke="var(--glyph-3)" strokeWidth="3" strokeLinecap="round" opacity="0.6" />
    </>
  ),
};

/** Кружка с паром: наклейка в первом экране. Пар поднимается CSS-анимацией (transform/opacity). */
export function SteamCup() {
  return (
    <svg viewBox="0 0 160 170" className="cf-cup" aria-hidden="true" focusable="false">
      <g className="cf-steam" fill="none" strokeLinecap="round" strokeWidth="7">
        <path className="s1" d="M60 56c-9-10 9-17 0-28" />
        <path className="s2" d="M82 56c-10-12 10-20 0-34" />
        <path className="s3" d="M104 56c-9-10 9-17 0-28" />
      </g>
      <path d="M32 78h96v30a38 38 0 0 1-38 38h-20a38 38 0 0 1-38-38V78Z" fill="var(--cup)" />
      <path d="M128 90h10a16 16 0 0 1 0 32h-14" fill="none" stroke="var(--cup)" strokeWidth="11" strokeLinecap="round" />
      <ellipse cx="80" cy="78" rx="48" ry="9" fill="var(--cup-rim)" />
      <ellipse cx="80" cy="79" rx="40" ry="6" fill="var(--cup-coffee)" />
      <path d="M44 100h12M44 114h24" stroke="var(--cup-rim)" strokeWidth="5" strokeLinecap="round" opacity="0.55" />
    </svg>
  );
}
