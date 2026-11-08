import type { SalonData } from "./data";

/**
 * Фото, которые планировались, но могут ещё не лежать в public/templates/salon/img.
 * Пока файла нет, соответствующая работа, мастер или широкий кадр просто не показываются
 * (никаких 404). Когда фото появились: добавьте базовое имя в READY_OPTIONAL — код менять не нужно.
 *
 * Подробности и список ожидаемых файлов: docs/DESIGN-GAPS.md, раздел «Салон».
 */
export const READY_OPTIONAL: ReadonlySet<string> = new Set<string>([
  "m-work-7",
  "m-work-8",
  "m-master-4",
  "m-hero-wide",
]);

/** Данные без необязательных элементов, чьи фото ещё не лежат на месте. Исходный объект не меняется. */
export function withAvailablePhotos(data: SalonData, ready: ReadonlySet<string> = READY_OPTIONAL): SalonData {
  const keepPhoto = (item: { optional?: boolean; photo: string }) => !item.optional || ready.has(item.photo);
  const masters = data.masters.filter(keepPhoto);
  const masterIds = new Set(masters.map((m) => m.id));
  const looks = data.looks.filter((l) => keepPhoto(l) && masterIds.has(l.masterId));
  const upgrade = data.place.photo.upgrade;
  const place = upgrade && ready.has(upgrade.base) ? { ...data.place, photo: { ...data.place.photo, ...upgrade, upgrade: undefined } } : data.place;
  return { ...data, masters, looks, place };
}
