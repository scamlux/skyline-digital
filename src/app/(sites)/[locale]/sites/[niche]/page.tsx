import { redirect } from "@/i18n/navigation";
import { notFound } from "next/navigation";
import { TEMPLATES, getTemplate } from "@/site-templates/registry";

export function generateStaticParams() {
  return TEMPLATES.map((t) => ({ niche: t.id }));
}

/** /sites/<ниша> → первый стиль шаблона. */
export default async function NichePage({ params }: { params: Promise<{ locale: string; niche: string }> }) {
  const { locale, niche } = await params;
  const tpl = getTemplate(niche);
  if (!tpl) notFound();
  redirect({ href: `/sites/${tpl.id}/${tpl.styles[0].id}`, locale });
}
