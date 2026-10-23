import Image from "next/image";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ProjectGallery } from "@/components/projects/ProjectGallery";
import { getProjectPage } from "@/lib/site/project-page";

/**
 * Деталка проекта в варианте «Референс»: крупный заголовок, мета, обложка на
 * всю ширину, цифры, «Задача → Решение → Результат», галерея, соседи, CTA.
 * Блоки без данных не показываются — как у старой деталки.
 */
export async function RefProject({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  const data = await getProjectPage(locale, slug);
  if (!data) notFound();
  const { project, prev, next, story, metrics, gallery, jsonLd } = data;
  const [t, tp, th, tr] = await Promise.all([
    getTranslations("project"),
    getTranslations("projects"),
    getTranslations("home"),
    getTranslations("home.ref"),
  ]);
  const category = tp(`categories.${project.category}`);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <section className="r-sec r-phead">
        <Link href="/projects" className="r-back">
          ← {t("back")}
        </Link>
        <p className="r-label" style={{ marginTop: 28 }}>
          {category} · {project.year}
        </p>
        <h1 className="r-ptitle">{project.title}</h1>
        <p className="r-pintro">{project.description}</p>
        <dl className="r-meta">
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
            <dt>{t("category")}</dt>
            <dd>{category}</dd>
          </div>
          <div>
            <dt>{t("year")}</dt>
            <dd>{project.year}</dd>
          </div>
          <div>
            <dt>{t("technologies")}</dt>
            <dd className="rc-tags">
              {project.technologies.map((tech) => (
                <span key={tech}>{tech}</span>
              ))}
            </dd>
          </div>
        </dl>
        {project.url && (
          <div className="r-hcta" style={{ justifyContent: "flex-start" }}>
            <a href={project.url} target="_blank" rel="noopener noreferrer" className="r-cta">
              {t("visit")} <span aria-hidden="true">↗</span>
            </a>
          </div>
        )}
      </section>

      <div className="r-cover">
        <Image src={project.image} alt={project.title} fill sizes="100vw" priority />
      </div>

      {metrics.length > 0 && (
        <section className="r-sec" aria-label={t("result")}>
          <div className="r-stats">
            {metrics.map((m, i) => (
              <div key={m.label}>
                <div className="n">{i === 0 ? <b>{m.value}</b> : m.value}</div>
                <div className="l">{m.label}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {story.length > 0 && (
        <section className="r-sec r-story">
          {story.map((s, i) => (
            <article key={s.key}>
              <p className="r-label">
                {String(i + 1).padStart(2, "0")} · {t(s.key)}
              </p>
              <p className="r-storyt">{s.text}</p>
            </article>
          ))}
        </section>
      )}

      {gallery.length > 0 && (
        <section className="r-sec r-gal">
          <p className="r-label">{t("gallery")}</p>
          <ProjectGallery images={gallery} title={project.title} />
        </section>
      )}

      {(prev || next) && (
        <nav className="r-sec r-pnav" aria-label={tp("title")}>
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

      <section className="r-final">
        <p className="r-label">{th("eyebrows.contact")}</p>
        <h2>
          {t("ctaTitle")}
          <br />
          <em>{tr("finalB")}</em>
        </h2>
        <div className="r-hcta">
          <Link href="/calculator" className="r-cta">
            {t("cta")} <span aria-hidden="true">→</span>
          </Link>
          <Link href="/contact" className="r-cta ghost">
            {th("finalCta")}
          </Link>
        </div>
      </section>
    </>
  );
}
