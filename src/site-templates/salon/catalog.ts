import { pick, type Locale, type StyleId } from "../types";
import type { IconId, SalonData } from "./data";
import { toScheduleData, type ScheduleData } from "./schedule";

/**
 * Локализованный срез данных бизнеса для клиентских островов: строки уже выбраны на нужном
 * языке, поэтому в браузер не уходят переводы на два остальных языка.
 */
export interface CatalogGroup {
  id: string;
  name: string;
  icon: IconId;
}

export interface CatalogService {
  id: string;
  group: string;
  icon: IconId;
  name: string;
  note: string;
  minutes: number;
  price: number;
}

export interface CatalogPackage {
  id: string;
  name: string;
  icon: IconId;
  serviceIds: string[];
  pct: number;
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
  title: string;
  alt: string;
  tags: string[];
  serviceIds: string[];
  masterId: string;
}

export interface CatalogQuizOption {
  id: string;
  label: string;
  lookId?: string;
  icon?: IconId;
}

export interface SalonCatalog {
  locale: Locale;
  style: StyleId;
  name: string;
  telegram: string;
  mode: "demo" | "telegram";
  promo: string;
  sched: ScheduleData;
  groups: CatalogGroup[];
  services: CatalogService[];
  packages: CatalogPackage[];
  masters: CatalogMaster[];
  looks: CatalogLook[];
  filters: { id: string; name: string }[];
  quiz: { questions: { title: string; options: CatalogQuizOption[] }[] };
  perks: { id: string; name: string; icon: IconId }[];
}

export function buildCatalog(data: SalonData, locale: Locale): SalonCatalog {
  return {
    locale,
    style: data.style,
    name: data.name,
    telegram: data.telegram,
    mode: data.booking.mode,
    promo: pick(data.promo, locale),
    sched: toScheduleData(data),
    groups: data.groups.map((g) => ({ id: g.id, name: pick(g.name, locale), icon: g.icon })),
    services: data.services.map((s) => ({ id: s.id, group: s.group, icon: s.icon, name: pick(s.name, locale), note: s.note ? pick(s.note, locale) : "", minutes: s.minutes, price: s.price })),
    packages: data.packages.map((p) => ({ id: p.id, name: pick(p.name, locale), icon: p.icon, serviceIds: p.serviceIds, pct: p.pct })),
    masters: data.masters.map((m) => ({ id: m.id, name: pick(m.name, locale), role: pick(m.role, locale), years: m.years, photo: m.photo, serviceIds: m.serviceIds })),
    looks: data.looks.map((l) => ({ id: l.id, photo: l.photo, title: pick(l.title, locale), alt: pick(l.alt, locale), tags: l.tags, serviceIds: l.serviceIds, masterId: l.masterId })),
    filters: data.filters.map((f) => ({ id: f.id, name: pick(f.name, locale) })),
    quiz: { questions: data.quiz.questions.map((q) => ({ title: pick(q.title, locale), options: q.options.map((o) => ({ id: o.id, label: pick(o.label, locale), lookId: o.lookId, icon: o.icon })) })) },
    perks: data.perks.map((p) => ({ id: p.id, name: pick(p.name, locale), icon: p.icon })),
  };
}
