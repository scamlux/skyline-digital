import Link from "next/link";
import { Inbox, Calculator, FileText, Gauge, Radar } from "lucide-react";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function Header({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
    </div>
  );
}

const STATUS_STYLE: Record<string, string> = {
  NEW: "bg-blue-50 text-blue-700",
  IN_PROGRESS: "bg-amber-50 text-amber-700",
  PROPOSAL_SENT: "bg-violet-50 text-violet-700",
  NEGOTIATION: "bg-cyan-50 text-cyan-700",
  WON: "bg-emerald-50 text-emerald-700",
  LOST: "bg-gray-100 text-gray-500",
};

function fmtDate(s: string | null): string {
  if (!s) return "—";
  return s.slice(0, 10);
}

export default async function AdminDashboard() {
  if (!isSupabaseConfigured()) {
    return (
      <div className="p-8">
        <Header title="Обзор" />
        <p className="text-gray-500">Supabase не настроен.</p>
      </div>
    );
  }
  const db = getSupabaseAdmin();
  const head = { count: "exact" as const, head: true };
  const [leads, estimates, proposals, audits, radar] = await Promise.all([
    db.from("leads").select("id", head),
    db.from("estimates").select("id", head),
    db.from("proposals").select("id", head),
    db.from("audits").select("id", head),
    db.from("radar_companies").select("id", head).eq("discarded", false),
  ]);
  const { data: recentLeads } = await db
    .from("leads")
    .select("id,lead_number,client_name,project_type,status,source,calculated_price,created_at")
    .order("created_at", { ascending: false })
    .limit(8);

  const cards = [
    { label: "Заявки", value: leads.count ?? 0, icon: Inbox, href: "/admin/leads", color: "#2563eb" },
    { label: "Сметы", value: estimates.count ?? 0, icon: Calculator, href: "/admin/estimates", color: "#7c3aed" },
    { label: "КП", value: proposals.count ?? 0, icon: FileText, href: "/admin/estimates", color: "#db2777" },
    { label: "Аудиты", value: audits.count ?? 0, icon: Gauge, href: "/admin/audits", color: "#0891b2" },
    { label: "Радар-лиды", value: radar.count ?? 0, icon: Radar, href: "/admin/radar", color: "#ea580c" },
  ];

  return (
    <div className="p-8">
      <Header title="Обзор" subtitle="Сводка по заявкам, сметам, аудитам и радару" />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        {cards.map(({ label, value, icon: Icon, href, color }) => (
          <Link
            key={label}
            href={href}
            className="rounded-xl border border-gray-200 bg-white p-5 transition-shadow hover:shadow-md"
          >
            <Icon size={20} style={{ color }} />
            <div className="mt-3 text-3xl font-bold text-gray-900">{value}</div>
            <div className="text-sm text-gray-500">{label}</div>
          </Link>
        ))}
      </div>

      <div className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Последние заявки</h2>
          <Link href="/admin/leads" className="text-sm text-blue-600 hover:underline">Все →</Link>
        </div>
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase text-gray-500">
                <th className="p-3">№</th>
                <th className="p-3">Клиент</th>
                <th className="p-3">Тип</th>
                <th className="p-3">Источник</th>
                <th className="p-3">Статус</th>
                <th className="p-3">Дата</th>
              </tr>
            </thead>
            <tbody>
              {(recentLeads ?? []).map((l) => (
                <tr key={l.id} className="border-b border-gray-100">
                  <td className="p-3 font-mono text-xs text-gray-500">{l.lead_number}</td>
                  <td className="p-3 font-medium text-gray-900">{l.client_name ?? "—"}</td>
                  <td className="p-3 text-gray-600">{l.project_type ?? "—"}</td>
                  <td className="p-3 text-gray-600">{l.source ?? "—"}</td>
                  <td className="p-3">
                    <span className={`rounded px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[l.status] ?? "bg-gray-100 text-gray-500"}`}>
                      {l.status}
                    </span>
                  </td>
                  <td className="p-3 text-gray-500">{fmtDate(l.created_at)}</td>
                </tr>
              ))}
              {(!recentLeads || recentLeads.length === 0) && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-400">Заявок пока нет</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
