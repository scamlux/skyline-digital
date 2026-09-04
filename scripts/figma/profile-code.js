/**
 * Skyline Digital · достройка профиля в Figma
 * ---------------------------------------------------------------------------
 * Собирает то, что не успел коннектор: закреплённую тройку, пять обложек
 * хайлайтов и шесть сторис «О студии».
 *
 * КАК ЗАПУСТИТЬ
 *  1. Открой файл «Skyline Digital · Instagram сентябрь 2026».
 *  2. Перейди на страницу «00 · Основа и профиль» — скрипт строит на активной.
 *  3. Plugins → Development → New Plugin → Figma design → Empty (если плагина ещё нет).
 *  4. Замени в папке плагина code.js этим файлом, manifest.json оставь свой.
 *  5. Plugins → Development → запусти плагин.
 *
 * Переменные и текстовые стили уже созданы коннектором — здесь только макеты.
 */

const C = { night:"1A2238", nsoft:"222C46", lnight:"2E3855", apricot:"FFAE5C", afterglow:"E8517C",
  paper:"F4F6FA", paper2:"F3EAD8", line:"D5DBE7", ink:"1A2238", inkSoft:"48546F", inkFaint:"8792A8",
  onNight:"EEF1F7", onNightSoft:"9AA6BF", white:"FFFFFF" };
const F = { ub:{family:"Unbounded",style:"Bold"}, ubs:{family:"Unbounded",style:"SemiBold"},
  gr:{family:"Golos Text",style:"Regular"}, gs:{family:"Golos Text",style:"SemiBold"},
  mb:{family:"JetBrains Mono",style:"Bold"}, mr:{family:"JetBrains Mono",style:"Regular"} };

const rgb = h => ({ r:parseInt(h.slice(0,2),16)/255, g:parseInt(h.slice(2,4),16)/255, b:parseInt(h.slice(4,6),16)/255 });
const fill = (h,o) => [{ type:"SOLID", color:rgb(h), opacity:o===undefined?1:o }];
const W=1080, H=1350, HS=1920, PAD=90, CW=900;

const T = (c,f,s,col,o={}) => {
  const t=figma.createText(); t.fontName=f; t.characters=c; t.fontSize=s; t.fills=fill(col);
  t.letterSpacing={unit:"PERCENT",value:o.sp||0}; t.lineHeight={unit:"PERCENT",value:o.lh||130};
  if(o.align) t.textAlignHorizontal=o.align;
  t.textAutoResize="HEIGHT"; t.resize(o.w||CW,t.height); t.name=c.slice(0,26); return t;
};
const R = (w,h,c,o) => { const r=figma.createRectangle(); r.resize(w,h); r.fills=fill(c,o); return r; };

function corners(f,a,hh){ const s=60,o=40,t=3;
  [[o,o,s,t],[o,o,t,s],[W-o-s,hh-o-t,s,t],[W-o-t,hh-o-s,t,s]]
    .forEach(([x,y,w,h])=>{ const r=R(w,h,a); r.x=x; r.y=y; r.name="уголок"; f.appendChild(r); });
}
function streaks(f,c,hh){
  [7,23,41,58,71,86,94].forEach((v,i)=>{ const r=R(450,2,c,0.12); r.rotation=-38;
    r.x=(v*1.6-40)/100*W; r.y=(i*13+4)/100*hh; r.name="штрих"; f.appendChild(r); });
}
function mk(n,w,h,bg){ const f=figma.createFrame(); f.name=n; f.resize(w,h); f.fills=fill(bg); f.clipsContent=true; return f; }

// Авто-лейаут: блоки не наедут друг на друга, что бы ни случилось с длиной текста.
function colOf(f,hh,top,bottom,gap){
  const c=figma.createFrame(); c.name="контент"; c.fills=[];
  f.appendChild(c); c.resize(CW,hh-top-bottom); c.x=PAD; c.y=top;
  c.layoutMode="VERTICAL"; c.itemSpacing=gap||36;
  c.primaryAxisSizingMode="FIXED"; c.counterAxisSizingMode="FIXED";
  c.primaryAxisAlignItems="SPACE_BETWEEN"; c.clipsContent=false; return c;
}
function block(p,gap){
  const b=figma.createFrame(); b.name="блок"; b.fills=[]; p.appendChild(b);
  b.layoutMode="VERTICAL"; b.itemSpacing=gap||20;
  b.primaryAxisSizingMode="AUTO"; b.counterAxisSizingMode="FIXED";
  b.layoutSizingHorizontal="FILL"; b.layoutSizingVertical="HUG"; return b;
}
function foot(c,dark,right){
  const b=figma.createFrame(); b.name="подвал"; b.fills=[]; c.appendChild(b);
  b.layoutMode="VERTICAL"; b.itemSpacing=22; b.primaryAxisSizingMode="AUTO";
  b.layoutSizingHorizontal="FILL"; b.layoutSizingVertical="HUG";
  const ln=R(CW,2,dark?C.lnight:C.line); b.appendChild(ln); ln.layoutSizingHorizontal="FILL";
  const row=figma.createFrame(); row.name="строка"; row.fills=[]; b.appendChild(row);
  row.layoutMode="HORIZONTAL"; row.primaryAxisSizingMode="FIXED"; row.counterAxisSizingMode="AUTO";
  row.layoutSizingHorizontal="FILL"; row.primaryAxisAlignItems="SPACE_BETWEEN";
  row.appendChild(T("@SKYLINEDIGITAL.UZ",F.mr,24,dark?C.onNightSoft:C.inkFaint,{sp:8,w:420}));
  row.appendChild(T(right||"SKYLINE-DIGITAL.UZ",F.mb,24,dark?C.apricot:C.ink,{sp:8,w:420,align:"RIGHT"}));
  return b;
}

async function main(){
  for (const k in F) {
    try { await figma.loadFontAsync(F[k]); }
    catch(e){ figma.closePlugin("Не найден шрифт "+F[k].family+" "+F[k].style+". Все три есть в Google Fonts."); return; }
  }
  const page = figma.currentPage;
  const made = [];

  // ── 1. Закреплённая тройка ───────────────────────────────────────────────
  const TRIO=[
   {n:"Закреп 1 · Кто мы", eb:"01 · КТО МЫ", t:"СТУДИЯ ОДНОГО ЧЕЛОВЕКА",
    sub:"Не агентство с офисом и отделом продаж. Один разработчик, который сам разговаривает с клиентом, сам проектирует и сам отвечает, если что-то пошло не так.", dark:true},
   {n:"Закреп 2 · Что делаем", eb:"02 · ЧТО ДЕЛАЕМ", t:"САЙТЫ, КОТОРЫЕ МОЖНО ИЗМЕРИТЬ",
    sub:"Сайты от $1 000 · Веб-приложения от $2 080 · ИИ-решения от $1 680. Точная цифра и состав работ — калькулятором за две минуты, до разговора.", dark:false},
   {n:"Закреп 3 · Как начать", eb:"03 · КАК НАЧАТЬ", t:"НАЧАТЬ МОЖНО БЕСПЛАТНО",
    sub:"Пришлите домен в директ — вернусь с замером и списком проблем по порядку важности. Без предложения переделать всё.", dark:true},
  ];
  TRIO.forEach((p,i)=>{
    const f=mk(p.n,W,H,p.dark?C.night:C.paper);
    page.appendChild(f); f.x=i*(W+70); f.y=0;
    if(p.dark) streaks(f,C.onNight,H);
    corners(f,p.dark?C.apricot:C.afterglow,H);
    const c=colOf(f,H,PAD,PAD);
    const top=block(c,0);
    const e=T(p.eb,F.mb,26,p.dark?C.apricot:C.afterglow,{sp:20}); top.appendChild(e); e.layoutSizingHorizontal="FILL";
    const m=block(c,30);
    const h=T(p.t,F.ub,92,p.dark?C.onNight:C.ink,{sp:-3.5,lh:96}); m.appendChild(h); h.layoutSizingHorizontal="FILL";
    const s=T(p.sub,F.gr,32,p.dark?C.onNightSoft:C.inkSoft,{lh:145}); m.appendChild(s); s.layoutSizingHorizontal="FILL";
    foot(c,p.dark); made.push(f);
  });
  const l1=T("ЗАКРЕПЛЁННАЯ ТРОЙКА · публикуется до 7 сентября и закрепляется наверху профиля",F.mb,44,C.night,{sp:8,w:2600});
  l1.x=0; l1.y=-140; page.appendChild(l1); made.push(l1);

  // ── 2. Обложки хайлайтов ─────────────────────────────────────────────────
  // Instagram обрезает обложку в круг по центру — пунктирное кольцо показывает границу.
  const HL=[["РАБОТЫ","восемь проектов"],["ЦЕНЫ","вилки и что входит"],["АУДИТ","что проверяем"],
    ["О СТУДИИ","кто и как работает"],["ОТЗЫВЫ","пока пусто · не выдумывать"]];
  const HY=H+420;
  HL.forEach(([name,note],i)=>{
    const f=mk("Хайлайт · "+name,W,HS,C.night);
    page.appendChild(f); f.x=i*(W+70); f.y=HY;
    streaks(f,C.onNight,HS); corners(f,C.apricot,HS);
    const ring=figma.createEllipse(); ring.resize(700,700); ring.x=190; ring.y=HS/2-350;
    ring.fills=[]; ring.strokes=fill(C.apricot,0.28); ring.strokeWeight=3; ring.dashPattern=[16,14];
    ring.name="зона круглого кропа · не выходить за неё"; f.appendChild(ring);
    const t=T(name,F.ub,name.length>7?76:96,C.apricot,{sp:-3,lh:100,align:"CENTER"});
    t.x=PAD; t.y=HS/2-t.height/2; f.appendChild(t);
    const s=T(note,F.mr,24,C.onNightSoft,{sp:8,align:"CENTER"});
    s.x=PAD; s.y=HS/2+120; f.appendChild(s);
    made.push(f);
  });
  const l2=T("ХАЙЛАЙТЫ · порядок важен: «Работы» первым, человек ищет доказательства",F.mb,44,C.night,{sp:8,w:2600});
  l2.x=0; l2.y=HY-140; page.appendChild(l2); made.push(l2);

  // ── 3. Сторис «О студии» ─────────────────────────────────────────────────
  // Верх и низ кадра перекрыты интерфейсом Instagram — контент только в середине.
  const ST=[
   ["1 / 6","Skyline Digital","Ташкент. Студия одного человека. Сайты, веб-приложения, ИИ и автоматизация."],
   ["2 / 6","Что делаю","Сайты от $1 000. Веб-приложения от $2 080. ИИ-решения от $1 680. Автоматизация от $1 130."],
   ["3 / 6","Как работаю","Отвечаю за всё сам — поэтому между «нашли ошибку» и «исправлено» нет согласования. Правки в тот же день."],
   ["4 / 6","Чем отличаюсь","Показываю замер, а не обещание. Цену называю в ленте, а не «уточним потом»."],
   ["5 / 6","Сколько стоит","Калькулятор на сайте считает часы по ролям и показывает состав работ до разговора."],
   ["6 / 6","Как начать","Пришлите домен в директ — разберу бесплатно и покажу, что чинить первым."],
  ];
  const SY=HY+HS+420;
  ST.forEach(([num,title,body],i)=>{
    const f=mk("Сторис · О студии · "+num,W,HS,C.night);
    page.appendChild(f); f.x=i*(W+70); f.y=SY;
    streaks(f,C.onNight,HS); corners(f,C.apricot,HS);
    const safe=R(W-60,HS-560,C.apricot,0.0001); safe.x=30; safe.y=280;
    safe.strokes=fill(C.apricot,0.2); safe.strokeWeight=2; safe.dashPattern=[14,12];
    safe.name="безопасная зона · интерфейс Instagram перекрывает верх и низ"; f.appendChild(safe);
    const c=colOf(f,HS,320,300,40);
    const top=block(c,0);
    const e=T("О СТУДИИ · "+num,F.mb,30,C.apricot,{sp:20}); top.appendChild(e); e.layoutSizingHorizontal="FILL";
    const m=block(c,32);
    const h=T(title,F.ub,88,C.onNight,{sp:-3,lh:104}); m.appendChild(h); h.layoutSizingHorizontal="FILL";
    const b=T(body,F.gr,38,C.onNightSoft,{lh:145}); m.appendChild(b); b.layoutSizingHorizontal="FILL";
    foot(c,true,i===5?"АУДИТ В ДИРЕКТ":"SKYLINE-DIGITAL.UZ");
    made.push(f);
  });
  const l3=T("СТОРИС «О СТУДИИ» · снимаются один раз, живут в хайлайте постоянно",F.mb,44,C.night,{sp:8,w:2600});
  l3.x=0; l3.y=SY-140; page.appendChild(l3); made.push(l3);

  figma.viewport.scrollAndZoomIntoView(made);
  figma.closePlugin("Готово: 3 закреплённых поста, 5 обложек хайлайтов, 6 сторис. Всего "+made.length+" объектов.");
}

main();
