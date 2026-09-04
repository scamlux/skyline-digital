/**
 * Skyline Digital · сборщик дизайн-системы постов в Figma
 * ---------------------------------------------------------------------------
 * Один запуск создаёт в текущем файле:
 *   · коллекцию переменных «Horizon» — все цвета палитры
 *   · текстовые стили — заголовки, текст, служебные строки
 *   · пять компонентов постов Ш1–Ш5 (1080×1350)
 *   · закреплённую тройку профиля (3 фрейма)
 *   · пять обложек хайлайтов (1080×1920)
 *   · шаблон сторис
 *
 * Спецификация — docs/smm/DESIGN-SYSTEM-POSTS.md
 * Тексты профиля — docs/smm/PROFILE-CONTENT.md
 *
 * Шрифты: Unbounded, Golos Text, JetBrains Mono. Все три есть в Google Fonts,
 * то есть доступны в Figma без установки. Если шрифт не найден — скрипт
 * скажет какой именно и остановится, а не соберёт файл с подменой.
 */

// ── Палитра «Horizon over Tashkent» ─────────────────────────────────────────
const C = {
  night:      { hex: "1A2238", name: "night" },
  nightSoft:  { hex: "222C46", name: "night-soft" },
  lineNight:  { hex: "2E3855", name: "line-night" },
  apricot:    { hex: "FFAE5C", name: "apricot" },
  afterglow:  { hex: "E8517C", name: "afterglow" },
  paper:      { hex: "F4F6FA", name: "paper" },
  paper2:     { hex: "F3EAD8", name: "paper-warm" },
  line:       { hex: "D5DBE7", name: "line" },
  ink:        { hex: "1A2238", name: "ink" },
  inkSoft:    { hex: "48546F", name: "ink-soft" },
  inkFaint:   { hex: "8792A8", name: "ink-faint" },
  onNight:    { hex: "EEF1F7", name: "on-night" },
  onNightSoft:{ hex: "9AA6BF", name: "on-night-soft" },
  white:      { hex: "FFFFFF", name: "white" },
};

const rgb = (hex) => ({
  r: parseInt(hex.slice(0, 2), 16) / 255,
  g: parseInt(hex.slice(2, 4), 16) / 255,
  b: parseInt(hex.slice(4, 6), 16) / 255,
});
const solid = (hex, opacity) => [{ type: "SOLID", color: rgb(hex), opacity: opacity === undefined ? 1 : opacity }];

const W = 1080, H = 1350, HS = 1920;      // холсты: лента и сторис
const PAD = Math.round(W * 0.083);         // безопасные поля 90px
const HANDLE = "@skylinedigital.uz";
const SITE = "SKYLINE-DIGITAL.UZ";

const FONTS = [
  { family: "Unbounded", style: "Bold" },
  { family: "Unbounded", style: "SemiBold" },
  { family: "Golos Text", style: "Regular" },
  { family: "Golos Text", style: "SemiBold" },
  { family: "JetBrains Mono", style: "Bold" },
  { family: "JetBrains Mono", style: "Regular" },
];

// ── Мелкие помощники ────────────────────────────────────────────────────────

function text(chars, opts) {
  const t = figma.createText();
  t.fontName = opts.font;
  t.characters = chars;
  t.fontSize = opts.size;
  t.fills = solid(opts.color, opts.opacity);
  if (opts.spacing !== undefined) t.letterSpacing = { unit: "PERCENT", value: opts.spacing };
  if (opts.line !== undefined) t.lineHeight = { unit: "PERCENT", value: opts.line };
  if (opts.align) t.textAlignHorizontal = opts.align;
  if (opts.width) { t.textAutoResize = "HEIGHT"; t.resize(opts.width, t.height); }
  else t.textAutoResize = "WIDTH_AND_HEIGHT";
  t.name = chars.length > 28 ? chars.slice(0, 28) + "…" : chars;
  return t;
}

function rect(x, y, w, h, hex, opacity) {
  const r = figma.createRectangle();
  r.x = x; r.y = y; r.resize(w, h);
  r.fills = solid(hex, opacity);
  return r;
}

/** Уголковые скобки — приём uic.group, наш постоянный кадрирующий элемент. */
function corners(frame, hex) {
  const s = Math.round(W * 0.055), off = Math.round(W * 0.037), t = 3;
  const put = (x, y, w, h) => { const r = rect(x, y, w, h, hex); frame.appendChild(r); r.name = "уголок"; };
  put(off, off, s, t); put(off, off, t, s);                                   // левый верхний
  put(frame.width - off - s, frame.height - off - t, s, t);                   // правый нижний
  put(frame.width - off - t, frame.height - off - s, t, s);
}

/** Диагональные штрихи-«метеоры» — фон шаблона Ш1. */
function streaks(frame, hex) {
  [7, 23, 41, 58, 71, 86, 94].forEach((v, i) => {
    const r = rect(0, 0, Math.round(W * 0.42), 2, hex, 0.12);
    r.rotation = 38;
    r.x = (v * 1.6 - 40) / 100 * W;
    r.y = (i * 15 + 4) / 100 * frame.height;
    r.name = "штрих";
    frame.appendChild(r);
  });
}

/** Нижний колонтитул: ник слева, сайт или «листай» справа. */
function foot(frame, dark, right) {
  const y = frame.height - Math.round(W * 0.083);
  const div = rect(PAD, y - 34, frame.width - PAD * 2, 2, dark ? C.lineNight.hex : C.line.hex);
  div.name = "линия"; frame.appendChild(div);

  const l = text(HANDLE.toUpperCase(), { font: FONTS[5], size: 24, color: dark ? C.onNightSoft.hex : C.inkFaint.hex, spacing: 8 });
  l.x = PAD; l.y = y; frame.appendChild(l);

  const r = text(right || SITE, { font: FONTS[4], size: 24, color: dark ? C.apricot.hex : C.ink.hex, spacing: 8 });
  r.x = frame.width - PAD - r.width; r.y = y; frame.appendChild(r);
}

function makeFrame(name, w, h, bgHex) {
  const f = figma.createFrame();
  f.name = name; f.resize(w, h);
  f.fills = solid(bgHex);
  f.clipsContent = true;
  return f;
}

function toComponent(frame, x, y) {
  const c = figma.createComponent();
  c.name = frame.name; c.resize(frame.width, frame.height);
  c.fills = frame.fills; c.clipsContent = true;
  while (frame.children.length) c.appendChild(frame.children[0]);
  frame.remove();
  c.x = x; c.y = y;
  return c;
}

// ── Шаблоны ─────────────────────────────────────────────────────────────────

/** Ш1 «Одно слово» — githubradar. Меняется одно слово из трёх. */
function sh1(x, y) {
  const f = makeFrame("Ш1 · Одно слово", W, H, C.night.hex);
  streaks(f, C.onNight.hex);
  corners(f, C.apricot.hex);

  const eb = text("ЦЕНА ВОПРОСА", { font: FONTS[4], size: 26, color: C.apricot.hex, spacing: 20 });
  eb.x = PAD; eb.y = PAD + 60; f.appendChild(eb);

  const l1 = text("СКОЛЬКО СТОИТ", { font: FONTS[4], size: 35, color: C.onNightSoft.hex, spacing: 20, align: "CENTER", width: W - PAD * 2 });
  l1.x = PAD; l1.y = 560; f.appendChild(l1);

  const l2 = text("ЛЕНДИНГ", { font: FONTS[0], size: 120, color: C.apricot.hex, spacing: -3.5, line: 94, align: "CENTER", width: W - PAD * 2 });
  l2.x = PAD; l2.y = 615; f.appendChild(l2);

  const l3 = text("В ТАШКЕНТЕ", { font: FONTS[1], size: 58, color: C.onNight.hex, spacing: -2, line: 108, align: "CENTER", width: W - PAD * 2 });
  l3.x = PAD; l3.y = 745; f.appendChild(l3);

  foot(f, true);
  return toComponent(f, x, y);
}

/** Ш2 «Бумага» — контрастный стиль, чтобы сетка профиля не была чёрным пятном. */
function sh2(x, y) {
  const f = makeFrame("Ш2 · Бумага", W, H, C.paper2.hex);
  // Точечная сетка шагом 24px. Рисуется группой точек, а не заливкой:
  // так её видно в Figma как объект и можно выключить одним кликом.
  const dots = [];
  for (let gx = 24; gx < W; gx += 24)
    for (let gy = 24; gy < H; gy += 24) {
      const d = figma.createEllipse();
      d.x = gx; d.y = gy; d.resize(2, 2);
      d.fills = solid(C.ink.hex, 0.12);
      f.appendChild(d); dots.push(d);
    }
  const g = figma.group(dots, f); g.name = "точечная сетка"; g.locked = true;

  corners(f, C.apricot.hex);

  const eb = text("РАДАР · ВЫПУСК 1", { font: FONTS[4], size: 26, color: C.afterglow.hex, spacing: 20 });
  eb.x = PAD; eb.y = PAD + 60; f.appendChild(eb);

  const h = text("7 бесплатных сервисов вместо подрядчика", { font: FONTS[0], size: 85, color: C.ink.hex, spacing: -3, line: 100, width: W - PAD * 2 });
  h.x = PAD; h.y = 500; f.appendChild(h);

  const sub = text("То, за что просят денег, а можно закрыть самому за десять минут.", { font: FONTS[2], size: 34, color: C.inkSoft.hex, line: 145, width: W - PAD * 2 });
  sub.x = PAD; sub.y = h.y + h.height + 40; f.appendChild(sub);

  foot(f, false, "ЛИСТАЙ →");
  return toComponent(f, x, y);
}

/** Ш3 «Псевдо-интерфейс» — frontend_champs. Самый быстрый в производстве. */
function sh3(x, y) {
  const f = makeFrame("Ш3 · Псевдо-интерфейс", W, H, C.paper.hex);

  // верхняя полоса: аватар, имя, ник
  const av = figma.createEllipse();
  av.x = PAD; av.y = PAD; av.resize(65, 65);
  av.fills = solid(C.night.hex); av.name = "аватар"; f.appendChild(av);
  const bar = rect(PAD + 20, PAD + 28, 26, 10, C.apricot.hex); bar.name = "знак"; f.appendChild(bar);

  const nm = text("Skyline Digital", { font: FONTS[3], size: 25, color: C.ink.hex });
  nm.x = PAD + 83; nm.y = PAD + 4; f.appendChild(nm);
  const hd = text(HANDLE, { font: FONTS[5], size: 21, color: C.inkFaint.hex, spacing: 4 });
  hd.x = PAD + 83; hd.y = PAD + 36; f.appendChild(hd);

  const d1 = rect(PAD, PAD + 95, W - PAD * 2, 2, C.line.hex); d1.name = "линия"; f.appendChild(d1);

  // центр
  const eb = text("ВАЙБКОДИНГ", { font: FONTS[4], size: 26, color: C.afterglow.hex, spacing: 20, align: "CENTER", width: W - PAD * 2 });
  eb.x = PAD; eb.y = 400; f.appendChild(eb);

  const hk = text("Собрал рабочий прототип за вечер", { font: FONTS[0], size: 77, color: C.ink.hex, spacing: -2.5, line: 108, align: "CENTER", width: W - PAD * 2 });
  hk.x = PAD; hk.y = 460; f.appendChild(hk);

  const gl = text("1 / 5", { font: FONTS[0], size: 140, color: C.line.hex, spacing: -4, align: "CENTER", width: W - PAD * 2 });
  gl.x = PAD; gl.y = hk.y + hk.height + 40; f.appendChild(gl);

  const sb = text("Пять промптов, которые реально сработали. И один, который всё сломал.", { font: FONTS[2], size: 32, color: C.inkSoft.hex, line: 140, align: "CENTER", width: Math.round(W * 0.78) });
  sb.x = (W - sb.width) / 2; sb.y = gl.y + gl.height + 40; f.appendChild(sb);

  // нижний ряд действий. Без счётчиков: это призыв, а не имитация чужой статистики
  const dy = H - 190;
  const d2 = rect(PAD, dy, W - PAD * 2, 2, C.line.hex); d2.name = "линия"; f.appendChild(d2);
  const acts = [["НРАВИТСЯ", C.afterglow.hex], ["СОХРАНИТЬ", C.night.hex], ["ОТПРАВИТЬ", C.night.hex]];
  let ax = 180;
  acts.forEach(([label, col]) => {
    const ic = rect(ax, dy + 44, 30, 30, col, 0.001);
    ic.strokes = solid(col); ic.strokeWeight = 3; ic.cornerRadius = 4;
    ic.name = "иконка · заменить на вектор"; f.appendChild(ic);
    const tx = text(label, { font: FONTS[4], size: 20, color: C.inkSoft.hex, spacing: 10 });
    tx.x = ax + 44; tx.y = dy + 50; f.appendChild(tx);
    ax += 44 + tx.width + 60;
  });

  return toComponent(f, x, y);
}

/** Ш4 «Плашка-хук поверх кадра» — aziz_udevs, PROWEB. Плашка строго в верхней трети. */
function sh4(x, y) {
  const f = makeFrame("Ш4 · Плашка-хук", W, H, C.night.hex);

  const ph = rect(0, 0, W, H, C.nightSoft.hex);
  ph.name = "СЮДА СКРИНШОТ · логотип и домен замазать"; f.appendChild(ph);
  streaks(f, C.onNight.hex);
  const veil = rect(0, 0, W, H, C.night.hex, 0.5); veil.name = "вуаль"; f.appendChild(veil);
  corners(f, C.apricot.hex);

  const plate = makeFrame("плашка", W - PAD * 2, 10, C.white.hex);
  plate.x = PAD; plate.y = 140;
  plate.cornerRadius = 24;
  plate.strokes = solid(C.apricot.hex); plate.strokeWeight = 3;
  plate.layoutMode = "VERTICAL";
  plate.primaryAxisSizingMode = "AUTO";
  plate.counterAxisSizingMode = "FIXED";
  plate.paddingLeft = 45; plate.paddingRight = 45; plate.paddingTop = 50; plate.paddingBottom = 50;
  plate.itemSpacing = 20;
  plate.clipsContent = false;

  const hook = text("5 ОШИБОК, ИЗ-ЗА КОТОРЫХ САЙТ ТЕРЯЕТ ЗАКАЗЫ", { font: FONTS[0], size: 52, color: C.night.hex, spacing: -2, line: 110, width: plate.width - 90 });
  plate.appendChild(hook);
  const ask = text("Разбор сайта кофейни в Ташкенте. Обезличенно: без названия, логотипа и домена.", { font: FONTS[2], size: 30, color: C.inkSoft.hex, line: 135, width: plate.width - 90 });
  plate.appendChild(ask);
  f.appendChild(plate);

  const note = text("Четыре из пяти чинятся за день и не требуют переделки сайта.", { font: FONTS[2], size: 32, color: C.white.hex, opacity: 0.82, line: 140, width: Math.round(W * 0.78) });
  note.x = PAD; note.y = 620; f.appendChild(note);

  foot(f, true, "ЛИСТАЙ →");
  return toComponent(f, x, y);
}

/** Ш5 «Кейс-борд» — uic.group, аккаунт с лучшей вовлечённостью из семи. */
function sh5(x, y) {
  const f = makeFrame("Ш5 · Кейс-борд", W, H, C.night.hex);
  corners(f, C.apricot.hex);

  const eb = text("КЕЙС · 2026", { font: FONTS[4], size: 26, color: C.apricot.hex, spacing: 20 });
  eb.x = PAD; eb.y = PAD + 60; f.appendChild(eb);

  const shot = rect(PAD, 300, W - PAD * 2, 520, C.nightSoft.hex);
  shot.cornerRadius = 12; shot.name = "СЮДА ОБЛОЖКА ПРОЕКТА · public/projects/*.jpg"; f.appendChild(shot);

  const ttl = text("НАЗВАНИЕ ПРОЕКТА", { font: FONTS[0], size: 90, color: C.onNight.hex, spacing: -3, line: 100, width: W - PAD * 2 });
  ttl.x = PAD; ttl.y = 870; f.appendChild(ttl);

  const res = text("Результат цифрой — из замера или от клиента. Без цифры это не кейс, а картинка.", { font: FONTS[2], size: 32, color: C.onNightSoft.hex, line: 140, width: W - PAD * 2 });
  res.x = PAD; res.y = ttl.y + ttl.height + 30; f.appendChild(res);

  // палитра проекта
  let sx = PAD;
  [C.night.hex, C.apricot.hex, C.afterglow.hex].forEach((hex) => {
    const s = rect(sx, 1120, 90, 60, hex); s.cornerRadius = 2; s.name = "#" + hex; f.appendChild(s);
    sx += 100;
  });

  foot(f, true);
  return toComponent(f, x, y);
}

// ── Закреплённая тройка и хайлайты ──────────────────────────────────────────

function pinned(x, y) {
  const data = [
    ["01 · КТО МЫ", "СТУДИЯ ОДНОГО ЧЕЛОВЕКА", C.night.hex, C.apricot.hex, C.onNight.hex, true],
    ["02 · ЧТО ДЕЛАЕМ", "САЙТЫ, КОТОРЫЕ МОЖНО ИЗМЕРИТЬ", C.paper.hex, C.afterglow.hex, C.ink.hex, false],
    ["03 · КАК НАЧАТЬ", "НАЧАТЬ МОЖНО БЕСПЛАТНО", C.night.hex, C.apricot.hex, C.onNight.hex, true],
  ];
  return data.map(([eb, title, bg, accent, fg, dark], i) => {
    const f = makeFrame("Закреп " + (i + 1) + " · " + eb.split("· ")[1], W, H, bg);
    if (dark) streaks(f, C.onNight.hex);
    corners(f, accent);
    const e = text(eb, { font: FONTS[4], size: 26, color: accent, spacing: 20 });
    e.x = PAD; e.y = PAD + 60; f.appendChild(e);
    const t = text(title, { font: FONTS[0], size: 96, color: fg, spacing: -3.5, line: 96, width: W - PAD * 2 });
    t.x = PAD; t.y = 520; f.appendChild(t);
    foot(f, dark);
    return toComponent(f, x + i * (W + 80), y);
  });
}

function highlights(x, y) {
  return ["РАБОТЫ", "ЦЕНЫ", "АУДИТ", "О СТУДИИ", "ОТЗЫВЫ"].map((name, i) => {
    const f = makeFrame("Хайлайт · " + name, W, HS, C.night.hex);
    streaks(f, C.onNight.hex);
    corners(f, C.apricot.hex);
    const t = text(name, { font: FONTS[0], size: 96, color: C.apricot.hex, spacing: -3, align: "CENTER", width: W - PAD * 2 });
    t.x = PAD; t.y = HS / 2 - 60; f.appendChild(t);
    const s = text("SKYLINE DIGITAL", { font: FONTS[4], size: 24, color: C.onNightSoft.hex, spacing: 20, align: "CENTER", width: W - PAD * 2 });
    s.x = PAD; s.y = HS / 2 + 80; f.appendChild(s);
    return toComponent(f, x + i * (W + 80), y);
  });
}

function storyTemplate(x, y) {
  const f = makeFrame("Сторис · шаблон", W, HS, C.night.hex);
  streaks(f, C.onNight.hex);
  corners(f, C.apricot.hex);
  const eb = text("О СТУДИИ · 1 / 6", { font: FONTS[4], size: 30, color: C.apricot.hex, spacing: 20 });
  eb.x = PAD; eb.y = 300; f.appendChild(eb);
  const t = text("Заголовок кадра в две строки", { font: FONTS[0], size: 88, color: C.onNight.hex, spacing: -3, line: 104, width: W - PAD * 2 });
  t.x = PAD; t.y = 380; f.appendChild(t);
  const b = text("Текст кадра. Одна мысль на кадр, не больше.", { font: FONTS[2], size: 38, color: C.onNightSoft.hex, line: 145, width: W - PAD * 2 });
  b.x = PAD; b.y = 700; f.appendChild(b);
  foot(f, true);
  return toComponent(f, x, y);
}

// ── Переменные и текстовые стили ────────────────────────────────────────────

function buildVariables() {
  try {
    const col = figma.variables.createVariableCollection("Horizon over Tashkent");
    const mode = col.modes[0].modeId;
    Object.keys(C).forEach((k) => {
      const v = figma.variables.createVariable(C[k].name, col, "COLOR");
      v.setValueForMode(mode, rgb(C[k].hex));
    });
    return "переменные: " + Object.keys(C).length;
  } catch (e) {
    return "переменные пропущены (" + e.message + ")";
  }
}

function buildTextStyles() {
  const defs = [
    ["Заголовок / крупный", FONTS[0], 120, -3.5, 94],
    ["Заголовок / средний", FONTS[0], 85, -3, 100],
    ["Заголовок / малый", FONTS[1], 58, -2, 108],
    ["Текст / основной", FONTS[2], 34, 0, 145],
    ["Текст / выделенный", FONTS[3], 32, 0, 140],
    ["Служебная / надзаголовок", FONTS[4], 26, 20, 120],
    ["Служебная / подпись", FONTS[5], 24, 8, 120],
  ];
  defs.forEach(([name, font, size, spacing, line]) => {
    const s = figma.createTextStyle();
    s.name = name; s.fontName = font; s.fontSize = size;
    s.letterSpacing = { unit: "PERCENT", value: spacing };
    s.lineHeight = { unit: "PERCENT", value: line };
  });
  return "текстовых стилей: " + defs.length;
}

// ── Запуск ──────────────────────────────────────────────────────────────────

async function main() {
  for (const f of FONTS) {
    try { await figma.loadFontAsync(f); }
    catch (e) {
      figma.closePlugin("Не найден шрифт: " + f.family + " " + f.style +
        ". Установите его (все три есть в Google Fonts) и запустите снова.");
      return;
    }
  }

  const page = figma.currentPage;
  page.name = "Skyline · дизайн-система постов";

  const made = [];
  made.push(sh1(0, 0));
  made.push(sh2(W + 80, 0));
  made.push(sh3((W + 80) * 2, 0));
  made.push(sh4((W + 80) * 3, 0));
  made.push(sh5((W + 80) * 4, 0));

  const row2 = H + 200;
  pinned(0, row2).forEach((c) => made.push(c));
  const row3 = row2 + H + 200;
  highlights(0, row3).forEach((c) => made.push(c));
  made.push(storyTemplate((W + 80) * 5, row3));

  const vr = buildVariables();
  const ts = buildTextStyles();

  figma.viewport.scrollAndZoomIntoView(made);
  figma.closePlugin(
    "Готово. Компонентов: " + made.length + " · " + vr + " · " + ts +
    ". Ш4 и Ш5 ждут картинку — прямоугольники подписаны."
  );
}

main();
