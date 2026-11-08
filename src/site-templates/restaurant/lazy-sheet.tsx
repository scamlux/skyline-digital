"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";
import { useAfterLoad } from "./after-load";
import { useBook } from "./book-store";
import type { BookingSheet } from "./Sheet";

/**
 * Окно брони — самый тяжёлый остров (три шага, сетка слотов), а нужно оно только после касания кнопки.
 * Чанк подгружается после загрузки страницы и паузы простоя (или сразу, если окно уже просят открыть),
 * чтобы не делить канал с первым экраном. Состояние «открыто» живёт в book-store: касание не теряется.
 */
const Sheet = dynamic(() => import("./Sheet").then((m) => m.BookingSheet), { ssr: false });

export function LazyBookingSheet(props: ComponentProps<typeof BookingSheet>) {
  const idle = useAfterLoad();
  const asked = useBook().open;
  return idle || asked ? <Sheet {...props} /> : null;
}
