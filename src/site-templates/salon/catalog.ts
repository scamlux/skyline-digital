import { pick, type Locale } from "../types";
import type { Category, SalonData } from "./data";
import { toScheduleData, type ScheduleData } from "./schedule";

/**
 * Локализованный срез данных салона для клиентских островов: строки уже выбраны на нужном
 * языке, поэтому в браузер не уходят переводы на два остальных языка.
 */
export interface CatalogService {
  id: string;
  cat: Category;
  name: string;
  blurb: string;
  minutes: number;
  price: number;
}

export interface CatalogMaster {
  id: string;
  name: string;
  role: string;
  years: number;
  photo: string;
  serviceIds: string[];
}

export interface CatalogLook {
  id: string;
  photo: string;
  audience: "men" | "women";
  title: string;
  tag: string;
  alt: string;
  serviceIds: string[];
  masterId: string;
}

export interface SalonCatalog {
  locale: Locale;
  name: string;
  telegram: string;
  mode: "demo" | "telegram";
  sched: ScheduleData;
  services: CatalogService[];
  masters: CatalogMaster[];
  looks: CatalogLook[];
}

export function buildCatalog(data: SalonData, locale: Locale): SalonCatalog {
  return {
    locale,
    name: data.name,
    telegram: data.telegram,
    mode: data.booking.mode,
    sched: toScheduleData(data),
    services: data.services.map((s) => ({ id: s.id, cat: s.cat, name: pick(s.name, locale), blurb: pick(s.blurb, locale), minutes: s.minutes, price: s.price })),
    masters: data.masters.map((m) => ({ id: m.id, name: pick(m.name, locale), role: pick(m.role, locale), years: m.years, photo: m.photo, serviceIds: m.serviceIds })),
    looks: data.looks.map((l) => ({ id: l.id, photo: l.photo, audience: l.audience, title: pick(l.title, locale), tag: pick(l.tag, locale), alt: pick(l.alt, locale), serviceIds: l.serviceIds, masterId: l.masterId })),
  };
}
