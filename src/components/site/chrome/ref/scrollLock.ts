/**
 * Блокировка скролла страницы со счётчиком: прелоадер, меню и кейс могут
 * перекрываться по времени, и каждый «владелец» не должен сохранять/возвращать
 * чужое значение overflow. Скролл возвращается, только когда все сняли блок.
 */
let locks = 0;
let saved = "";

export function lockScroll(): () => void {
  if (locks++ === 0) {
    saved = document.body.style.overflow;
    document.body.style.overflow = "hidden";
  }
  let released = false;
  return () => {
    if (released) return;
    released = true;
    if (--locks === 0) document.body.style.overflow = saved;
  };
}
