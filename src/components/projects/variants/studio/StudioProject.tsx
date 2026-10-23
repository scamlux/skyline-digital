import Image from "next/image";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ProjectGallery } from "@/components/projects/ProjectGallery";
import { getProjectPage } from "@/lib/site/project-page";
import { StudioFinal } from "@/components/site/chrome/studio/StudioFinal";

/**
 * Деталка проекта в варианте Studio: тёмная шапка с мета-данными, обложка,
 * цифры, «Задача → Решение → Результат», галерея, соседи, CTA.
 * Блоки без данных не показываются — как у старой деталки.
 */
export async function StudioProject({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  const data = await getProjectPage(locale, slug);
  if (!data) notFound();
  const { project, prev, next, story, metrics, gallery, jsonLd } = data;
  const [t, tp] = await Promise.all([getTranslations("project"), getTranslations("projects")]);
  const category = tp(`categories.${project.category}`);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <section className="s-phead">
        <div className="wrap">
          <Link href="/projects" className="s-back">
            ← {t("back")}
          </Link>
          <span className="kick">
            {category} · {project.year}
          </span>
          <h1>{project.title}</h1>
          <p>{project.description}</p>
          <dl className="s-meta">
            {project.client && (
              <div>
                <dt>{t("client")}</dt>
                <dd>{project.client}</dd>
              </div>
            )}
            {project.role && (
              <div>
                <dt>{t("role")}</dt>
                <dd>{project.role}</dd>
              </div>
            )}
            <div>
              <dt>{t("technologies")}</dt>
              <dd>{project.technologies.join(" · ")}</dd>
            </div>
          </dl>
          {project.url && (
            <a className="btn-fill" href={project.url} target="_blank" rel="noopener noreferrer">
              {t("visit")} <span className="ar" aria-hidden="true">↗</span>
            </a>
          )}
        </div>
      </section>

      <section className="panel">
        <div className="wrap inr">
          <div className="s-cover">
            <Image src={project.image} alt={project.title} fill sizes="(max-width: 1180px) 92vw, 1132px" priority />
          </div>

          {metrics.length > 0 && (
            <div className="statline" style={{ marginTop: 40 }}>
              {metrics.map((m) => (
                <div key={m.label} className="stat rv">
                  <div className="n">{m.value}</div>
                  <div className="l">{m.label}</div>
                </div>
              ))}
            </div>
          )}

          {story.length > 0 && (
            <div className="s-story">
              {story.map((s, i) => (
                <article key={s.key} className="rv">
                  <span className="num">{String(i + 1).padStart(2, "0")}</span>
                  <h2>{t(s.key)}</h2>
                  <p>{s.text}</p>
                </article>
              ))}
            </div>
          )}

          {gallery.length > 0 && (
            <div className="s-gal">
              <h2>{t("gallery")}</h2>
              <ProjectGallery images={gallery} title={project.title} />
            </div>
          )}

          {(prev || next) && (
            <nav className="s-pnav" aria-label={tp("title")}>
              {prev ? (
                <Link href={`/projects/${prev.slug}`}>
                  <span>← {t("prev")}</span>
                  <b>{prev.title}</b>
                </Link>
              ) : (
                <span />
              )}
              {next && (
                <Link href={`/projects/${next.slug}`} className="nx">
                  <span>{t("next")} →</span>
                  <b>{next.title}</b>
                </Link>
              )}
            </nav>
          )}
        </div>
      </section>

      <StudioFinal title={t("ctaTitle")} />
    </>
  );
}
