"use client";

import { useRef, useState, KeyboardEvent } from "react";

type UploadStatus = "idle" | "uploading" | "success" | "error";

type UploadResult = {
  success: boolean;
  chunks_stored?: number;
  error?: string;
};

type ChatRole = "user" | "assistant";

type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  sections?: string[];
  pending?: boolean;
};

type SectionKey = "Experience" | "Education" | "Skills" | "Projects";

const SECTIONS: SectionKey[] = [
  "Experience",
  "Education",
  "Skills",
  "Projects",
];

const ACCEPTED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
const ACCEPTED_EXTENSIONS = [".pdf", ".docx"];

function isAcceptedFile(file: File): boolean {
  if (ACCEPTED_TYPES.includes(file.type)) return true;
  const name = file.name.toLowerCase();
  return ACCEPTED_EXTENSIONS.some((ext) => name.endsWith(ext));
}

function fileBaseName(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot > 0 ? name.slice(0, dot) : name;
}

export default function CvIntelligencePage() {
  // ---------- Upload state ----------
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>("idle");
  const [uploadError, setUploadError] = useState<string>("");
  const [chunksStored, setChunksStored] = useState<number>(0);
  const [fileTypeError, setFileTypeError] = useState<string>("");
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // ---------- Chat state ----------
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState<string>("");
  const [chatError, setChatError] = useState<string>("");
  const chatScrollRef = useRef<HTMLDivElement | null>(null);

  // ---------- Section sidebar state ----------
  const [indexedSections, setIndexedSections] = useState<Set<SectionKey>>(
    new Set<SectionKey>()
  );

  const uploadComplete = uploadStatus === "success";

  // ---------- File selection ----------
  const handleFileSelected = (file: File | null) => {
    setFileTypeError("");
    if (!file) return;
    if (!isAcceptedFile(file)) {
      setSelectedFile(null);
      setFileTypeError("Only PDF and DOCX files are supported.");
      return;
    }
    setSelectedFile(file);
    setUploadStatus("idle");
    setUploadError("");
  };

  const onBrowseClick = () => {
    fileInputRef.current?.click();
  };

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    handleFileSelected(file);
  };

  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0] ?? null;
    handleFileSelected(file);
  };

  // ---------- Upload ----------
  const onUpload = async () => {
    if (!selectedFile) return;
    setUploadStatus("uploading");
    setUploadError("");

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const response = await fetch("/api/cv/upload", {
        method: "POST",
        body: formData,
      });

      const data: UploadResult = await response
        .json()
        .catch(() => ({ success: false }));

      if (!response.ok || !data.success) {
        setUploadStatus("error");
        setUploadError(
          data.error || `Upload failed with status ${response.status}.`
        );
        return;
      }

      const chunks = typeof data.chunks_stored === "number" ? data.chunks_stored : 0;
      setChunksStored(chunks);
      setUploadStatus("success");

      // Show all four sections as indexed after successful upload
      setIndexedSections(new Set<SectionKey>(SECTIONS));
    } catch (err) {
      setUploadStatus("error");
      setUploadError(
        err instanceof Error ? err.message : "Network error during upload."
      );
    }
  };

  // ---------- Chat ----------
  const scrollChatToBottom = () => {
    requestAnimationFrame(() => {
      if (chatScrollRef.current) {
        chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
      }
    });
  };

  const sendQuestion = async () => {
    const text = draft.trim();
    if (!text || !uploadComplete) return;

    setChatError("");
    setDraft("");

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
    };
    const pendingMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: "",
      pending: true,
    };
    setMessages((prev) => [...prev, userMsg, pendingMsg]);
    scrollChatToBottom();

    try {
      const response = await fetch("/api/cv/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: text,
          user_id: "user_001",
        }),
      });

      const data = await response.json().catch(() => ({}));
      const answer: string = (data?.answer ?? data?.reply ?? "").toString();
      const sectionsRaw: unknown = data?.sections ?? data?.sources;
      const sections: string[] = Array.isArray(sectionsRaw)
        ? sectionsRaw.filter((s): s is string => typeof s === "string")
        : [];

      if (!response.ok || !answer) {
        const errText =
          (data?.error as string) || `Request failed with status ${response.status}.`;
        setChatError(errText);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === pendingMsg.id
              ? { ...m, content: errText, pending: false }
              : m
          )
        );
        return;
      }

      setMessages((prev) =>
        prev.map((m) =>
          m.id === pendingMsg.id
            ? { ...m, content: answer, sections, pending: false }
            : m
        )
      );
      scrollChatToBottom();
    } catch (err) {
      const errText =
        err instanceof Error ? err.message : "Network error asking question.";
      setChatError(errText);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === pendingMsg.id
            ? { ...m, content: errText, pending: false }
            : m
        )
      );
    }
  };

  const onSendClick = () => {
    void sendQuestion();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void sendQuestion();
    }
  };

  // ---------- Render ----------
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">
            CV Intelligence
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Upload your CV to index it for RAG-powered search, then chat with
            your profile to surface skills, gaps, and talking points.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* LEFT + CENTER: Upload + Chat */}
          <div className="space-y-6 lg:col-span-2">
            {/* Section 1 — Upload Panel */}
            <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold">1. Upload your CV</h2>
                {selectedFile && (
                  <span className="text-xs text-slate-400">
                    {fileBaseName(selectedFile.name)}
                    {selectedFile.name.toLowerCase().endsWith(".pdf")
                      ? ".pdf"
                      : selectedFile.name.toLowerCase().endsWith(".docx")
                      ? ".docx"
                      : ""}
                  </span>
                )}
              </div>

              <div
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                className={[
                  "flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center transition-colors",
                  isDragging
                    ? "border-indigo-400 bg-indigo-500/5"
                    : "border-slate-700 bg-slate-900",
                ].join(" ")}
              >
                <div className="mb-2 text-2xl">📄</div>
                <p className="text-sm text-slate-300">
                  Drag & drop your CV here
                </p>
                <p className="mt-1 text-xs text-slate-500">PDF or DOCX only</p>

                <button
                  type="button"
                  onClick={onBrowseClick}
                  disabled={uploadStatus === "uploading"}
                  className="mt-4 rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-slate-100 ring-1 ring-slate-700 transition hover:bg-slate-700 disabled:opacity-50"
                >
                  Browse File
                </button>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  className="hidden"
                  onChange={onInputChange}
                />

                {selectedFile && (
                  <p className="mt-3 text-xs text-slate-400">
                    Selected:{" "}
                    <span className="font-medium text-slate-200">
                      {selectedFile.name}
                    </span>
                  </p>
                )}
              </div>

              {fileTypeError && (
                <p className="mt-3 text-sm text-red-400">{fileTypeError}</p>
              )}

              <div className="mt-4 flex items-center gap-3">
                <button
                  type="button"
                  onClick={onUpload}
                  disabled={
                    !selectedFile ||
                    uploadStatus === "uploading" ||
                    !!fileTypeError
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {uploadStatus === "uploading" && (
                    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  )}
                  {uploadStatus === "uploading"
                    ? "Processing your CV..."
                    : "Upload & Analyze"}
                </button>

                {selectedFile && uploadStatus !== "uploading" && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedFile(null);
                      setUploadStatus("idle");
                      setUploadError("");
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                    className="text-xs text-slate-400 hover:text-slate-200"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Upload status messages */}
              <div className="mt-4 min-h-[1.5rem]">
                {uploadStatus === "success" && (
                  <div className="flex items-center gap-2 rounded-lg border border-emerald-700/40 bg-emerald-900/20 px-3 py-2 text-sm text-emerald-300">
                    <span className="text-base">✅</span>
                    <span>
                      CV uploaded! {chunksStored} section
                      {chunksStored === 1 ? "" : "s"} indexed.
                    </span>
                  </div>
                )}
                {uploadStatus === "error" && (
                  <div className="flex items-center gap-2 rounded-lg border border-red-700/40 bg-red-900/20 px-3 py-2 text-sm text-red-300">
                    <span className="text-base">⚠️</span>
                    <span>
                      Upload failed. Please try again.
                      {uploadError ? ` (${uploadError})` : ""}
                    </span>
                  </div>
                )}
              </div>
            </section>

            {/* Section 2 — Q&A Chat */}
            {uploadComplete && (
              <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-semibold">
                    2. Chat with your CV
                  </h2>
                  <span className="text-xs text-slate-500">
                    RAG over your indexed sections
                  </span>
                </div>

                <div
                  ref={chatScrollRef}
                  className="max-h-[420px] min-h-[260px] space-y-3 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950/60 p-4"
                >
                  {messages.length === 0 && (
                    <div className="flex h-full min-h-[200px] flex-col items-center justify-center text-center text-slate-500">
                      <p className="text-sm">
                        Ask anything about your CV — strengths, gaps,
                        experience highlights, projects, education.
                      </p>
                      <p className="mt-2 text-xs text-slate-600">
                        Try: "What are my strongest skills?"
                      </p>
                    </div>
                  )}

                  {messages.map((m) =>
                    m.role === "user" ? (
                      <div
                        key={m.id}
                        className="flex justify-end"
                      >
                        <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-indigo-600 px-3 py-2 text-sm text-white shadow-sm">
                          {m.content}
                        </div>
                      </div>
                    ) : (
                      <div key={m.id} className="flex justify-start">
                        <div className="max-w-[85%] rounded-2xl rounded-bl-sm bg-slate-800 px-3 py-2 text-sm text-slate-100 shadow-sm">
                          {m.pending ? (
                            <span className="inline-flex items-center gap-2 text-slate-400">
                              <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-slate-500 border-t-slate-200" />
                              Thinking...
                            </span>
                          ) : (
                            <>
                              <p className="whitespace-pre-wrap">
                                {m.content}
                              </p>
                              {m.sections && m.sections.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-1">
                                  <span className="text-[10px] uppercase tracking-wide text-slate-500">
                                    Sources:
                                  </span>
                                  {m.sections.map((s) => (
                                    <span
                                      key={s}
                                      className="rounded-full bg-slate-700/70 px-2 py-0.5 text-[10px] text-slate-200"
                                    >
                                      {s}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    )
                  )}

                  {chatError && (
                    <div className="rounded-lg border border-red-700/40 bg-red-900/20 px-3 py-2 text-xs text-red-300">
                      {chatError}
                    </div>
                  )}
                </div>

                <div className="mt-3 flex items-end gap-2">
                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={onKeyDown}
                    placeholder="Ask about your CV... e.g. What are my strongest skills?"
                    rows={1}
                    className="min-h-[44px] flex-1 resize-none rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={onSendClick}
                    disabled={!draft.trim()}
                    className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Send
                  </button>
                </div>
                <p className="mt-2 text-[11px] text-slate-500">
                  Press Enter to send · Shift + Enter for a new line
                </p>
              </section>
            )}
          </div>

          {/* Section 3 — Summary Sidebar */}
          <aside className="space-y-6">
            <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-sm">
              <h2 className="text-lg font-semibold">CV Sections</h2>
              <p className="mt-1 text-xs text-slate-500">
                {uploadComplete
                  ? "Sections detected in your CV and indexed in the vector store."
                  : "Upload a CV to see indexed sections here."}
              </p>

              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1">
                {SECTIONS.map((section) => {
                  const indexed = indexedSections.has(section);
                  return (
                    <div
                      key={section}
                      className={[
                        "flex items-center justify-between rounded-xl border px-3 py-3 transition",
                        indexed
                          ? "border-emerald-700/40 bg-emerald-900/10"
                          : "border-slate-800 bg-slate-950/40",
                      ].join(" ")}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={[
                            "flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold",
                            indexed
                              ? "bg-emerald-500/20 text-emerald-300"
                              : "bg-slate-800 text-slate-500",
                          ].join(" ")}
                        >
                          {section.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-100">
                            {section}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            {indexed ? "Ready for retrieval" : "Pending upload"}
                          </p>
                        </div>
                      </div>

                      <span
                        className={[
                          "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
                          indexed
                            ? "bg-emerald-500/15 text-emerald-300"
                            : "bg-slate-800 text-slate-500",
                        ].join(" ")}
                      >
                        {indexed ? "Indexed ✓" : "Not indexed"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 text-xs text-slate-400 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-200">
                How this works
              </h3>
              <ol className="mt-3 list-decimal space-y-1 pl-4">
                <li>Your CV is chunked by section (Experience, Education, ...).</li>
                <li>Chunks are embedded and stored in ChromaDB.</li>
                <li>
                  Each chat question retrieves the most relevant chunks and
                  answers using your real profile.
                </li>
              </ol>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
