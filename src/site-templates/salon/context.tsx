"use client";

import { createContext, useContext } from "react";
import type { SalonCatalog } from "./catalog";
import { salonStores, type SalonStore } from "./store";

const Ctx = createContext<SalonCatalog | null>(null);

/** Один раз отдаёт локализованный каталог всем клиентским островам страницы (серверные секции передаются как children). */
export function SalonProvider({ catalog, children }: { catalog: SalonCatalog; children: React.ReactNode }) {
  return <Ctx.Provider value={catalog}>{children}</Ctx.Provider>;
}

export function useSalon(): SalonCatalog {
  const c = useContext(Ctx);
  if (!c) throw new Error("SalonProvider не найден");
  return c;
}

/** Состояние и действия демо-хранилища ЭТОГО бизнеса (барбершоп и салон красоты не смешиваются). */
export function useSalonStore(): { state: ReturnType<SalonStore["useState"]>; demo: SalonStore["demo"] } {
  const { style } = useSalon();
  const store = salonStores[style];
  return { state: store.useState(), demo: store.demo };
}
