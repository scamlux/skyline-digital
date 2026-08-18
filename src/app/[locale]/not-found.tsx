import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export default function NotFound() {
  const t = useTranslations("notFound");
  return (
    <main className="bg-night text-day">
      <div className="mx-auto flex max-w-6xl flex-col items-start gap-5 px-5 py-24 md:px-8 md:py-32">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-apricot">404</p>
        <h1 className="font-display text-3xl font-medium">{t("title")}</h1>
        <p className="text-mist">{t("text")}</p>
        <Link
          href="/"
          className="horizon-gradient rounded-full px-7 py-3.5 text-sm font-medium text-night"
        >
          {t("cta")}
        </Link>
      </div>
    </main>
  );
}
