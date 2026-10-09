# Конвейер заказов — как работает и как включить

Решение и причины — [`docs/adr/0004-opportunity-pipeline.md`](../adr/0004-opportunity-pipeline.md). Каналы, из которых он кормится, — [`LEAD-CHANNELS-2026-10.md`](LEAD-CHANNELS-2026-10.md).

## Что ты видишь каждый день

1. В чат лидов приходит **карточка**:
   - что за проект;
   - оценка 0–100 и вердикт;
   - бюджет заказчика и **наша цена по движку**;
   - дедлайн, риски, как подаваться.

   Кнопки: **✅ Подаюсь · ❌ Мимо · 📝 Текст отклика · 🔗 Открыть**.
2. «Подаюсь» → бот присылает **готовый текст отклика** на языке заказчика. Он копируется одним тапом, рядом список того, что приложить. Отправляешь по ссылке «Открыть».
3. Потом кнопки **📤 Отправлено · 🏆 Выиграли · 💤 Не взяли**. «Выиграли» сразу заводит заявку в `/admin/leads` с ценой и составом работ: дальше КП и договор, как обычно.
4. Заказ из закрытого чата **пересылаешь боту** — через минуту по нему придёт карточка.
5. По расписанию бот присылает **рутины профилей** с готовым текстом:
   - пост в HN раз в месяц;
   - r/forhire раз в неделю;
   - обновление Upwork/Contra;
   - просьба об отзывах;
   - квартальная проверка тендерных документов.

   По пятницам — **сводка недели**.
6. Всё то же в админке: `/admin/pipeline`. Вкладки «На решении / В работе / Выиграли / Отсеяно», редактирование текста, кнопка «Запустить сейчас», состояние источников.

Команды боту: `/run` — внеочередной прогон, `/pipeline` — сколько карточек в работе.

**Чего система не делает:** не откликается и не постит сама. Upwork, LinkedIn и Reddit банят за автоматизацию, тендеры требуют подписи. Отправка — одна копипаста от тебя.

## Подключение (один раз, ~30 минут)

### 1. База
SQL Editor в Supabase → вставить и выполнить `supabase/migrations/0013_pipeline.sql`.

### 2. Переменные в Vercel
| Переменная | Обязательна | Что это |
|---|---|---|
| `TELEGRAM_WEBHOOK_SECRET` | да | Любая длинная случайная строка — защита вебхука бота |
| `PIPELINE_INGEST_SECRET` | да, для писем | Любая длинная случайная строка — защита приёма писем |
| `PIPELINE_TG_CHANNELS` | нет | Публичные каналы с заказами через запятую, напр. `UstozShogird,freelance_uzb,FreelancehuntProjects` (список — приложения A и B исследования) |
| `PIPELINE_RSS_FEEDS` | нет | RSS-ленты через запятую (биржи, закупки, Google Alerts в RSS) |
| `FREELANCEHUNT_TOKEN` | нет | Токен API из профиля Freelancehunt |
| `TELEGRAM_OWNER_ID` | нет | Твой числовой id в Telegram — чтобы пересылать заказы боту в личку |
| `PIPELINE_SOURCES` | нет | Какие источники включены; по умолчанию `worldbank,reddit,telegram,rss,freelancehunt` |
| `PIPELINE_WB_COUNTRIES` | нет | Страны для Всемирного банка; по умолчанию `Uzbekistan` |
| `PIPELINE_MIN_SCORE` | нет | Порог оценки для карточки; по умолчанию 60 |
| `PIPELINE_MAX_AI_PER_RUN` | нет | Лимит ИИ-оценок за прогон; по умолчанию 10 |
| `PIPELINE_MAX_NOTIFY_PER_RUN` | нет | Лимит карточек за прогон; по умолчанию 5 |
| `PIPELINE_INTERVAL_MIN` | нет | Не чаще, чем раз в N минут; по умолчанию 60 |
| `PIPELINE_ROUTINES` | нет | `off` — выключить напоминания о профилях и сводку |

Уже настроены и используются: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `OPENAI_API_KEY`, `CRON_SECRET`, Supabase.

### 3. Вебхук бота (кнопки и пересылка)
Один раз в терминале. Подставь токен бота чата лидов и секрет из п. 2:
```bash
curl "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook" \
  -d url=https://skyline-digital.uz/api/telegram/webhook \
  -d secret_token=<TELEGRAM_WEBHOOK_SECRET> \
  -d 'allowed_updates=["message","callback_query"]'
```
Кнопки в группе работают сразу. Чтобы бот видел пересланные **в группу** сообщения, отключи privacy mode в @BotFather (`/setprivacy` → Disable) или пересылай боту в личку (нужен `TELEGRAM_OWNER_ID`).

### 4. Крон
Ничего делать не нужно: конвейер едет на 15-минутном тикере контента (cron-job.org → `/api/cron/content`) и сам ограничивает частоту.

### 5. Письма-оповещения → конвейер (Gmail)
Так подключаются площадки без API: Upwork job alerts, UNGM Tender Alert, рассылки Всемирного банка, Workspace, Freelancehunt.
1. Подпишись на оповещения на каждой площадке: сохранённые поиски «Next.js», «website», «chatbot», страна Uzbekistan и т.п.
2. В Gmail заведи фильтр: `from:(upwork.com OR ungm.org OR worldbank.org OR workspace.ru OR freelancehunt.com)` → ярлык `pipeline`.
3. На [script.google.com](https://script.google.com) создай проект. В «Свойствах скрипта» добавь `PIPELINE_INGEST_SECRET`, вставь код ниже. В «Триггерах» поставь `forwardAlerts` каждые 15 минут.
```js
const URL = "https://skyline-digital.uz/api/pipeline/ingest";

function forwardAlerts() {
  const secret = PropertiesService.getScriptProperties().getProperty("PIPELINE_INGEST_SECRET");
  const label = GmailApp.getUserLabelByName("pipeline");
  const done = GmailApp.getUserLabelByName("pipeline-done") || GmailApp.createLabel("pipeline-done");
  if (!label) return;
  for (const thread of label.getThreads(0, 20)) {
    for (const m of thread.getMessages()) {
      UrlFetchApp.fetch(URL, {
        method: "post",
        contentType: "application/json",
        headers: { Authorization: "Bearer " + secret },
        payload: JSON.stringify({
          subject: m.getSubject(),
          text: m.getPlainBody().slice(0, 90000),
          from: m.getFrom(),
          id: m.getId(),
        }),
        muteHttpExceptions: true,
      });
    }
    thread.removeLabel(label);
    thread.addLabel(done);
  }
}
```

### 6. Проверка
`/admin/pipeline` → «Запустить сейчас». Источники с ошибкой подсвечены красным, текст ошибки — в блоке «Последний прогон».

## Ограничения, о которых нужно знать
- Форматы источников проверены на образцах, но не вживую: из среды разработки сеть закрыта. Если источник сломался, это видно в админке и в сводке, остальные работают.
- Reddit часто блокирует запросы с серверов Vercel. Это бонусный источник.
- Без `OPENAI_API_KEY` оценка идёт по ключевым словам, а отклик — по шаблону; в карточке это помечено.
- Карточек не больше 5 за прогон (настраивается). Остальное лежит в админке по убыванию оценки.
