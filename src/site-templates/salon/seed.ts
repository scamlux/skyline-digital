import { addDays, tashkentNow, toMinutes, fromMinutes } from "../kit/tashkent";
import { basketOf, LEAD_MINUTES, masterWorks, mastersFor, slotTimes, type SalonOverrides, type ScheduleData } from "./schedule";
import type { BookingStatus, SeedBooking } from "./store";

/** Гости демо-наполнения: имена и телефоны вымышленные. */
const GUESTS = [
  { name: "Азиз", phone: "+998 90 111 22 33" },
  { name: "Мадина", phone: "+998 97 222 33 44" },
  { name: "Jasur", phone: "+998 93 333 44 55" },
  { name: "Нилуфар", phone: "+998 94 444 55 66" },
  { name: "Bekzod", phone: "+998 99 555 66 77" },
  { name: "Тимур", phone: "+998 91 666 77 88" },
  { name: "Севара", phone: "+998 95 777 88 99" },
  { name: "Farrux", phone: "+998 90 888 99 00" },
  { name: "Гульнора", phone: "+998 97 123 45 67" },
  { name: "Sardor", phone: "+998 93 234 56 78" },
  { name: "Дилшод", phone: "+998 94 345 67 89" },
  { name: "Otabek", phone: "+998 99 456 78 90" },
  { name: "Камила", phone: "+998 91 567 89 01" },
  { name: "Sherzod", phone: "+998 90 678 90 12" },
];

/** Наборы услуг демо-записей: мужской зал чаще, женский и борода реже. */
const BASKETS = [["fade"], ["combo"], ["wcut", "wcare"], ["classic", "beard"], ["wstyle"], ["razor"], ["wcolor"], ["mcut", "beard"], ["fade", "mask"], ["wcut"], ["beard"], ["classic"], ["combo"], ["fade"]];
/** Смещения дат от сегодня: немного прошлого (пришли/не пришли), сегодня и ближайшие дни. */
const OFFSETS = [-5, -4, -4, -3, -2, -2, -1, -1, 0, 0, 1, 1, 2, 3];
const DAY_MS = 86_400_000;
const PAST_STATUSES: BookingStatus[] = ["arrived", "arrived", "arrived", "noshow", "arrived", "cancelled"];

/** Время начала в мс (Ташкент = UTC+5). */
const startTs = (date: string, time: string) => {
  const [y, m, d] = date.split("-").map(Number);
  return Date.UTC(y, m - 1, d, 0, toMinutes(time) - 5 * 60);
};

/**
 * Демо-записи для первого открытия кабинета. Детерминированы и непротиворечивы: запись лежит
 * на рабочем дне мастера, целиком в часах работы, не пересекается с другой записью того же
 * мастера; сегодняшние и будущие — не в прошлом. Сумма считается по ценам на момент наполнения.
 */
export function buildSeedBookings(data: ScheduleData, ov: SalonOverrides, nowTs: number = Date.now()): SeedBooking[] {
  const now = tashkentNow(nowTs);
  const times = slotTimes(data);
  const close = toMinutes(data.hours.close);
  const used: { masterId: string; date: string; from: number; to: number }[] = [];
  const out: SeedBooking[] = [];

  OFFSETS.forEach((offset, i) => {
    const basket = basketOf(data, ov, BASKETS[i % BASKETS.length]);
    if (basket.ids.length === 0) return;
    let date = addDays(now.iso, offset);
    for (let attempt = 0; attempt < 14; attempt++) {
      const master = mastersFor(data, basket.ids).find((m) => masterWorks(m, ov, date));
      if (master) {
        for (let k = 0; k < times.length; k++) {
          const time = times[(i * 3 + 2 + k) % times.length];
          const from = toMinutes(time);
          const to = from + basket.minutes;
          const clash = used.some((u) => u.masterId === master.id && u.date === date && from < u.to && u.from < to);
          if (clash || to > close || (date === now.iso && from < now.minutes + LEAD_MINUTES)) continue;
          used.push({ masterId: master.id, date, from, to });
          const upcoming = date >= now.iso;
          const status: BookingStatus = upcoming ? (i % 3 === 0 ? "new" : "confirmed") : PAST_STATUSES[i % PAST_STATUSES.length];
          const at = new Date(Math.min(nowTs - (0.05 + ((i * 5) % 12) * 0.5) * DAY_MS, startTs(date, fromMinutes(from)) - 0.4 * DAY_MS)).toISOString();
          out.push({ ...GUESTS[i % GUESTS.length], serviceIds: basket.ids, masterId: master.id, anyMaster: i % 4 === 1, date, time, minutes: basket.minutes, total: basket.price, status, at });
          return;
        }
      }
      // Нет мастера/окна в этот день — берём следующий.
      date = addDays(date, 1);
    }
  });
  return out;
}
