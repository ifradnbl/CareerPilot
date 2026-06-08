# CareerPilot
<<<<<<< HEAD

> Your Agentic Career Co-pilot — built for the Poridhi Codesprint.

A Next.js 14 (App Router) front-end for the four pillars of CareerPilot:
**Job Hunter**, **Profile & Resume Intelligence (RAG)**, **Personal AI Assistant**, and
**Productivity & Progress Tracker**.

## Stack

- Next.js 14 (App Router, TypeScript)
- Tailwind CSS
- React 18

## Getting started

```bash
# from this folder
npm install
npm run dev
```

Open http://localhost:3000 — you'll be redirected to `/dashboard`.

## Routes

| Path         | Purpose                                                       |
| ------------ | ------------------------------------------------------------- |
| `/dashboard` | CV upload + progress stats + activity feed                    |
| `/jobs`      | Job Hunter Agent — natural-language search, fit-scored cards  |
| `/assistant` | RAG-grounded chat with conversational memory                  |
| `/tracker`   | Kanban application board + month calendar + to-do linked goals |

## Folder structure

```
src/
  app/
    layout.tsx          # root shell with Sidebar + Topbar
    page.tsx            # redirects to /dashboard
    globals.css         # Tailwind + custom scrollbar
    dashboard/page.tsx  # CV upload + progress dashboard
    jobs/page.tsx       # Job Hunter UI (cards + fit badges)
    assistant/page.tsx  # Chat UI with suggestions + typing indicator
    tracker/page.tsx    # Kanban + calendar + to-do
  components/
    Sidebar.tsx
    Topbar.tsx
    PageHeader.tsx
```

## Next steps (wiring real agents)

- `POST /api/cv/upload` — PDF/DOCX ingest → chunk by section → embed → vector DB
- `POST /api/jobs/search` — web search / job board API call
- `POST /api/assistant` — RAG query against the user's vector store
- `POST /api/tracker` — persist Kanban + to-dos to a database

See `Codesprint_poridhi.md` for the full problem statement.
=======
An AI-based job hunting platform, that only takes CV and desired job query from the user, and does the hectic job of analysing compatibility itself.
>>>>>>> f55af2667ee016f6d0389ec6a3d8f37755e6d6ef
