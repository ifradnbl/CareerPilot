"use client";

import { useState, type FormEvent } from "react";
import PageHeader from "@/components/PageHeader";

type Job = {
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

export default function JobsPage() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Job[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  async function runSearch(e: FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;

    setLoading(true);
    setError(null);
    setSearched(true);

    try {
      const res = await fetch("/api/job-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `Request failed (${res.status})`);
      }

      const data = (await res.json()) as { jobs?: Job[] };
      setResults(Array.isArray(data.jobs) ? data.jobs : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Job Hunter Agent"
        description="Describe what you want in plain English. The agent searches, filters, and scores fit against your CV."
      />

      {/* Search bar */}
      <form
        onSubmit={runSearch}
        className="flex flex-col sm:flex-row gap-3 mb-6 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm"
      >
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder='e.g. "ML internships in London" or "Data engineer remote"'
          className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white text-sm font-medium px-5 py-2.5"
        >
          {loading ? "Hunting…" : "🔎 Search"}
        </button>
      </form>

      {/* Error */}
      {error && (
        <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {error}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="animate-pulse rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="h-4 w-3/4 rounded bg-slate-200 mb-3" />
              <div className="h-3 w-1/2 rounded bg-slate-100 mb-2" />
              <div className="h-3 w-2/3 rounded bg-slate-100 mb-4" />
              <div className="h-3 w-full rounded bg-slate-100 mb-2" />
              <div className="h-3 w-5/6 rounded bg-slate-100" />
            </div>
          ))}
        </div>
      )}

      {/* Empty state — before any search */}
      {!loading && !searched && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <span className="text-5xl mb-4">🔍</span>
          <h3 className="text-lg font-semibold text-slate-700 mb-1">
            No search yet
          </h3>
          <p className="text-sm text-slate-500 max-w-md">
            Type a plain-English query above — e.g. &ldquo;ML internships in
            London&rdquo; — and the agent will search real job boards, score
            fit, and show you the best matches.
          </p>
        </div>
      )}

      {/* Empty state — after search with no results */}
      {!loading && searched && results.length === 0 && !error && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <span className="text-5xl mb-4">🤷</span>
          <h3 className="text-lg font-semibold text-slate-700 mb-1">
            No jobs found
          </h3>
          <p className="text-sm text-slate-500 max-w-md">
            Try broadening your query or using different keywords.
          </p>
        </div>
      )}

      {/* Results grid */}
      {!loading && results.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {results.map((job) => (
            <article
              key={job.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold text-slate-900">{job.title}</h3>
                  <p className="text-sm text-slate-500">
                    {job.company} · {job.location}
                  </p>
                </div>
              </div>

              <dl className="mt-4 grid grid-cols-2 gap-2 text-xs text-slate-600">
                <div>
                  <dt className="text-slate-400">Salary</dt>
                  <dd className="font-medium text-slate-800">{job.salary}</dd>
                </div>
                <div>
                  <dt className="text-slate-400">Posted</dt>
                  <dd className="font-medium text-slate-800">
                    {job.deadline}
                  </dd>
                </div>
              </dl>

              <p className="mt-4 text-sm text-slate-700 bg-emerald-50/60 rounded-lg p-3">
                <span className="font-medium text-emerald-700">
                  Why this matches:{" "}
                </span>
                {job.fitReason}
              </p>

              <div className="mt-4 flex gap-2">
                {job.url ? (
                  <a
                    href={job.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium py-2 text-center"
                  >
                    Apply
                  </a>
                ) : (
                  <button
                    disabled
                    className="flex-1 rounded-lg bg-slate-200 text-slate-400 text-sm font-medium py-2 cursor-not-allowed"
                  >
                    No link
                  </button>
                )}
                <button className="rounded-lg border border-slate-200 text-slate-600 text-sm px-3 py-2 hover:bg-slate-50">
                  Save
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
