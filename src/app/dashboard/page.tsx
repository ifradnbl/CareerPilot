"use client";

import { useState } from "react";
import PageHeader from "@/components/PageHeader";

type Stat = { label: string; value: string; delta?: string; icon: string };
const stats: Stat[] = [
  { label: "Applications sent", value: "12", delta: "+3 this week", icon: "📨" },
  { label: "Skills tracked", value: "24", delta: "+2 added", icon: "🧠" },
  { label: "Roadmap progress", value: "68%", delta: "12% this month", icon: "🗺️" },
  { label: "Streak", value: "5 days", delta: "Keep it up!", icon: "🔥" },
];

export default function DashboardPage() {
  const [cvName, setCvName] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  function handleFile(file: File) {
    setUploading(true);
    // Placeholder for real upload → chunk → embed → vector DB pipeline
    setTimeout(() => {
      setCvName(file.name);
      setUploading(false);
    }, 800);
  }

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Your career command center — upload your CV and watch the agents get to work."
        action={
          <label className="inline-flex items-center gap-2 rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium px-4 py-2 cursor-pointer shadow-sm">
            <input
              type="file"
              accept=".pdf,.docx,.doc"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
            />
            {uploading ? "Uploading…" : "⬆ Upload CV"}
          </label>
        }
      />

      {/* CV upload card */}
      <section className="mb-8 rounded-2xl border border-dashed border-brand-200 bg-brand-50/40 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h3 className="font-semibold text-slate-900">Profile & Resume Intelligence</h3>
            <p className="text-sm text-slate-600 mt-1">
              Your CV is the single source of truth. We chunk it by section, embed it,
              and store it in a vector DB so every agent grounds its answers in your real
              experience.
            </p>
          </div>
          <div className="text-sm">
            {cvName ? (
              <span className="inline-flex items-center gap-2 rounded-md bg-emerald-50 text-emerald-700 px-3 py-1.5 font-medium">
                ✓ {cvName} indexed
              </span>
            ) : (
              <span className="inline-flex items-center gap-2 rounded-md bg-white text-slate-500 px-3 py-1.5 border border-slate-200">
                No CV uploaded yet
              </span>
            )}
          </div>
        </div>
      </section>

      {/* Stats grid */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">{s.label}</p>
              <span className="text-xl">{s.icon}</span>
            </div>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{s.value}</p>
            {s.delta ? (
              <p className="text-xs text-slate-500 mt-1">{s.delta}</p>
            ) : null}
          </div>
        ))}
      </section>

      {/* Activity feed */}
      <section className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-5">
          <h3 className="font-semibold text-slate-900 mb-4">This week</h3>
          <ul className="space-y-3 text-sm">
            <li className="flex items-center justify-between">
              <span>Applied to <b>Frontend Engineer</b> at Pathao</span>
              <span className="text-slate-400">Mon</span>
            </li>
            <li className="flex items-center justify-between">
              <span>Completed <b>DSA week 3</b> roadmap module</span>
              <span className="text-slate-400">Tue</span>
            </li>
            <li className="flex items-center justify-between">
              <span>AI assistant drafted cover letter for <b>Google STEP</b></span>
              <span className="text-slate-400">Wed</span>
            </li>
            <li className="flex items-center justify-between">
              <span>Skill gap detected: <b>Kubernetes</b></span>
              <span className="text-slate-400">Thu</span>
            </li>
          </ul>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h3 className="font-semibold text-slate-900 mb-3">AI Nudges</h3>
          <div className="rounded-lg bg-amber-50 text-amber-800 p-3 text-sm">
            You haven&apos;t applied this week. Here are 3 openings matching your profile.
          </div>
        </div>
      </section>
    </div>
  );
}
