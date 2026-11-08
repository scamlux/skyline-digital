/* eslint-disable @next/next/no-img-element -- шаблон переносимый (без next/image): адаптивные <img srcset> с готовыми webp */
import type { ImgHTMLAttributes } from "react";

/** Фото лежат в public/templates/restaurant/img как <имя>-<ширина>.webp. */
const BASE = "/templates/restaurant/img";

type W = 240 | 400 | 480 | 720 | 800 | 960 | 1280;

/** Какие ширины есть у файла. У hero их пять, у kazan добавлен 400 (первый экран A на телефоне), у остальных кадров — 240/480/960: лишняя ширина в srcset = 404. */
const WIDTHS: Record<string, W[]> = { hero: [480, 720, 800, 960, 1280], kazan: [240, 400, 480, 960] };
const DEFAULT_WIDTHS: W[] = [240, 480, 960];

export const widthsOf = (name: string): W[] => WIDTHS[name] ?? DEFAULT_WIDTHS;
export const imgSrc = (name: string, w: W): string => `${BASE}/${name}-${w}.webp`;
export const imgSet = (name: string, only?: W[]): string => (only ?? widthsOf(name)).map((w) => `${imgSrc(name, w)} ${w}w`).join(", ");

interface PhotoProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "srcSet" | "alt"> {
  name: string;
  /** Ширина для атрибута src (запасной вариант). */
  src: W;
  /** Подмножество ширин для srcset; по умолчанию все, что есть у файла. */
  widths?: W[];
  width: number;
  height: number;
}

/** Адаптивное фото; alt пустой — фото декоративно, рядом всегда есть подпись. */
export function Photo({ name, src, widths, width, height, sizes, ...rest }: PhotoProps) {
  // Ленивые картинки — ниже первого экрана: низкий приоритет, чтобы не отнимать канал у hero-фото.
  const priority = rest.loading === "lazy" ? ({ fetchPriority: "low" } as const) : {};
  return <img src={imgSrc(name, src)} srcSet={imgSet(name, widths)} sizes={sizes} width={width} height={height} alt="" decoding="async" {...priority} {...rest} />;
}

/**
 * Пар над казаном: три отдельных клочка. Каждый — свой SVG: размытие один раз, а двигаются только
 * transform и opacity всего элемента (композитор), поэтому первый экран не перерисовывается.
 */
export function Steam() {
  const wisps = [
    { cls: "w1", d: "M30 150C8 120 52 100 30 70S52 20 30 4" },
    { cls: "w2", d: "M30 150C54 118 8 96 30 68S10 22 30 4" },
    { cls: "w3", d: "M30 150C12 124 48 104 30 72S46 24 30 4" },
  ];
  return (
    <div className="rs-steam" aria-hidden="true">
      {wisps.map((w) => (
        <svg key={w.cls} className={w.cls} viewBox="0 0 60 154" focusable="false">
          <path d={w.d} fill="none" stroke="currentColor" strokeWidth="9" strokeLinecap="round" />
        </svg>
      ))}
    </div>
  );
}
