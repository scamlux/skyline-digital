import { setRequestLocale } from "next-intl/server";
import { SiteShell } from "@/components/site/SiteShell";
import { HOME_VARIANTS } from "@/components/home/variants";
import { OldHome } from "@/components/home/variants/OldHome";
import { getActiveVersion } from "@/lib/site/active";
import { resolveVariant } from "@/lib/site/version";

/**
 * Диспетчер главной: читает `site_version` и рендерит вариант. Нет варианта
 * у страницы → вся страница (каркас + тело) в `old`.
 */
export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const variant = resolveVariant(await getActiveVersion(), HOME_VARIANTS);
  const Variant = HOME_VARIANTS[variant] ?? OldHome;
  return (
    <SiteShell variant={variant}>
      <Variant params={params} />
    </SiteShell>
  );
}
