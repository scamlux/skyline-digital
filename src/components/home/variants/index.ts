import type { SiteVersion } from "@/lib/site/version";
import { OldHome } from "./OldHome";
import { RefHome } from "./ref/RefHome";

export type HomeVariantProps = { params: Promise<{ locale: string }> };

/**
 * Реестр вариантов главной. Studio появится позже — пока его нет,
 * `resolveVariant` отдаёт главную целиком в `old`.
 */
export const HOME_VARIANTS: Partial<
  Record<SiteVersion, (props: HomeVariantProps) => Promise<React.ReactElement>>
> = {
  old: OldHome,
  ref: RefHome,
};
