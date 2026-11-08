"use client";

import type { ComponentProps } from "react";
import { useAfterLoad } from "./after-load";
import { Photo } from "./media";

/**
 * Фото ниже первого экрана: запрос уходит не сразу, а после загрузки страницы и паузы простоя.
 * Иначе десятки превью блюд (loading="lazy" всё равно подтягивает то, что в пределах пары экранов)
 * делят канал с главным кадром и откладывают LCP на медленной сети. Рамки у картинок заданы
 * через aspect-ratio / размеры в CSS, поэтому до появления фото вёрстка не прыгает.
 */
export function LatePhoto(props: ComponentProps<typeof Photo>) {
  return useAfterLoad() ? <Photo {...props} /> : null;
}
