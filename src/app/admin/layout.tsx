import "../globals.css";
import type { Metadata } from "next";
import { AdminSidebar } from "./components/AdminSidebar";

export const metadata: Metadata = {
  title: "Skyline · Админка",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body className="antialiased">
        <div className="flex min-h-screen bg-gray-50 text-gray-900">
          <AdminSidebar />
          <main className="min-w-0 flex-1">{children}</main>
        </div>
      </body>
    </html>
  );
}
