"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import PageHeader from "@/components/PageHeader";

type Role = "user" | "assistant";
type Message = { id: string; role: Role; content: string };
type Conversation = {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
};

const SUGGESTIONS = [
  "Am I ready for a data engineer role?",
  "What skills am I missing for a Google internship?",
  "Build me a 3-month roadmap to become job-ready",
  "Draft a cover letter for this job posting",
];

const STORAGE_KEY = "careerpilot:conversations";
const ACTIVE_KEY = "careerpilot:activeConversationId";

function newConversation(): Conversation {
  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    title: "New conversation",
    messages: [
      {
        id: crypto.randomUUID(),
        role: "assistant",
        content:
          "Hi! I'm your CareerPilot assistant. I've already read your CV — ask me anything about fit, skill gaps, roadmaps, or cover letters.",
      },
    ],
    createdAt: now,
    updatedAt: now,
  };
}

function loadConversations(): Conversation[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Conversation[];
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

function saveConversations(list: Conversation[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

function deriveTitle(text: string): string {
  const t = text.trim().replace(/\s+/g, " ");
  if (!t) return "New conversation";
  return t.length > 48 ? t.slice(0, 45) + "…" : t;
}

export default function AssistantPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Hydrate from localStorage once on mount
  useEffect(() => {
    const stored = loadConversations();
    if (stored.length > 0) {
      setConversations(stored);
      const savedActive = window.localStorage.getItem(ACTIVE_KEY);
      const exists = savedActive && stored.some((c) => c.id === savedActive);
      setActiveId(exists ? savedActive : stored[0].id);
    } else {
      const fresh = newConversation();
      setConversations([fresh]);
      setActiveId(fresh.id);
    }
    setHydrated(true);
  }, []);

  // Persist whenever conversations or activeId change (after hydration)
  useEffect(() => {
    if (!hydrated) return;
    saveConversations(conversations);
    if (activeId) window.localStorage.setItem(ACTIVE_KEY, activeId);
  }, [conversations, activeId, hydrated]);

  const active = useMemo(
    () => conversations.find((c) => c.id === activeId) ?? null,
    [conversations, activeId]
  );

  // Auto-scroll to bottom on new messages / thinking
  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [active?.messages.length, thinking, activeId]);

  function newChat() {
    const c = newConversation();
    setConversations((prev) => [c, ...prev]);
    setActiveId(c.id);
    setInput("");
  }

  function selectConversation(id: string) {
    setActiveId(id);
    setInput("");
  }

  function deleteConversation(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    setConversations((prev) => {
      const next = prev.filter((c) => c.id !== id);
      if (id === activeId) {
        const fallback = next[0] ?? null;
        setActiveId(fallback ? fallback.id : null);
        if (!fallback) {
          const fresh = newConversation();
          return [fresh];
        }
      }
      return next;
    });
  }

  async function send(text?: string) {
    const trimmed = (text ?? input).trim();
    if (!trimmed || !active || thinking) return;

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmed,
    };

    // Optimistic update — append user message and clear input
    setConversations((prev) =>
      prev.map((c) => {
        if (c.id !== active.id) return c;
        const isFirstUser = !c.messages.some((m) => m.role === "user");
        return {
          ...c,
          title: isFirstUser ? deriveTitle(trimmed) : c.title,
          messages: [...c.messages, userMsg],
          updatedAt: Date.now(),
        };
      })
    );
    setInput("");
    setThinking(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: active.id,
          messages: [...active.messages, userMsg].map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      // Always try to parse the body, even on !ok, so we can show the real
      // server-side error message instead of a generic fallback.
      const raw = await res.text();
      let data: { reply?: string; error?: string; detail?: string } = {};
      try {
        data = raw ? JSON.parse(raw) : {};
      } catch {
        data = { error: `Non-JSON response (${res.status}): ${raw.slice(0, 200)}` };
      }

      if (!res.ok) {
        throw new Error(
          data.error ||
            data.detail ||
            `Assistant service returned ${res.status}.`
        );
      }

      if (!data.reply) {
        throw new Error("Assistant service returned an empty reply.");
      }

      const assistantMsg: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.reply,
      };

      setConversations((prev) =>
        prev.map((c) =>
          c.id === active.id
            ? { ...c, messages: [...c.messages, assistantMsg], updatedAt: Date.now() }
            : c
        )
      );
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      const fallback: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: `⚠️ Couldn't reach the assistant service.\n\n${reason}\n\nTip: open \`/api/chat?ping=1\` in a new tab — it should return \`{ ok: true, hasKey: true }\`. If \`hasKey\` is \`false\`, set \`ANTHROPIC_API_KEY\` in \`careerpilot/.env.local\` and restart \`npm run dev\`.`,
      };
      setConversations((prev) =>
        prev.map((c) =>
          c.id === active.id
            ? { ...c, messages: [...c.messages, fallback], updatedAt: Date.now() }
            : c
        )
      );
      // eslint-disable-next-line no-console
      console.error("[/api/chat]", err);
    } finally {
      setThinking(false);
      inputRef.current?.focus();
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)]">
      <PageHeader
        title="AI Assistant"
        description="Conversational, RAG-grounded, and remembers your session."
      />

      <div className="flex flex-1 min-h-0 rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {/* Sidebar — conversation list */}
        <aside className="hidden md:flex w-72 flex-col border-r border-slate-200 bg-slate-50/60">
          <div className="p-3 border-b border-slate-200">
            <button
              onClick={newChat}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium px-3 py-2 shadow-sm"
            >
              <span className="text-base leading-none">＋</span> New chat
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {conversations.length === 0 ? (
              <p className="text-xs text-slate-400 px-2 py-3">No conversations yet.</p>
            ) : (
              [...conversations]
                .sort((a, b) => b.updatedAt - a.updatedAt)
                .map((c) => {
                  const isActive = c.id === activeId;
                  return (
                    <button
                      key={c.id}
                      onClick={() => selectConversation(c.id)}
                      className={`group w-full text-left rounded-lg px-3 py-2.5 transition border ${
                        isActive
                          ? "bg-white border-slate-200 shadow-sm"
                          : "border-transparent hover:bg-white"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p
                            className={`text-sm truncate ${
                              isActive ? "font-semibold text-slate-900" : "text-slate-700"
                            }`}
                            title={c.title}
                          >
                            {c.title}
                          </p>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            {c.messages.length} message
                            {c.messages.length === 1 ? "" : "s"} ·{" "}
                            {formatRelative(c.updatedAt)}
                          </p>
                        </div>
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={(e) => deleteConversation(c.id, e)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              deleteConversation(c.id, e as unknown as React.MouseEvent);
                            }
                          }}
                          className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-500 text-xs px-1.5 py-0.5 rounded cursor-pointer"
                          aria-label="Delete conversation"
                          title="Delete"
                        >
                          ✕
                        </span>
                      </div>
                    </button>
                  );
                })
            )}
          </div>
          <div className="p-3 border-t border-slate-200 text-[11px] text-slate-500">
            Stored locally in your browser. Connect a backend to sync.
          </div>
        </aside>

        {/* Main chat area */}
        <section className="flex-1 flex flex-col min-w-0">
          {/* Mobile-only new chat */}
          <div className="md:hidden p-3 border-b border-slate-200 flex justify-end">
            <button
              onClick={newChat}
              className="rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-xs font-medium px-3 py-1.5"
            >
              ＋ New chat
            </button>
          </div>

          <div
            ref={scrollRef}
            className="chat-scroll flex-1 overflow-y-auto px-4 sm:px-6 py-6 space-y-5 bg-gradient-to-b from-white to-slate-50"
          >
            {!active || active.messages.length === 0 ? (
              <EmptyState />
            ) : (
              active.messages.map((m) => <Bubble key={m.id} msg={m} />)
            )}
            {thinking ? <TypingBubble /> : null}
          </div>

          {/* Suggestions */}
          {active && active.messages.length <= 1 ? (
            <div className="px-4 sm:px-6 pb-2 flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="text-xs rounded-full border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-300 px-3 py-1.5 transition"
                >
                  {s}
                </button>
              ))}
            </div>
          ) : null}

          {/* Composer */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
            className="border-t border-slate-200 bg-white p-3 sm:p-4"
          >
            <div className="flex items-end gap-2 rounded-xl border border-slate-200 bg-slate-50 focus-within:ring-2 focus-within:ring-brand-500 focus-within:border-transparent transition">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                rows={1}
                placeholder="Ask anything about your career…"
                className="flex-1 resize-none bg-transparent px-3 py-2.5 text-sm focus:outline-none max-h-40"
                disabled={thinking}
              />
              <button
                type="submit"
                disabled={thinking || !input.trim()}
                className="m-1.5 inline-flex items-center gap-1.5 rounded-lg bg-brand-500 hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium px-4 py-2"
              >
                <span>Send</span>
                <span aria-hidden>→</span>
              </button>
            </div>
            <p className="mt-2 text-[11px] text-slate-400 text-center">
              Press <kbd className="px-1 py-0.5 rounded border border-slate-200 bg-white">Enter</kbd>{" "}
              to send,{" "}
              <kbd className="px-1 py-0.5 rounded border border-slate-200 bg-white">Shift</kbd>
              +<kbd className="px-1 py-0.5 rounded border border-slate-200 bg-white">Enter</kbd> for
              a new line.
            </p>
          </form>
        </section>
      </div>
    </div>
  );
}

function Bubble({ msg }: { msg: Message }) {
  const isUser = msg.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`flex items-end gap-2 max-w-[85%]`}>
        {!isUser && (
          <div className="hidden sm:grid h-8 w-8 rounded-full bg-brand-500 text-white text-xs font-semibold place-items-center shrink-0">
            AI
          </div>
        )}
        <div
          className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words ${
            isUser
              ? "bg-brand-500 text-white rounded-br-sm"
              : "bg-white text-slate-800 border border-slate-200 rounded-bl-sm shadow-sm"
          }`}
        >
          {msg.content}
        </div>
        {isUser && (
          <div className="hidden sm:grid h-8 w-8 rounded-full bg-slate-200 text-slate-700 text-xs font-semibold place-items-center shrink-0">
            You
          </div>
        )}
      </div>
    </div>
  );
}

function TypingBubble() {
  return (
    <div className="flex justify-start">
      <div className="flex items-end gap-2 max-w-[85%]">
        <div className="hidden sm:grid h-8 w-8 rounded-full bg-brand-500 text-white text-xs font-semibold place-items-center shrink-0">
          AI
        </div>
        <div className="rounded-2xl rounded-bl-sm bg-white border border-slate-200 px-4 py-3 text-sm text-slate-500 shadow-sm">
          <span className="inline-flex gap-1">
            <span className="animate-bounce">●</span>
            <span className="animate-bounce [animation-delay:120ms]">●</span>
            <span className="animate-bounce [animation-delay:240ms]">●</span>
          </span>
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="h-full grid place-items-center text-center py-16">
      <div>
        <div className="mx-auto h-12 w-12 rounded-2xl bg-brand-50 text-brand-600 grid place-items-center text-2xl">
          💬
        </div>
        <h3 className="mt-4 font-semibold text-slate-900">Start a new conversation</h3>
        <p className="mt-1 text-sm text-slate-500 max-w-sm">
          Ask about fit, skill gaps, roadmaps, or request a cover letter. Your history is saved
          on this device.
        </p>
      </div>
    </div>
  );
}

function formatRelative(ts: number): string {
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const d = Math.floor(hr / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(ts).toLocaleDateString();
}
