import type { SiteVersion } from "@/lib/site/version";
import { OldHome } from "./OldHome";
import { RefHome } from "./ref/RefHome";
import { StudioHome } from "./studio/StudioHome";

export type HomeVariantProps = { params: Promise<{ locale: string }> };

/** Реестр вариантов главной. Отсутствующий вариант `resolveVariant` отдаёт как `old`. */
export const HOME_VARIANTS: Partial<
  Record<SiteVersion, (props: HomeVariantProps) => Promise<React.ReactElement>>
> = {
  old: OldHome,
  studio: StudioHome,
  ref: RefHome,
};
