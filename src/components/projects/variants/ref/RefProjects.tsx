import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { projectCategories } from "@/data/projects";
import { getProjects } from "@/lib/portfolio";
import { FilterBar } from "@/components/site/chrome/shared/FilterBar";
import { RefCaseModal, type RefCase } from "@/components/home/variants/ref/RefCaseModal";

const pad = (n: number) => String(n).padStart(2, "0");

/** Каталог проектов в варианте «Референс»: фильтр, сетка карточек, кейс с depth-открытием. */
export async function RefProjects({ params }: { params: Promise<{ locale: string }> }) {
  await params;
  const [t, th, tr, projects] = await Promise.all([
    getTranslations("projects"),
    getTranslations("home"),
    getTranslations("home.ref"),
    getProjects(),
  ]);
  const cases: RefCase[] = projects.map((p) => ({
    slug: p.slug,
    title: p.title,
    cat: `${t(`categories.${p.category}`)} · ${p.year}`,
    desc: p.description,
    tags: p.technologies,
    image: p.image,
    url: p.url,
  }));

  return (
    <>
      <section className="r-sec r-phead">
        <p className="r-label">
          {th("eyebrows.projects")} — {pad(projects.length)}
        </p>
        <h1 className="r-ptitle">{t("title")}</h1>
        <p className="r-pintro">{t("intro")}</p>
        <FilterBar
          className="r-filter"
          targetId="r-pgrid"
          label={t("title")}
          options={projectCategories.map((c) => ({ value: c.value, label: t(`categories.${c.value}`) }))}
        />
      </section>

      <section className="r-sec r-psec" aria-label={t("title")}>
        {projects.length === 0 ? (
          <p className="r-pintro">{t("empty")}</p>
        ) : (
          <div className="r-pgrid" id="r-pgrid">
            {projects.map((p, i) => (
              <Link
                key={p.slug}
                href={`/projects/${p.slug}`}
                className="r-pcard"
                data-case={p.slug}
                data-cat={p.category}
              >
                <div className="r-pcimg">
                  <Image
                    src={p.image}
                    alt={p.title}
                    fill
                    sizes="(max-width: 760px) 92vw, 46vw"
                    loading={i < 2 ? "eager" : "lazy"}
                    priority={i < 2}
                  />
                  <span className="r-pcopen" aria-hidden="true">
                    ↗
                  </span>
                </div>
                <div className="r-pcbd">
                  <span className="r-pcn">{p.title}</span>
                  <span className="r-pcc">
                    {t(`categories.${p.category}`)} · {p.year}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="r-final">
        <p className="r-label">{th("eyebrows.contact")}</p>
        <h2>
          {tr("finalA")}
          <br />
          <em>{tr("finalB")}</em>
        </h2>
        <div className="r-hcta">
          <Link href="/calculator" className="r-cta">
            {th("hero.ctaPrimary")} <span aria-hidden="true">→</span>
          </Link>
          <Link href="/contact" className="r-cta ghost">
            {th("finalCta")}
          </Link>
        </div>
      </section>

      <RefCaseModal
        cases={cases}
        labels={{ close: tr("close"), openSite: tr("openSite"), caseMore: tr("caseMore") }}
      />
    </>
  );
}
