"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: "📊" },
  { href: "/jobs", label: "Job Hunter", icon: "🎯" },
  { href: "/assistant", label: "AI Assistant", icon: "🤖" },
  { href: "/tracker", label: "Tracker", icon: "🗂️" },
];

export default function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="hidden md:flex w-64 flex-col border-r border-slate-200 bg-white">
      <div className="px-6 py-5 border-b border-slate-200">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-lg bg-brand-500 grid place-items-center text-white font-bold">
            CP
          </div>
          <div>
            <p className="font-semibold text-slate-900 leading-tight">CareerPilot</p>
            <p className="text-xs text-slate-500">Agentic Co-pilot</p>
          </div>
        </Link>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {nav.map((item) => {
          const active = pathname?.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition ${
                active
                  ? "bg-brand-50 text-brand-700 font-medium"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-slate-200 text-xs text-slate-500">
        <p className="font-medium text-slate-700">CV status</p>
        <p className="mt-1">Not uploaded</p>
      </div>
    </aside>
  );
}
