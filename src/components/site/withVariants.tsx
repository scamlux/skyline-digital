import { setRequestLocale } from "next-intl/server";
import { getActiveVersion } from "@/lib/site/active";
import { resolveVariant, type SiteVersion } from "@/lib/site/version";
import { SiteShell } from "./SiteShell";

type VariantPage<P> = (props: P) => React.ReactNode | Promise<React.ReactNode>;

/**
 * Диспетчер страницы с вариантами (как у главной): читает `site_version` и
 * рендерит тело нужного варианта в его каркасе. Варианта у страницы нет →
 * вся страница (каркас + тело) в `old`. `old` обязателен — это боевой код 1:1.
 */
export function withVariants<P extends { params: Promise<{ locale: string }> }>(
  pages: { old: VariantPage<P> } & Partial<Record<SiteVersion, VariantPage<P>>>,
) {
  async function VariantDispatch(props: P) {
    const { locale } = await props.params;
    setRequestLocale(locale);
    const variant = resolveVariant(await getActiveVersion(), pages);
    const Page = pages[variant] ?? pages.old;
    return (
      <SiteShell variant={variant}>
        <Page {...props} />
      </SiteShell>
    );
  }
  return VariantDispatch;
}
