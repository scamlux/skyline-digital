# Приложение C · Международные биржи, сети, каталоги, партнёрки, платежи

_Исследование 08.10.2026. Сводка — [`LEAD-CHANNELS-2026-10.md`](LEAD-CHANNELS-2026-10.md)._

**Как проверялось.** Только WebSearch: WebFetch на прокси блокируется, официальные страницы целиком не читались. ✅ подтверждено · ⚠️ частично · ❓ не проверено. Не дошли: Sanity/Contentful/Strapi/Stripe partners, TechBehemoths, The Manifest, Agency Vista, правила WWR/RemoteOK.

---

## 0. Главное
1. **Деньги — через Payoneer.** Wise не открывает баланс резидентам Узбекистана ([Wise help](https://www.wise.com/help/articles/2813542/where-can-i-open-a-wise-balance)), карта Wise не выдаётся. PayPal не работает: запуска в 2025–2026 нет ([Times of Central Asia](https://timesca.com/paypal-set-for-integration-in-uzbekistan-pending-central-bank-talks/)). Площадки, которые платят только через Wise/PayPal/Stripe Connect, — проблемные.
2. **Upwork — канал №1 по объёму.** Узбекские профили с проверкой ID активны в 2025–2026 ([каталог Ташкента](https://www.upwork.com/hire/uzbek-freelancers/uz/tashkent/)), вывод через Payoneer штатный.
3. **Contra — 0% для фрилансера**, вывод на Payoneer за $3.
4. **Clutch/GoodFirms** — медленно, но копят доверие. Платное спонсорство Clutch — годовой контракт, по сторонним оценкам $1,5–4 тыс./мес. Для одного человека нецелесообразно.
5. **Отобранные сети** — высокая ставка, низкий шанс. A.Team, Andela, вероятно Lemon.io Узбекистан не берут.
6. **Партнёрки вендоров** — почти все для крупных агентств. Исключения: Framer Experts, Claude Partner Network, ранняя партнёрская программа Supabase для агентств.

---

## 1. Открытые биржи

| Площадка | Узбекистан | Комиссия | Вывод | Пригодность | Первый шаг |
|---|---|---|---|---|---|
| **Upwork** | ✅ Работает. Закрыт для РФ/РБ с 01.05.2022 ([help](https://support.upwork.com/hc/en-us/articles/211067778)), Узбекистана в списках ограничений нет | ⚠️ С 05.2025 переменная 0–15%, обычно ~10%. Connects $0,15, отклик 2–16+ Connects. Freelancer Plus ~$19,99/мес | ✅ Payoneer: активация 3 дня, деньги ~24 ч ([help](https://support.upwork.com/hc/en-us/articles/211063988)). ❓ Direct to Local Bank для UZ | **Высокая** | Профиль под нишу, 3–5 позиций Project Catalog, $30–50/мес на Connects |
| **Fiverr / Pro** | ⚠️ Запрета нет; Payoneer работает | ⚠️ 20% со всего | ✅ Payoneer: USD wire $1, 5–7 дней, минимум $20 ([help](https://help.fiverr.com/hc/en-us/articles/14257019400465-Setting-up-Payoneer-as-a-payout-method)) | Средняя; продукт-гиги «Next.js + Supabase MVP за 2 недели» | Сразу заявка на Pro с 3–4 кейсами ([как](https://help.fiverr.com/hc/en-us/articles/29453001296913-How-to-become-a-Fiverr-Pro-freelancer)) |
| **Contra** | ⚠️ Выплаты в 180+ стран ([payout options](https://companies.contra.com/payout-options-for-contractors)), UZ не прочитан | ✅ 0% ([commission-free](https://contra.com/commission-free)); клиент платит $29 за контракт; Pro $29/мес | Payoneer $3, USDC 2% ([help](https://help.contra.com/en/articles/9322938-payout-methods-for-freelancers-on-contra)) | **Высокая** (стартапы, no-code/AI) | Профиль с 3–5 проектами, Payoneer |
| Freelancer.com | ❓ | ⚠️ 10% / минимум $5 | ❓ | Низкая (демпинг) | Не приоритет |
| PeoplePerHour | ❓ | ⚠️ 20% с первых £500, затем 7,5% и 3,5% | ❓ | Низкая-средняя | — |
| Guru | ❓ | ⚠️ 9% бесплатно | ❓ | Низкая | — |
| Malt | ⚠️ Вне FR/ES/DE/IT/BE/UK/CH/AT/NL/PT нужна зарегистрированная компания ([help](https://help.malt.com/kb/guide/en/can-the-freelancer-invoice-me-from-abroad-jPWGhMi1MK/Steps/)) | — | — | Низкая | Проверить таблицу стран |
| Workana | Латинская Америка, с 2026 — Юго-Восточная Азия | — | — | Низкая | Пропустить |
| Twine | ⚠️ Есть категория разработчиков из UZ | Pro $13,99/мес, 0% | ❓ | Низкая-средняя | Бесплатный профиль |
| freelancermap (DACH) | ⚠️ | 0%; Premium от €13,99 | Напрямую | Низкая-средняя | Бесплатный профиль |
| Truelancer | ❓ | 8–10%, потолок $75 на бесплатном | — | Низкая | Пропустить |

**Тактика Upwork:**
- Узкое позиционирование («Next.js + Supabase MVP», «AI-чатбот на Claude + RAG», «миграция WordPress → Next.js»).
- Отклик в первые 30–60 минут; только вакансии с верифицированной оплатой и историей найма.
- Первые 3–5 контрактов — фиксированные задачи на $100–500 ради JSS.
- Project Catalog с пакетами, чтобы не зависеть от Connects.
- Upwork Uma (с 07.2025) составляет больше половины вакансий и проводит «instant interviews» ([пресс-релиз](https://investors.upwork.com/news-releases/news-release-details/upwork-evolves-uma-ai-ai-work-agent-advances-human-ai)). Профиль должен быть структурированным и с ключевыми словами стека.

---

## 2. Отобранные сети

| Сеть | Узбекистан | Отбор / ставки | Пригодность |
|---|---|---|---|
| **Toptal** | ⚠️ Глобально | <3% заявок, 3–8 недель (английский → тесты → live-coding → проект), $60–150+/ч. В 01.2025 купил YouTeam (сеть агентств) | Средняя: шанс низкий, отдача высокая |
| **Arc.dev** (+ Codementor) | ⚠️ «Весь мир» | ~1,1% проходят, $60–80/ч | Средняя |
| Lemon.io | ⚠️ UZ нет в списках стран вакансий | — | Низкая |
| Turing | ⚠️ «150+ стран», много задач по обучению ИИ | — | Низкая-средняя |
| Braintrust | ⚠️ Специалист платит 0%, клиент 15% | — | Низкая-средняя |
| Proxify | ❓ | — | Низкая-средняя (заявка бесплатна) |
| Mercor | ⚠️ Платит через Stripe/Wise — проблема | $35–140/ч, нестабильно | Низкая |
| A.Team, Andela, Gun.io, Gigster | Регион не подходит / непонятный статус | — | Низкая |

---

## 3. Каталоги агентств

| Каталог | Стоимость | Пригодность | Шаг |
|---|---|---|---|
| **Clutch** | ✅ Профиль бесплатный, ~20 минут ([help](https://help.clutch.co/knowledge/free-features-clutch-offers)). Спонсорство — годовой контракт без досрочного расторжения ([help](https://help.clutch.co/knowledge/how-much-sponsorship-cost)). «Verified» — только платным | Средняя (долгая игра). Отзывы проверяет сам Clutch звонком клиенту; узбекские клиенты подходят | Профиль → 3–5 отзывов прошлых клиентов |
| The Manifest | ❓ Сестринский Clutch | — | Автоматически после Clutch (❓) |
| GoodFirms | ⚠️ Бесплатный план, платные от ~$300/мес | Средняя-низкая | Бесплатный профиль |
| DesignRush | ⚠️ Бесплатно; премиум от $200/мес | Низкая (но база для поиска агентств — см. E) | Бесплатный профиль |
| Sortlist, UpCity, TopDevelopers | Платно / США / непрозрачно | Низкая | Не платить |

**Отзывы:** пройти по прошлым клиентам с персональной ссылкой Clutch; каждый проект закрывать просьбой об отзыве (пункт «case study consent» в договоре); спонсорство — не раньше 5+ проверенных отзывов.

---

## 4. Партнёрки вендоров

| Программа | Реальность | Пригодность | Шаг |
|---|---|---|---|
| Vercel Solution Partners | ✅ Для агентств и интеграторов, входа через форму нет; первая сертифицированная когорта — AKQA, Grid Dynamics, Blazity | Низкая сейчас | Запрос с 3 кейсами на Next.js, без ожиданий |
| **Supabase Partners** | ⚠️ В 06.2026 искали руководителя программы для агентств — **уровни формируются** ([вакансия](https://jobs.accel.com/companies/supabase-2/jobs/81415426-gsi-partnership-lead)) | **Средняя** (ранний вход проще) | Заявка как эксперт/агентство + кейс для их блога |
| Framer Experts | ✅ 3 клиентских проекта на Framer, 7 дней ([help](https://framer.com/help/articles/how-to-become-a-framer-expert)) | Средняя, если делать лендинги на Framer | — |
| **Claude Partner Network** (Anthropic) | ⚠️ Запущена 03.2026, вход бесплатный по сторонним источникам; 40 тыс.+ заявок | Средняя (статус и доверие) | Заявка как Services Partner после 1–2 кейсов на Claude |
| Webflow, Shopify, HubSpot, Codeable (приём закрыт), OpenAI | Не тот стек / высокие пороги | Низкая | Пропустить |

---

## 5. Доски вакансий
- **HN «Who wants to be hired»** — жив; «Freelancer? Seeking freelancer?» закрыт в конце 2025 (см. приложение E).
- **LinkedIn ProFinder закрыт в 05.2024** → бесплатная Service Page; отвечать на запросы предложений могут только подписчики Premium Business ([help](https://www.linkedin.com/help/linkedin/answer/a564588)). Service Page включить.
- Working Nomads, Remotive, Himalayas, WWR, RemoteOK, Wellfound — в основном штатные позиции, есть страновые исключения. Низкая.
- Contra Jobs — высокая.

---

## 6. Платежи и юридическая инфраструктура

| Инструмент | Статус | Вывод |
|---|---|---|
| **Payoneer** | ✅ Работает в Узбекистане ([sayt.uz 02.2026](https://sayt.uz/en/blog/payoneer-wise-uzbekistan)); вывод в той же валюте $1,50, с конвертацией 1,2–4% ([pricing](https://www.payoneer.com/pricing/)) | **Основной.** USD → USD-счёт в узбекском банке. Сначала пробный вывод $50–100 |
| Wise | ⚠️ Узбекистана нет в странах баланса | Не рассчитывать |
| PayPal | ✅ Не работает ([kun.uz](https://kun.uz/news/2021/05/28/manba-paypal-ozbekistonga-kirish-niyatida-emas)) | Исключить; регистрация «через Казахстан» — риск блокировки |
| SWIFT USD | ⚠️ Возможен, но зарубежным компаниям бывает сложно; в 04.2026 ЦБ смягчил валютные правила ([Kursiv](https://uz.kursiv.media/en/2026-04-28/uzbekistan-eases-foreign-currency-regulations-for-expats-and-businesses/)); корреспонденты $20–35 | Крупные прямые клиенты: договор + инвойс от ИП/ООО |
| Paysend | ✅ Выплаты на Humo/Uzcard ([paysend](https://paysend.com/ru-co/news/paysend-launches-payouts-humo-uzcard-cards)) | Запасной |
| Deel | ⚠️ По Узбекистану не подтверждено | Выбирать SWIFT USD или Payoneer |
| Stripe / Atlas | ❓ Для резидента Узбекистана не подтверждён | Отложить: LLC в Делавэре — налоговые и банковские обязательства |
| USDT | ⚠️ Только через лицензированные биржи; с 01.01.2026 стейблкоины в песочнице NAPP/ЦБ; в 05.2026 NAPP отозвал лицензию UzNEX | Только как исключение, после консультации |

---

## 7. Топ-10
1. Upwork. 2. Contra. 3. HN «Who wants to be hired». 4. Fiverr (сразу заявка на Pro). 5. Clutch + GoodFirms бесплатно. 6. LinkedIn Service Page. 7. Arc.dev. 8. Supabase Partners / Claude Partner Network. 9. Toptal. 10. Framer Experts.

---

## 8. 30 дней для Upwork + Contra + Clutch

**Позиционирование:** *«Next.js + Supabase MVPs with AI built in — from idea to production in 2–6 weeks»*. Пакеты: AI-ready Landing / Marketing site (от $1 000), MVP Sprint (Next.js + Supabase Auth/DB/Storage + деплой на Vercel, от $2 500, 3–4 недели), AI Feature Add-on (чат-бот или RAG, от $800). Плюсы: UTC+5 (полный день с Европой, утро с США), английский, сроки в договоре.

> Поправка к разбору: агент записал в кейсы «3D» на сайте Skyline. 3D на сайте нет — анимации на CSS (`docs/adr/0002-3d-vs-css.md`). В профилях писать только то, что есть: ИИ-калькулятор смет, КП в PDF, трёхъязычность, движок аудита.

- **Неделя 1:**
  - Payoneer + USD-счёт, пробный вывод.
  - 3–4 кейса «задача → решение → цифры» (только реальные цифры), 2-минутное Loom-демо калькулятора.
  - Upwork: заголовок «Next.js + Supabase Developer | AI Chatbots & MVPs», проверка ID и видео, 3 позиции Project Catalog ($300 «Fix/upgrade your Next.js app», $1 000 «Landing», $2 500 «MVP Sprint»).
  - Contra: профиль. Clutch и GoodFirms: профили, список 5–8 клиентов для отзывов.
- **Неделя 2:**
  - Upwork: 200–300 Connects ($30–45); 4–6 откликов в день, только верифицированная оплата, траты клиента больше $1k, вакансии не старше 2 часов.
  - Отклик: 2 строки про задачу клиента → похожий кейс → план из 3 шагов → вопрос.
  - Ставка на первые отзывы — **решение владельца** (см. сводку §7): агент предлагает $25–30/ч, после 5 отзывов $35–45, после 10 — $50+.
  - Clutch: ссылки на отзывы прошлым клиентам лично в Telegram.
- **Неделя 3:**
  - Доля ответов меньше 10% → переписать первые 2 строки откликов, сузить выбор вакансий.
  - Первому клиенту сдать раньше срока и попросить отзыв.
  - LinkedIn Service Page.
- **Неделя 4:**
  - Цель: 2–3 контракта, 1 повторный клиент, 2–3 отзыва на Clutch.
  - Метрики: отклики → просмотры → ответы → интервью → контракты, расход Connects, средний чек.
  - Решение на день 30: 2+ отзыва → заявки на Fiverr Pro и Arc.dev; 0 контрактов → сменить нишу откликов.
