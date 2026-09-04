/** Portfolio category used /projects filter. */
export type ProjectCategory = "web" | "mobile" | "ai" | "automation";

/** Метрика результата для деталки проекта. */
export interface ProjectMetric {
  value: string;
  label: string;
}

export interface Project {
  slug: string;
  title: string;
  category: ProjectCategory;
  description: string;
  /** Path under /public or remote URL. */
  image: string;
  technologies: string[];
  year: number;
  url?: string;
  // ——— Редакторские поля деталки (§5). Все опциональны: код-каталог и
  //     старые записи в БД рендерятся без них (graceful degrade). ———
  client?: string;
  role?: string;
  /** Задача. */
  brief?: string;
  /** Решение. */
  solution?: string;
  /** Результат. */
  result?: string;
  metrics?: ProjectMetric[];
  /** Пути/URL дополнительных изображений галереи. */
  gallery?: string[];
}

export const projectCategories: { value: "all" | ProjectCategory; label: string }[] = [
  { value: "all", label: "All" },
  { value: "web", label: "Web" },
  { value: "mobile", label: "Mobile" },
  { value: "ai", label: "AI" },
  { value: "automation", label: "Automation" },
];

export const projects: Project[] = [
  {
    slug: "tgpg",
    title: "TGPG.UZ",
    category: "web",
    description:
      "Корпоративный сайт инжиниринговой компании: газовая инфраструктура, каталог труб и техники, 13 реализованных объектов, три языка и CMS.",
    image: "/projects/tgpg.jpg",
    technologies: ["Next.js", "TypeScript", "Tailwind CSS", "CMS"],
    year: 2026,
    url: "https://tgpg.uz",
  },
  {
    slug: "salomtv",
    title: "Salom TV",
    category: "web",
    description:
      "Онлайн-кинотеатр с эксклюзивами, сериалами и ТВ-каналами: подписки, профили и просмотр на любом устройстве.",
    image: "/projects/salomtv.jpg",
    technologies: ["React", "Node.js", "HLS-стриминг", "PostgreSQL"],
    year: 2025,
    url: "https://salomtv.uz",
  },
  {
    slug: "osnova",
    title: "Osnova",
    category: "web",
    description:
      "Карьерная edtech-платформа: курсы цифровых профессий и IT-навыков, AI-тест способностей и корпоративное обучение для команд.",
    image: "/projects/osnova.jpg",
    technologies: ["React", "Node.js", "PostgreSQL", "i18n"],
    year: 2025,
    url: "https://osnovaedu.uz",
  },
  {
    slug: "uzdplus",
    title: "UZD+",
    category: "web",
    description:
      "Стриминговый сервис UZDIGITAL: фильмы, сериалы и живые ТВ-каналы с подборками, рейтингами и подпиской.",
    image: "/projects/uzdplus.jpg",
    technologies: ["React", "Node.js", "HLS-стриминг", "Redis"],
    year: 2024,
    url: "https://uzdplus.uz",
  },
  {
    slug: "govbot",
    title: "GovBot",
    category: "ai",
    description:
      "AI-ассистент по госуслугам: понятные ответы и пошаговые сценарии о документах, налогах и визах — на трёх языках.",
    image: "/projects/govbot.jpg",
    technologies: ["Next.js", "OpenAI", "RAG", "PostgreSQL"],
    year: 2026,
    url: "https://govbot-web.vercel.app",
  },
  {
    slug: "influencehub",
    title: "InfluenceHub",
    category: "web",
    description:
      "Маркетплейс блогеров Центральной Азии: рейтинг-лига, сравнение охватов и сделки в одном месте.",
    image: "/projects/influencehub.jpg",
    technologies: ["Next.js", "TypeScript", "PostgreSQL", "Tailwind CSS"],
    year: 2026,
    url: "https://famic.vercel.app",
  },
  {
    slug: "contento",
    title: "Contento",
    category: "automation",
    description:
      "Операционная система AI-контента: превращает одну идею в готовый пакет — посты, изображения, видео и озвучку.",
    image: "/projects/contento.jpg",
    technologies: ["Next.js", "OpenAI", "TypeScript", "Vercel"],
    year: 2026,
    url: "https://contento-web.vercel.app",
  },
  {
    slug: "careeros",
    title: "CareerOS",
    category: "ai",
    description:
      "AI-платформа карьерного роста: HR-коуч, пошаговый роадмап и подготовка к собеседованиям — от растерянности до оффера.",
    image: "/projects/careeros.jpg",
    technologies: ["Next.js", "OpenAI", "TypeScript", "Supabase"],
    year: 2026,
    url: "https://nisahr-web.vercel.app",
  },
];

export function getProjectBySlug(slug: string): Project | undefined {
  return projects.find((p) => p.slug === slug);
}
