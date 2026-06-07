"use client";

import { useMemo, useState } from "react";
import PageHeader from "@/components/PageHeader";

type Column = "Applied" | "Interviewing" | "Offer" | "Rejected";
type App = { id: string; company: string; role: string; col: Column; date: string };
const INITIAL_APPS: App[] = [
  { id: "a1", company: "Pathao", role: "Frontend Engineer", col: "Applied", date: "Jun 02" },
  { id: "a2", company: "Brain Station 23", role: "ML Engineer Intern", col: "Interviewing", date: "Jun 03" },
  { id: "a3", company: "Selise", role: "Data Engineer Intern", col: "Applied", date: "Jun 04" },
  { id: "a4", company: "Google", role: "STEP Intern", col: "Rejected", date: "May 28" },
];

type Todo = { id: string; text: string; done: boolean };
const INITIAL_TODOS: Todo[] = [
  { id: "t1", text: "Apply to 5 jobs this week", done: true },
  { id: "t2", text: "Finish DSA graphs module", done: false },
  { id: "t3", text: "Update CV with Selise project", done: false },
  { id: "t4", text: "Mock interview Friday 4pm", done: false },
];

const COLUMNS: Column[] = ["Applied", "Interviewing", "Offer", "Rejected"];

export default function TrackerPage() {
  const [apps, setApps] = useState<App[]>(INITIAL_APPS);
  const [todos, setTodos] = useState<Todo[]>(INITIAL_TODOS);
  const [newTodo, setNewTodo] = useState("");
  const [goal, setGoal] = useState("Apply to 5 jobs this week");
  const [deadline, setDeadline] = useState("2026-06-10");

  function move(id: string, dir: 1 | -1) {
    setApps((list) =>
      list.map((a) => {
        if (a.id !== id) return a;
        const idx = COLUMNS.indexOf(a.col);
        const next = COLUMNS[Math.max(0, Math.min(COLUMNS.length - 1, idx + dir))];
        return { ...a, col: next };
      })
    );
  }

  function addTodo() {
    const t = newTodo.trim();
    if (!t) return;
    setTodos((td) => [...td, { id: crypto.randomUUID(), text: t, done: false }]);
    setNewTodo("");
  }

  const monthLabel = useMemo(
    () =>
      new Date(2026, 5, 1).toLocaleString("en-US", { month: "long", year: "numeric" }),
    []
  );

  // Build a simple June 2026 grid (starts Monday)
  const days = useMemo(() => {
    const first = new Date(2026, 5, 1);
    const startWeekday = (first.getDay() + 6) % 7; // Mon=0
    const totalDays = 30;
    const cells: ({ day: number; events: string[] } | null)[] = [];
    for (let i = 0; i < startWeekday; i++) cells.push(null);
    for (let d = 1; d <= totalDays; d++) {
      const events: string[] = [];
      apps.forEach((a) => {
        if (a.date.includes(`Jun ${String(d).padStart(2, "0")}`.slice(4))) {
          events.push(`${a.company}: ${a.role}`);
        }
      });
      todos.forEach((t) => {
        if (!t.done && deadline.endsWith(`-${String(d).padStart(2, "0")}`)) {
          events.push(`🎯 ${goal}`);
        }
      });
      cells.push({ day: d, events });
    }
    return cells;
  }, [apps, todos, deadline, goal]);

  return (
    <div>
      <PageHeader
        title="Productivity & Progress Tracker"
        description="Kanban for applications, calendar for deadlines, and to-dos tied to your goals."
      />

      {/* Kanban */}
      <section className="mb-8">
        <h3 className="font-semibold text-slate-900 mb-3">Application Kanban</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          {COLUMNS.map((c) => {
            const items = apps.filter((a) => a.col === c);
            const accent =
              c === "Applied"
                ? "border-t-blue-400"
                : c === "Interviewing"
                ? "border-t-amber-400"
                : c === "Offer"
                ? "border-t-emerald-400"
                : "border-t-rose-400";
            return (
              <div
                key={c}
                className={`rounded-2xl border border-slate-200 border-t-4 ${accent} bg-white p-3 min-h-[200px]`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-semibold text-slate-700">{c}</h4>
                  <span className="text-xs text-slate-400">{items.length}</span>
                </div>
                <div className="space-y-2">
                  {items.map((a) => (
                    <div
                      key={a.id}
                      className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm"
                    >
                      <p className="font-medium text-slate-800">{a.role}</p>
                      <p className="text-xs text-slate-500">{a.company} · {a.date}</p>
                      <div className="mt-2 flex gap-1">
                        <button
                          onClick={() => move(a.id, -1)}
                          className="text-xs px-2 py-0.5 rounded border border-slate-200 hover:bg-white"
                        >
                          ←
                        </button>
                        <button
                          onClick={() => move(a.id, 1)}
                          className="text-xs px-2 py-0.5 rounded border border-slate-200 hover:bg-white"
                        >
                          →
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Calendar */}
        <section className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-slate-900">Calendar — {monthLabel}</h3>
            <span className="text-xs text-slate-400">Click a day to view deadlines</span>
          </div>
          <div className="grid grid-cols-7 gap-1 text-xs text-slate-500 mb-1">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
              <div key={d} className="px-2 py-1 font-medium">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {days.map((cell, i) =>
              cell ? (
                <div
                  key={i}
                  className="aspect-square rounded-md border border-slate-100 bg-slate-50/40 p-1.5 text-xs flex flex-col"
                >
                  <span className="text-slate-500">{cell.day}</span>
                  {cell.events.slice(0, 2).map((e, j) => (
                    <span
                      key={j}
                      className="mt-0.5 truncate rounded bg-brand-50 text-brand-700 px-1"
                      title={e}
                    >
                      {e}
                    </span>
                  ))}
                </div>
              ) : (
                <div key={i} />
              )
            )}
          </div>
        </section>

        {/* Goals + To-do */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h3 className="font-semibold text-slate-900 mb-3">Weekly Goal</h3>
          <div className="space-y-2 mb-4">
            <input
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <h3 className="font-semibold text-slate-900 mb-2">To-do</h3>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              addTodo();
            }}
            className="flex gap-2 mb-3"
          >
            <input
              value={newTodo}
              onChange={(e) => setNewTodo(e.target.value)}
              placeholder="Add a task…"
              className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <button className="rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-sm px-3">
              +
            </button>
          </form>
          <ul className="space-y-2">
            {todos.map((t) => (
              <li key={t.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={t.done}
                  onChange={() =>
                    setTodos((td) =>
                      td.map((x) => (x.id === t.id ? { ...x, done: !x.done } : x))
                    )
                  }
                  className="h-4 w-4 rounded border-slate-300 text-brand-500 focus:ring-brand-500"
                />
                <span className={t.done ? "line-through text-slate-400" : "text-slate-700"}>
                  {t.text}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
