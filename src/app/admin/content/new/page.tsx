import { Editor } from "../Editor";

export const dynamic = "force-dynamic";

const TEMPLATE = {
  slug: "novyj-post",
  title: "Рабочее название",
  style: "studio",
  format: "post",
  platforms: ["telegram"],
  slides: [
    { type: "cover", tone: "dark", eyebrow: "РУБРИКА", title: "Заголовок", subtitle: "Подзаголовок.", swipe: "ЛИСТАЙ →" },
    { type: "cta", tone: "dark", title: "Призыв", text: "Текст.", action: "калькулятор на сайте" },
  ],
  caption: { default: "Подпись.", threads: "Коротко #skyline" },
  hashtags: ["#вебстудия", "#ташкент"],
};

export default function NewContentPage() {
  return (
    <div className="p-8">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Новый пост</h1>
      <Editor
        id={null}
        initialJson={JSON.stringify(TEMPLATE, null, 2)}
        status="draft"
        scheduledAt={null}
        guard={[]}
        aspect={1350 / 1080}
      />
    </div>
  );
}
