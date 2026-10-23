import "server-only";
import type { Project } from "@/data/projects";
import { getProject, getProjects } from "@/lib/portfolio";
import { localeUrl, SITE_NAME, SITE_URL } from "@/lib/seo";

export type ProjectStoryKey = "brief" | "solution" | "result";

/**
 * Данные деталки проекта для вариантов Studio/Референс — та же логика, что у
 * старой деталки: соседи по порядку каталога, блоки «Задача/Решение/Результат»
 * только при наличии текста, JSON-LD CreativeWork. `null` — проекта нет.
 */
export async function getProjectPage(locale: string, slug: string) {
  const project = await getProject(slug);
  if (!project) return null;
  const all = await getProjects();
  const idx = all.findIndex((p) => p.slug === slug);
  const prev: Project | null = idx > 0 ? all[idx - 1] : null;
  const next: Project | null = idx >= 0 && idx < all.length - 1 ? all[idx + 1] : null;
  const story = (["brief", "solution", "result"] as const)
    .map((key) => ({ key, text: project[key] }))
    .filter((s): s is { key: ProjectStoryKey; text: string } => Boolean(s.text));
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: project.title,
    description: project.description,
    url: localeUrl(locale, `/projects/${slug}`),
    image: `${SITE_URL}${project.image}`,
    dateCreated: String(project.year),
    keywords: project.technologies.join(", "),
    creator: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
  };
  return { project, prev, next, story, metrics: project.metrics ?? [], gallery: project.gallery ?? [], jsonLd };
}
