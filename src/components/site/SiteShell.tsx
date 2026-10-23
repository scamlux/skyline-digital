import { setRequestLocale } from "next-intl/server";
import type { SiteVersion } from "@/lib/site/version";
import { OldChrome } from "./chrome/OldChrome";

/**
 * Вариантный каркас публичной страницы (Header/Footer/preloader/курсор).
 *
 * Каркас живёт в странице, а не в `[locale]/layout.tsx`, потому что вариант
 * выбирается постранично: страница без готового Studio/Референс отдаётся
 * целиком в `old` — вместе со старым каркасом.
 *
 * `variant` — уже **разрешённый** вариант (после `resolveVariant`). Каркасы
 * Studio и Референс появятся в фазе 1; пока любой вариант без своего каркаса
 * получает старый.
 */
const CHROME: Partial<Record<SiteVersion, React.ComponentType<{ children: React.ReactNode }>>> = {
  old: OldChrome,
};

export function SiteShell({ variant, children }: { variant: SiteVersion; children: React.ReactNode }) {
  const Chrome = CHROME[variant] ?? OldChrome;
  return <Chrome>{children}</Chrome>;
}

/**
 * Страница, у которой пока есть только старый вариант: оборачивает её в
 * старый каркас, не трогая тело страницы. Свойства (params/searchParams)
 * передаются как есть.
 */
export function withOldShell<P extends object>(Page: React.ComponentType<P>) {
  async function OldShellPage(props: P) {
    // Каркас рендерится раньше тела страницы, поэтому локаль для статической
    // генерации надо выставить здесь — иначе Header/Footer читают её
    // динамически и страница теряет SSG.
    const params = (props as { params?: Promise<{ locale?: string }> }).params;
    if (params) {
      const { locale } = await params;
      if (locale) setRequestLocale(locale);
    }
    return (
      <SiteShell variant="old">
        <Page {...props} />
      </SiteShell>
    );
  }
  OldShellPage.displayName = `withOldShell(${Page.displayName ?? Page.name ?? "Page"})`;
  return OldShellPage;
}
