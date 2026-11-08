import { addDays, tashkentNow, toMinutes } from "../kit/tashkent";
import { doctorWorks, type ScheduleData, doctorsFor, LEAD_MINUTES, slotTimes, visibleServices, type ClinicOverrides } from "./schedule";
import type { BookingStatus, SeedBooking } from "./store";

/** Пациенты демо-наполнения: имена и телефоны вымышленные. */
const PATIENTS = [
  { name: "Дилноза", phone: "+998 90 111 22 33" },
  { name: "Акмаль", phone: "+998 97 222 33 44" },
  { name: "Малика", phone: "+998 93 333 44 55" },
  { name: "Jasur", phone: "+998 94 444 55 66" },
  { name: "Нигора", phone: "+998 99 555 66 77" },
  { name: "Bobur", phone: "+998 91 666 77 88" },
  { name: "Севара", phone: "+998 95 777 88 99" },
  { name: "Farrux", phone: "+998 90 888 99 00" },
  { name: "Гульнора", phone: "+998 97 123 45 67" },
  { name: "Sardor", phone: "+998 93 234 56 78" },
  { name: "Камола", phone: "+998 94 345 67 89" },
  { name: "Otabek", phone: "+998 99 456 78 90" },
];

/** Смещения дат от сегодня: немного прошлого (пришли/не пришли), сегодня и ближайшие дни. */
const OFFSETS = [-5, -4, -3, -3, -2, -1, -1, 0, 0, 1, 2, 3];
const DAY_MS = 86_400_000;
const PAST_STATUSES: BookingStatus[] = ["arrived", "arrived", "arrived", "noshow", "arrived", "cancelled"];

/** Время начала приёма в мс (Ташкент = UTC+5). */
const startTs = (date: string, time: string) => {
  const [y, m, d] = date.split("-").map(Number);
  return Date.UTC(y, m - 1, d, 0, toMinutes(time) - 5 * 60);
};

/**
 * Демо-записи для первого открытия кабинета. Детерминированы и непротиворечивы: каждая запись
 * лежит на рабочем дне врача, в рабочие часы, не в воскресенье и не пересекается с другой
 * записью того же врача; будущие и сегодняшние — не в прошлом.
 */
export function buildSeedBookings(data: ScheduleData, ov: ClinicOverrides, nowTs: number = Date.now()): SeedBooking[] {
  const now = tashkentNow(nowTs);
  const times = slotTimes(data);
  const services = visibleServices(data, ov);
  const used = new Set<string>();
  const out: SeedBooking[] = [];

  OFFSETS.forEach((offset, i) => {
    let date = addDays(now.iso, offset);
    // Цикл по услугам и дням: ищем первую комбинацию, где есть врач на дату и свободное время.
    for (let attempt = 0; attempt < 14; attempt++) {
      const svc = services[(i + attempt) % services.length];
      const doc = doctorsFor(data, svc.id).find((d) => doctorWorks(data, d, ov, date));
      if (doc) {
        for (let k = 0; k < times.length; k++) {
          const time = times[(i * 3 + 2 + k) % times.length];
          const key = `${doc.id}|${date}|${time}`;
          if (used.has(key) || (date === now.iso && toMinutes(time) < now.minutes + LEAD_MINUTES)) continue;
          used.add(key);
          const upcoming = date >= now.iso;
          const status: BookingStatus = upcoming ? (i % 3 === 0 ? "new" : "confirmed") : PAST_STATUSES[i % PAST_STATUSES.length];
          const p = PATIENTS[i % PATIENTS.length];
          const at = new Date(Math.min(nowTs - (0.05 + ((i * 5) % 12) * 0.5) * DAY_MS, startTs(date, time) - 0.4 * DAY_MS)).toISOString();
          // Пара записей «с планом» из карты зубов: кабинет показывает зубы списком.
          const withPlan =
            i === 8 && upcoming
              ? { plan: "Лечение кариеса ×2, Имплант", teeth: [{ tooth: 16, problem: "caries" as const }, { tooth: 26, problem: "caries" as const }, { tooth: 36, problem: "implant" as const }] }
              : {};
          out.push({ ...p, serviceId: svc.id, doctorId: doc.id, anyDoctor: i % 4 === 1, date, time, status, at, ...withPlan });
          return;
        }
      }
      // Нет врача/времени в этот день — берём следующий рабочий (не уходя в прошлое для будущих записей).
      date = addDays(date, 1);
    }
  });
  return out;
}
