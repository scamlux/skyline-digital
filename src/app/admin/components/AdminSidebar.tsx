"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Inbox,
  Calculator,
  Gauge,
  Radar,
  FolderKanban,
  DollarSign,
  Settings,
} from "lucide-react";

const NAV = [
  { href: "/admin", label: "Обзор", icon: LayoutDashboard, exact: true },
  { href: "/admin/leads", label: "Заявки", icon: Inbox },
  { href: "/admin/estimates", label: "Сметы и КП", icon: Calculator },
  { href: "/admin/audits", label: "Аудиты сайтов", icon: Gauge },
  { href: "/admin/radar", label: "Радар (лиды)", icon: Radar },
];

const SOON = [
  { label: "Проекты", icon: FolderKanban },
  { label: "Прайс", icon: DollarSign },
  { label: "Настройки", icon: Settings },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");

  return (
    <aside className="flex w-60 shrink-0 flex-col bg-[#1a2238] text-white">
      <div className="px-5 py-6">
        <Link href="/admin" className="font-display text-lg font-semibold tracking-wide">
          skyline<span className="text-apricot">.</span>digital
        </Link>
        <div className="mt-1 text-xs text-white/40">Админка</div>
      </div>
      <nav className="flex-1 space-y-1 px-3">
        {NAV.map(({ href, label, icon: Icon, exact }) => (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
              isActive(href, exact)
                ? "bg-apricot/20 font-medium text-apricot"
                : "text-white/70 hover:bg-white/5 hover:text-white"
            }`}
          >
            <Icon size={18} />
            {label}
          </Link>
        ))}
        <div className="px-3 pb-1 pt-5 text-[10px] uppercase tracking-wider text-white/30">
          Скоро
        </div>
        {SOON.map(({ label, icon: Icon }) => (
          <div
            key={label}
            className="flex cursor-not-allowed items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-white/25"
            title="В следующей волне"
          >
            <Icon size={18} />
            {label}
          </div>
        ))}
      </nav>
      <div className="border-t border-white/10 px-5 py-4 text-xs text-white/40">
        Skyline Digital · Ташкент
      </div>
    </aside>
  );
}
