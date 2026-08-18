/** Portfolio category used for the /projects filter. */
export type ProjectCategory = "web" | "mobile" | "ai" | "automation";

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
    slug: "influencehub",
    title: "InfluenceHub",
    category: "web",
    description:
      "Маркетплейс блогеров Центральной Азии: рейтинг-лига, сравнение охватов и сделки в одном месте.",
    image: "/projects/famic.jpg",
    technologies: ["Next.js", "TypeScript", "PostgreSQL", "Tailwind CSS"],
    year: 2026,
    url: "https://famic.vercel.app",
  },
  {
    slug: "contento",
    title: "Contento",
    category: "automation",
    description:
      "Операционная система AI-контента: превращает одну идею в готовый контент-пакет — посты, изображения, видео и озвучку.",
    image: "/projects/contento.jpg",
    technologies: ["Next.js", "OpenAI", "TypeScript", "Vercel"],
    year: 2026,
    url: "https://contento-web.vercel.app",
  },
  {
    slug: "govbot",
    title: "GovBot",
    category: "ai",
    description:
      "AI-ассистент по госуслугам: понятные ответы о документах, налогах и визах на трёх языках.",
    image: "/projects/govbot.jpg",
    technologies: ["Next.js", "OpenAI", "RAG", "PostgreSQL"],
    year: 2026,
    url: "https://govbot-web.vercel.app",
  },
  {
    slug: "careeros",
    title: "CareerOS",
    category: "ai",
    description:
      "AI-платформа карьерного роста: HR-коуч, пошаговый роадмап и подготовка к собеседованиям.",
    image: "/projects/nisahr.jpg",
    technologies: ["Next.js", "OpenAI", "TypeScript", "Supabase"],
    year: 2026,
    url: "https://nisahr-web.vercel.app",
  },
];

export function getProjectBySlug(slug: string): Project | undefined {
  return projects.find((p) => p.slug === slug);
}
