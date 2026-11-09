import { ratingText } from "./client-config";
import type { ClientRating, Locale } from "../types";

/**
 * Общие кирпичики настоящего контента клиента (режим "client"): строка с оценкой и имя автора отзыва.
 * Серверные компоненты без состояния; классы задаёт шаблон.
 */

const EXTERNAL = { target: "_blank", rel: "noopener noreferrer" } as const;

/** «4,9 из 5 · 128 отзывов · Google Maps»; ссылкой на источник, если владелец её дал. */
export function RatingLine({ rating, locale, className }: { rating: ClientRating; locale: Locale; className?: string }) {
  const text = ratingText(rating, locale);
  return rating.url ? (
    <a className={className} href={rating.url} {...EXTERNAL}>
      {text}
    </a>
  ) : (
    <span className={className}>{text}</span>
  );
}

/** Имя автора отзыва; ссылкой на первоисточник, если владелец её дал. */
export function ReviewAuthor({ name, url }: { name: string; url?: string }) {
  return url ? (
    <a href={url} {...EXTERNAL}>
      {name}
    </a>
  ) : (
    <>{name}</>
  );
}
