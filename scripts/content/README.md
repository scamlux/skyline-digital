# scripts/content · фабрика постов

Спецификация поста (JSON) → HTML-слайды → PNG под площадки. Без видео, без внешних
сервисов, без кредитов. Всё, что нужно, — Chrome и node.

## Быстрый старт

```bash
node scripts/content/fonts/fetch.mjs   # разово: скачать шрифты из npm
node scripts/content/build.mjs         # спецификации → HTML + подписи
node scripts/content/render.mjs        # HTML → PNG
```

Результат — `scripts/content/out/<slug>/`: `01.png … NN.png` и `caption.md`
с подписями под Instagram, Telegram, Threads и LinkedIn.

## Почему две стадии

HTML собирается мгновенно и где угодно, браузер нужен только на втором шаге.
В GitHub Actions это две джобы; локально — две команды подряд.

## Где взять браузер

`render.mjs` ищет Chrome по списку путей. Если не нашёл:

```bash
CHROME_EXECUTABLE_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  node scripts/content/render.mjs
```

## Как добавить пост

Положи JSON в `posts/`. Минимальная спецификация:

```json
{
  "slug": "имя-папки",
  "title": "Название для себя",
  "format": "post",
  "platforms": ["Instagram", "Telegram"],
  "slides": [ { "type": "cover", "tone": "dark", "title": "Заголовок" } ],
  "caption": { "default": "текст подписи" },
  "hashtags": ["#ташкент"]
}
```

`format`: `post` 1080×1350 · `square` 1080×1080 · `story` 1080×1920
`tone`: `dark` (ночной фон) · `light` (светлый). Чередование даёт ритм в карусели.

## Типы слайдов

| Тип | Для чего | Поля |
| --- | --- | --- |
| `cover` | первый слайд карусели | `eyebrow`, `title`, `subtitle`, `swipe` |
| `stat` | одна крупная цифра | `eyebrow`, `value`, `unit`, `title`, `note` |
| `points` | 3–4 пункта с пояснением | `eyebrow`, `title`, `items[{n,title,text}]` |
| `prices` | строки «что — сколько» | `eyebrow`, `title`, `items[{what,val}]`, `note` |
| `compare` | два блока рядом, правый акцентный | `eyebrow`, `title`, `left`, `right` `{cap,big,sub}`, `note` |
| `case` | скриншот проекта + описание | `eyebrow`, `title`, `image`, `text`, `tags[]` |
| `cta` | последний слайд с призывом | `eyebrow`, `title`, `text`, `action` |

`image` — путь от корня репозитория, например `/public/projects/tgpg.jpg`.
Картинка и шрифты вшиваются в HTML как base64, поэтому рендер везде одинаковый.

## Правила, которые нельзя нарушать

Цифры берутся из `docs/smm/brain.md`, замера `src/lib/audit/` или калькулятора.
Наша цена в контенте — только «от $450» и «до $5000». Конкретный срок не обещаем.
Рыночные цифры можно, если из текста ясно, что это не наше предложение.
