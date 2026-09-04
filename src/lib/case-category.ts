import type { ProjectType } from "@/lib/pricing/types";
import type { Project } from "@/data/projects";

/** Тип проекта/услуги → категория кейсов в портфолио (для подбора иллюстраций). */
export const CASE_CATEGORY: Record<string, Project["category"] | null> = {
  website: "web",
  webApp: "web",
  mobileApp: "mobile",
  ai: "ai",
  automation: "automation",
  uiux: null,
};

/** Подобрать кейс-иллюстрацию под тип проекта; фолбэк — любой свежий кейс. */
export function pickCase(projects: Project[], type: ProjectType | string | null | undefined) {
  const category = type ? CASE_CATEGORY[type] : undefined;
  if (category) {
    const match = projects.find((p) => p.category === category);
    if (match) return match;
  }
  return projects[0] ?? null;
}
