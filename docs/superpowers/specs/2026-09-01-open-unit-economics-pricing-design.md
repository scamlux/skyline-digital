# Открытая юнит-экономика в движке цен, калькуляторе и КП

Дата: 2026-09-01 · Статус: утверждён владельцем, в реализации

## Цель

Перевести цены Skyline с плоской модели (`price` за позицию) на **открытую
юнит-экономику**: каждая позиция описывается часами по ролям, цена =
Σ(часы × почасовая ставка). Разбивка прозрачно складывается в итог и
показывается клиенту и в калькуляторе, и в PDF-КП. Плюс: поднять цены до
реальных, добавить новые опции и «Другое» (ручной ввод).

## Роли и ставки (биллинг, USD/час)

| Роль | key | $/ч |
|---|---|---|
| Проект-менеджер | pm | 20 |
| Разработчик | dev | 18 |
| Дизайнер | design | 15 |
| QA / тестировщик | qa | 12 |
| DevOps | devops | 22 |
| Контент-менеджер | content | 10 |

Ставки — то, что платит клиент (с маржой), не себестоимость. Единственный
источник — `src/lib/pricing/roles.ts`.

## Модель

- Позиция (база типа / фича / аддон) = `RoleHours = {pm?,dev?,design?,qa?,devops?,content?}`.
- Цена позиции = Σ(hours × rate). Плоских `price` в каталоге больше нет.
- Движок агрегирует все выбранные позиции в **разбивку по ролям**
  `roleBreakdown: {role, hours, rate, sum}[]`, затем:
  - `subtotal` = Σ sum
  - `urgency` = subtotal × 0.35 если срочно (отдельная строка), иначе 0
  - `total` = subtotal + urgency
  - вилка `[total×0.88, total×1.12]`, округление до $50
  - `weeks` = max(1, ceil((dev+design+qa часы) / 28)); срочно × 0.7
- Всё детерминированно; ИИ не меняет ни цифры (ТЗ §7).

## Матрица часов — БАЗА по типам (pm/dev/design/qa/devops/content)

| Тип | pm | dev | design | qa | devops | content | ≈ цена |
|---|---|---|---|---|---|---|---|
| website | 5 | 32 | 14 | 6 | 2 | 0 | $1002 |
| webApp | 10 | 70 | 20 | 16 | 6 | 0 | $2084 |
| mobileApp | 12 | 90 | 24 | 20 | 6 | 0 | $2592 |
| ai | 8 | 60 | 8 | 12 | 8 | 0 | $1680 |
| automation | 6 | 40 | 4 | 8 | 6 | 0 | $1128 |
| uiux | 4 | 6 | 40 | 4 | 0 | 0 | $836 |
| other | 2 | 8 | 2 | 2 | 0 | 0 | $238 |

## Матрица часов — ФИЧИ (только ненулевые роли)

website/общие: landing(dev14,design8,qa2); corporate(pm3,dev24,design12,qa4);
ecommerce(pm4,dev40,design14,qa8); personalAccount(pm2,dev24,design8,qa6);
adminPanel(dev20,design6,qa4); blog(dev12,design6,qa2); multilingual(dev8,design2,qa2);
payment(pm2,dev16,qa6); apiIntegration(pm2,dev16,qa4); animations(dev12,design6).

ai: aiChatbot(pm2,dev28,qa6); rag(pm3,dev40,qa8,devops4); knowledgeBase(dev22,qa4,devops2);
fileProcessing(dev20,qa6); voice(dev32,qa6,devops2); imageUnderstanding(dev30,qa6);
aiAutomation(dev24,qa6,devops2).

mobile: ios(dev40,design6,qa8); android(dev40,design6,qa8); authentication(dev14,qa4);
pushNotifications(dev12,qa4); payments(pm2,dev22,qa6).

automation: crmIntegration(pm2,dev22,qa6); telegram(dev10,qa2); whatsapp(dev12,qa2);
workflowAutomation(pm2,dev28,qa6); reporting(dev16,design2,qa4).

uiux: wireframes(pm2,design20); prototype(dev4,design24); designSystem(dev6,design40).

**Новые:** paymeClickUzum(pm2,dev20,qa6)=$472; integration1c(pm3,dev28,qa8)=$660;
webgl3d(dev20,design10)=$510; booking(dev22,design4,qa4)=$504.

## Аддоны (для всех типов)

design(pm2,design32); branding(design36,content8); seo(pm2,dev8,content12);
analytics(dev8,qa2); support(pm4,dev8) — ретейнер/мес.

## «Другое» (ручной ввод)

- Поле свободного текста в калькуляторе (шаг фич). Валидатор: `customNote` строка ≤500.
- Авто-цену НЕ считаем: в сумму идёт $0, помечается флагом. В результате и КП —
  отдельная строка «обсуждается индивидуально / по запросу».
- Не ломает детерминизм: движок игнорирует текст, только прокидывает флаг наличия.

## Где синхронизируем

1. `src/lib/pricing/roles.ts` — новый (роли+ставки).
2. `src/lib/pricing/rules.ts` — базы/фичи/аддоны в часах; +4 новые фичи; `custom` sentinel.
3. `src/lib/pricing/types.ts` — `PricingResult` c `roleBreakdown[]`, `subtotal`, `urgencyAmount`, `total`, `hasCustom`.
4. `src/lib/pricing/engine.ts` — агрегирует часы→разбивку→итог.
5. `src/lib/validation/estimate.ts` — новые фич-ключи в каталоге (через rules), `customNote`.
6. `src/components/calculator/Wizard.tsx` — новые опции, поле «Другое», таблица разбивки на шаге результата.
7. `src/templates/proposal/template.ts` — слайд 7: реальная разбивка роль·часы·ставка·сумма (USD + UZS по курсу), «Другое» строкой; рыночный якорь опционально.
8. Роут `/api/estimate` и страница `/estimate/[token]` — прокинуть новую структуру в снапшот и рендер.
9. i18n `messages/{ru,en,uz}.json` — лейблы новых опций.

Снапшот сметы (`price_snapshot`) хранит полную разбивку — старые сметы не меняются.

## Срочность / вилка

Без изменений: срочность +35% отдельной строкой, вилка ±12%, округление $50.

## Проверка

`tsc && lint && build` зелёные; ручной прогон калькулятора (пример конфигурации →
разбивка складывается в итог); визуальная сверка слайда 7 КП.
