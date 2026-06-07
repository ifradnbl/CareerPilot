import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { tavily } from "@tavily/core";

export const runtime = "nodejs";

const ADZUNA_RESULTS_PER_PAGE = 8;
const ADZUNA_COUNTRY = "gb";
const ANTHROPIC_MODEL = "claude-3-5-sonnet-latest";
const FIT_MAX_TOKENS = 140;

type SearchBody = { query?: string };

type AdzunaJob = {
  id?: string | number;
  title?: string;
  company?: { display_name?: string };
  location?: { display_name?: string; area?: string[] };
  salary_min?: number | null;
  salary_max?: number | null;
  created?: string;
  redirect_url?: string;
  description?: string;
};

export type JobCard = {
  id: string;
  title: string;
  company: string;
  location: string;
  salary: string;
  deadline: string;
  url: string;
  description: string;
  fitReason: string;
};

function formatSalary(
  min: number | null | undefined,
  max: number | null | undefined
): string {
  if (!min && !max) return "Salary not listed";
  const fmt = (n: number) => Math.round(n).toLocaleString();
  if (min && max && min !== max) return `£${fmt(min)} – £${fmt(max)}`;
  const n = min ?? max ?? 0;
  return `£${fmt(n)}`;
}

function formatLocation(job: AdzunaJob): string {
  if (job.location?.display_name) return job.location.display_name;
  const area = job.location?.area;
  if (Array.isArray(area) && area.length) {
    return area.slice(-2).join(", ");
  }
  return "Location not listed";
}

function formatDeadline(created: string | undefined): string {
  if (!created) return "Deadline not listed";
  const d = new Date(created);
  if (Number.isNaN(d.getTime())) return "Deadline not listed";
  return d.toLocaleDateString("en-GB", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    timeZone: "UTC",
  });
}

async function generateFitReason(
  client: Anthropic,
  description: string,
  userQuery: string
): Promise<string> {
  if (!description) return "No description available to evaluate fit.";
  const trimmed =
    description.length > 1500 ? description.slice(0, 1500) + "…" : description;
  try {
    const res = await client.messages.create({
      model: ANTHROPIC_MODEL,
      max_tokens: FIT_MAX_TOKENS,
      system:
        "You write a single short sentence (max 30 words) explaining why a job matches a candidate's stated goal. Be concrete and reference specifics from the job description.",
      messages: [
        {
          role: "user",
          content: `In one sentence, explain why this job matches someone looking for: ${userQuery}\n\nJob description:\n${trimmed}`,
        },
      ],
    });
    const text =
      res.content
        ?.map((b) => (b.type === "text" ? b.text : ""))
        .join("")
        .trim() || "";
    return text || "Fit reason unavailable.";
  } catch {
    return "Fit reason unavailable.";
  }
}

async function fetchCompanySummary(
  tavilyClient: ReturnType<typeof tavily> | null,
  companyName: string
): Promise<string | null> {
  if (!tavilyClient || !companyName) return null;
  try {
    const result = await tavilyClient.search(
      `${companyName} company overview`,
      { max_results: 1, include_answer: true }
    );
    return result?.answer ?? null;
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  let body: SearchBody = {};
  try {
    body = (await req.json()) as SearchBody;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body." },
      { status: 400 }
    );
  }

  const query = (body.query ?? "").trim();
  if (!query) {
    return NextResponse.json(
      { error: "Query is required." },
      { status: 400 }
    );
  }

  const adzunaId = process.env.ADZUNA_APP_ID;
  const adzunaKey = process.env.ADZUNA_APP_KEY;
  if (!adzunaId || !adzunaKey) {
    return NextResponse.json(
      { error: "Server is missing ADZUNA_APP_ID / ADZUNA_APP_KEY." },
      { status: 500 }
    );
  }

  const adzunaUrl =
    `https://api.adzuna.com/v1/api/jobs/${ADZUNA_COUNTRY}/search/1` +
    `?app_id=${encodeURIComponent(adzunaId)}` +
    `&app_key=${encodeURIComponent(adzunaKey)}` +
    `&results_per_page=${ADZUNA_RESULTS_PER_PAGE}` +
    `&what=${encodeURIComponent(query)}` +
    `&content-type=application/json`;

  let rawJobs: AdzunaJob[] = [];
  try {
    const res = await fetch(adzunaUrl, {
      method: "GET",
      headers: { Accept: "application/json" },
      next: { revalidate: 300 },
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return NextResponse.json(
        { error: `Adzuna request failed (${res.status}): ${text.slice(0, 300)}` },
        { status: 502 }
      );
    }
    const data = (await res.json()) as { results?: AdzunaJob[] };
    rawJobs = Array.isArray(data.results) ? data.results : [];
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown network error";
    return NextResponse.json(
      { error: `Adzuna request failed: ${message}` },
      { status: 502 }
    );
  }

  const tavilyKey = process.env.TAVILY_API_KEY;
  const tavilyClient = tavilyKey ? tavily({ apiKey: tavilyKey }) : null;
  const companySummaries = await Promise.all(
    rawJobs.map((j) => fetchCompanySummary(tavilyClient, j.company?.display_name ?? ""))
  );

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  let anthropic: Anthropic | null = null;
  if (anthropicKey) anthropic = new Anthropic({ apiKey: anthropicKey });

  const fitReasons = await Promise.all(
    rawJobs.map((j) =>
      anthropic
        ? generateFitReason(anthropic, j.description ?? "", query)
        : Promise.resolve("Fit reason unavailable (ANTHROPIC_API_KEY not set).")
    )
  );

  const jobs: JobCard[] = rawJobs.map((j, idx) => {
    const company = j.company?.display_name ?? "Unknown company";
    const summary = companySummaries[idx];
    const description = j.description ?? "";
    const trimmedDesc = summary
      ? `${description}\n\nCompany: ${summary}`.trim()
      : description;

    return {
      id: j.id != null ? String(j.id) : `job-${idx}`,
      title: j.title ?? "Untitled role",
      company,
      location: formatLocation(j),
      salary: formatSalary(j.salary_min, j.salary_max),
      deadline: formatDeadline(j.created),
      url: j.redirect_url ?? "",
      description: trimmedDesc,
      fitReason: fitReasons[idx] ?? "Fit reason unavailable.",
    };
  });

  return NextResponse.json({ jobs });
}
