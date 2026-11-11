import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { encodeDigest } from "@/site-templates/kit/digest-payload";
import { STUDIO_SITES_URL } from "@/lib/telegram-digest/format";
import { POST } from "./route";

// Тестовые значения не настоящие: токена и секрета в репозитории нет.
const TEST_TOKEN = "123456:TEST_TOKEN_NOT_REAL";
const TEST_SECRET = "test_secret_not_real";
const URL_ROUTE = "https://example.test/api/telegram/digest";

let nextChat = 7_000_000;
const freshChat = () => ++nextChat;

const startPayload = encodeDigest({ tpl: "cafe", locale: "ru", style: "a", period: "week", values: { orders: 58, revenue: 2_900_000, avg: 50_000, views: 640, drink: 1 } });

const update = (chatId: number, text: string | undefined, chatType = "private") => ({ update_id: 1, message: { message_id: 1, chat: { id: chatId, type: chatType }, ...(text === undefined ? {} : { text }) } });

const call = (body: unknown, secret: string | null = TEST_SECRET) =>
  POST(new Request(URL_ROUTE, { method: "POST", headers: { "content-type": "application/json", ...(secret === null ? {} : { "x-telegram-bot-api-secret-token": secret }) }, body: typeof body === "string" ? body : JSON.stringify(body) }));

const fetchMock = vi.fn();

/** Тело последнего запроса к Telegram. */
const sent = (i = 0) => {
  const [url, init] = fetchMock.mock.calls[i] as [string, RequestInit];
  return { url, body: JSON.parse(String(init.body)) as { chat_id: number; text: string; parse_mode: string } };
};

beforeEach(() => {
  vi.stubEnv("TELEGRAM_DIGEST_BOT_TOKEN", TEST_TOKEN);
  vi.stubEnv("TELEGRAM_DIGEST_WEBHOOK_SECRET", TEST_SECRET);
  fetchMock.mockReset();
  fetchMock.mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("POST /api/telegram/digest: доступ и настройка", () => {
  it("401 без заголовка секрета", async () => {
    const res = await call(update(freshChat(), "/start x"), null);
    expect(res.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("401 при неверном секрете (и при секрете другой длины)", async () => {
    expect((await call(update(freshChat(), "/start x"), "wrong")).status).toBe(401);
    expect((await call(update(freshChat(), "/start x"), `${TEST_SECRET}x`)).status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("503, если секрет вебхука не задан (даже с любым заголовком)", async () => {
    vi.stubEnv("TELEGRAM_DIGEST_WEBHOOK_SECRET", "");
    expect((await call(update(freshChat(), "/start x"), "anything")).status).toBe(503);
  });

  it("503 при верном секрете, но без токена бота; и без обращения к Telegram", async () => {
    vi.stubEnv("TELEGRAM_DIGEST_BOT_TOKEN", "");
    const res = await call(update(freshChat(), `/start ${startPayload}`));
    expect(res.status).toBe(503);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("400 на битый JSON, 413 на слишком большое тело", async () => {
    expect((await call("{not json")).status).toBe(400);
    expect((await call(`{"pad":"${"x".repeat(20_000)}"}`)).status).toBe(413);
  });
});

describe("POST /api/telegram/digest: /start", () => {
  it("валидная нагрузка: sendMessage в нужный чат с сводкой на языке нагрузки", async () => {
    const chat = freshChat();
    const res = await call(update(chat, `/start ${startPayload}`));
    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const { url, body } = sent();
    expect(url).toBe(`https://api.telegram.org/bot${TEST_TOKEN}/sendMessage`);
    expect(body.chat_id).toBe(chat);
    expect(body.parse_mode).toBe("HTML");
    expect(body.text).toContain("Заказы: <b>58</b>");
    expect(body.text).toContain("демо");
    expect(body.text).toContain(STUDIO_SITES_URL);
  });

  it("принимает /start@имя_бота с нагрузкой", async () => {
    await call(update(freshChat(), `/start@skyline_demo_bot ${startPayload}`));
    expect(sent().body.text).toContain("Заказы: <b>58</b>");
  });

  it("битая нагрузка (чужие числа, мусор, старая версия): справка, а не сводка", async () => {
    for (const bad of ["1fra-zzzzzzzz-1-2-3", "garbage", "2fraw-1-2-3-4-5", "1fraw-1-2-3-4"]) {
      fetchMock.mockClear();
      await call(update(freshChat(), `/start ${bad}`));
      expect(sent().body.text).toContain("Это демо-бот");
      expect(sent().body.text).toContain(STUDIO_SITES_URL);
    }
  });

  it("голый /start и произвольный текст: справка на трёх языках, чужой текст не повторяется", async () => {
    await call(update(freshChat(), "/start"));
    const help = sent().body.text;
    expect(help).toContain("Это демо-бот");
    expect(help).toContain("This is a Skyline Digital demo bot");
    expect(help).toContain("Bu Skyline Digital demo-boti");

    fetchMock.mockClear();
    const echoProbe = "<b>эхо-проверка</b> hello";
    await call(update(freshChat(), echoProbe));
    expect(sent().body.text).not.toContain("эхо-проверка");
    expect(sent().body.text).toContain(STUDIO_SITES_URL);
  });

  it("не отвечает в группах, на апдейты без сообщения и без текста", async () => {
    expect((await call(update(freshChat(), `/start ${startPayload}`, "group"))).status).toBe(200);
    expect((await call({ update_id: 2, edited_message: { message_id: 1 } })).status).toBe(200);
    expect((await call({ update_id: 3, message: { message_id: 1, chat: { id: 5, type: "private" }, sticker: {} } })).status).toBe(200);
    expect((await call({ foo: "bar" })).status).toBe(200);
    // Единственный ответ — справка на сообщение без текста в личном чате (стикер); группа и чужие апдейты молчат.
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(sent().body.chat_id).toBe(5);
  });
});

describe("POST /api/telegram/digest: ошибки Telegram и лимит", () => {
  it("ошибка Telegram не меняет ответ 200 и не пишет токен в лог", async () => {
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    fetchMock.mockRejectedValueOnce(new Error(`connect failed for /bot${TEST_TOKEN}/sendMessage`));
    expect((await call(update(freshChat(), `/start ${startPayload}`))).status).toBe(200);
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ ok: false, description: `Forbidden ${TEST_TOKEN}` }), { status: 403 }));
    expect((await call(update(freshChat(), `/start ${startPayload}`))).status).toBe(200);
    expect(errors).toHaveBeenCalledTimes(2);
    expect(JSON.stringify(errors.mock.calls)).not.toContain(TEST_TOKEN);
  });

  it("лимит на чат: 5 ответов за окно, дальше тишина, другой чат не затронут", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const chat = freshChat();
    for (let i = 0; i < 7; i++) expect((await call(update(chat, `/start ${startPayload}`))).status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(5);

    await call(update(freshChat(), `/start ${startPayload}`));
    expect(fetchMock).toHaveBeenCalledTimes(6);
  });
});
