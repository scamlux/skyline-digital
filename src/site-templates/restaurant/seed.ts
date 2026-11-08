import { addDays } from "../kit/tashkent";
import type { NewLead } from "./store";

/** Заявки, которыми наполняем демо-кабинет: имена вымышленные, время — ближайшие дни, вечер по Ташкенту. */
const SAMPLE: Omit<NewLead, "when">[] = [
  { name: "Дилноза", phone: "+998 90 111 22 33", guests: "3–4", zone: "tapchan", occasion: "birthday", wish: "Классика: Плов праздничный ×4, Самса из тандыра ×2, Чай зелёный ×2", wishSum: 281000 },
  { name: "Акмаль", phone: "+998 97 222 33 44", guests: "1–2", zone: "terrace" },
  { name: "Малика", phone: "+998 93 333 44 55", guests: "5–8", zone: "hall", occasion: "family", wish: "Мясной стол: Шашлык из баранины ×2, Люля-кебаб ×2, Плов праздничный ×2", wishSum: 283000 },
  { name: "Jasur", phone: "+998 94 444 55 66", guests: "3–4", zone: "hall", occasion: "business" },
  { name: "Нигора", phone: "+998 99 555 66 77", guests: "1–2", zone: "hall" },
  { name: "Bobur", phone: "+998 91 666 77 88", guests: "5–8", zone: "tapchan", occasion: "birthday" },
  { name: "Севара", phone: "+998 95 777 88 99", guests: "1–2", zone: "terrace", occasion: "family" },
  { name: "Farrux", phone: "+998 90 888 99 00", guests: "5–8", zone: "hall", occasion: "business" },
];

const EVENING = "19:00";
const SPREAD_DAYS = 3;

/** Демо-заявки с датами «в ближайшие дни, вечером»: считаются в момент нажатия, от сегодняшней даты Ташкента. */
export const buildSeedLeads = (todayIso: string): NewLead[] => SAMPLE.map((l, i) => ({ ...l, when: `${addDays(todayIso, i % SPREAD_DAYS)}T${EVENING}` }));
