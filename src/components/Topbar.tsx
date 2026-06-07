export default function Topbar() {
  return (
    <header className="h-16 border-b border-slate-200 bg-white/80 backdrop-blur flex items-center justify-between px-6 lg:px-8">
      <div>
        <h1 className="text-sm text-slate-500">Welcome back</h1>
        <p className="text-base font-semibold text-slate-900">
          Let&apos;s get you closer to your next role 🚀
        </p>
      </div>
      <div className="flex items-center gap-3">
        <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium px-3 py-1">
          ● Online
        </span>
        <div className="h-9 w-9 rounded-full bg-brand-500 text-white grid place-items-center font-semibold">
          JD
        </div>
      </div>
    </header>
  );
}
