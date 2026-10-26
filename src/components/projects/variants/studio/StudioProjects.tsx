import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { projectCategories } from "@/data/projects";
import { getProjects } from "@/lib/portfolio";
import { FilterBar } from "@/components/site/chrome/shared/FilterBar";
import { StudioFinal } from "@/components/site/chrome/studio/StudioFinal";
import { SideReveal } from "@/components/site/chrome/shared/SideReveal";

/** Каталог проектов в варианте Studio: тёмная шапка-панель, фильтр, сетка карточек как на главной. */
export async function StudioProjects({ params }: { params: Promise<{ locale: string }> }) {
  await params;
  const [t, tpr, th, tst, projects] = await Promise.all([
    getTranslations("projects"),
    getTranslations("project"),
    getTranslations("home"),
    getTranslations("home.studio"),
    getProjects(),
  ]);

  return (
    <>
      <section className="s-phead">
        <div className="wrap">
          <span className="kick">{th("eyebrows.projects")}</span>
          <h1>{t("title")}</h1>
          <p>{t("intro")}</p>
        </div>
      </section>

      <section className="panel">
        <div className="wrap inr">
          <FilterBar
            className="s-filter"
            targetId="s-pgrid"
            label={tpr("category")}
            emptyText={t("empty")}
            options={projectCategories.map((c) => ({ value: c.value, label: t(`categories.${c.value}`) }))}
          />
          {projects.length === 0 ? (
            <p className="s-empty">{t("empty")}</p>
          ) : (
            <div className="s-pgrid" id="s-pgrid">
              {projects.map((p, i) => (
                <Link key={p.slug} className="pcard" href={`/projects/${p.slug}`} data-cat={p.category}>
                  <div className="pcimg">
                    <span className="pctag">
                      {t(`categories.${p.category}`)} · {p.year}
                    </span>
                    <Image
                      src={p.image}
                      alt={p.title}
                      fill
                      sizes="(max-width: 700px) 92vw, (max-width: 1100px) 46vw, 380px"
                      priority={i < 3}
                    />
                  </div>
                  <div className="pcbody">
                    <h3>{p.title}</h3>
                    <p>{p.description}</p>
                    <div className="pcfoot">
                      <span className="popen">
                        {tst("more")} <span className="ar" aria-hidden="true">→</span>
                      </span>
                      <span className="pcyr">{p.technologies.slice(0, 2).join(" · ")}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      <SideReveal targetId="s-pgrid" />
      <StudioFinal />
    </>
  );
}
