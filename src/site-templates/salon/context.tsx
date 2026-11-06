"use client";

import { createContext, useContext } from "react";
import type { SalonCatalog } from "./catalog";

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
