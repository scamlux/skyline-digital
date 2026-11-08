"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Шторка на нативном <dialog>: Esc, фокус-ловушка и инертный фон приходят от браузера.
 * На телефоне — нижняя шторка, на десктопе — панель справа (см. cafe.css). Закрытие по
 * касанию подложки. Фокус после закрытия возвращается на кнопку, открывшую шторку.
 */
export function Sheet({ open, onClose, label, className, children }: { open: boolean; onClose: () => void; label: string; className?: string; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className={`cf-sheet ${className ?? ""}`}
      aria-label={label}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {open && <div className="cf-sheet-body">{children}</div>}
    </dialog>
  );
}
