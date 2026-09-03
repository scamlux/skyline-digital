"use client";

import { useTransition } from "react";

/** Small confirm-guarded delete button for table rows. */
export function DeleteButton({
  onDelete,
  label = "Удалить",
  confirmText = "Удалить безвозвратно?",
}: {
  onDelete: () => Promise<unknown>;
  label?: string;
  confirmText?: string;
}) {
  const [pending, start] = useTransition();
  return (
    <button
      disabled={pending}
      onClick={(e) => {
        e.stopPropagation();
        if (confirm(confirmText)) start(async () => { await onDelete(); });
      }}
      className="rounded px-2 py-1 text-xs font-medium text-red-500 hover:bg-red-50 disabled:opacity-50"
    >
      {pending ? "…" : label}
    </button>
  );
}
