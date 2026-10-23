import type { SiteVersion } from "@/lib/site/version";
import { OldHome } from "./OldHome";

export type HomeVariantProps = { params: Promise<{ locale: string }> };

/**
 * Реестр вариантов главной. Studio и Референс добавятся в фазе 1 — пока их
 * нет, `resolveVariant` отдаёт главную целиком в `old`.
 */
export const HOME_VARIANTS: Partial<
  Record<SiteVersion, (props: HomeVariantProps) => Promise<React.ReactElement>>
> = {
  old: OldHome,
};
