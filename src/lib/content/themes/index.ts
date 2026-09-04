import type { PostTheme } from "../types";
import { studioTheme } from "./studio";
import { vibeTheme } from "./vibe";

/**
 * Реестр тем (ТЗ §5.3): тема = один файл, экспортирующий PostTheme.
 * Новая «шкура» — новый файл + строка здесь, ничего больше.
 */
export const THEMES: Record<string, PostTheme> = {
  [studioTheme.key]: studioTheme,
  [vibeTheme.key]: vibeTheme,
};

export function getTheme(key: string): PostTheme {
  const theme = THEMES[key] ?? THEMES.studio;
  return theme;
}

export function listThemes(): PostTheme[] {
  return Object.values(THEMES);
}
