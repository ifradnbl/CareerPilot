// Server-only env config. Client code should use `@/lib/api/*` instead.

export type LLMProvider = "openai" | "anthropic" | "gemini" | "mistral";
export type JobSearchProvider = "adzuna" | "serpapi" | "jsearch";
export type VectorStoreProvider = "pgvector" | "pinecone" | "chroma";

export type AppEnv = {
  NODE_ENV: "development" | "production" | "test";
  DATABASE_URL: string;
  LLM_PROVIDER: LLMProvider;
  LLM_API_KEY: string;
  JOB_SEARCH_PROVIDER: JobSearchProvider;
  JOB_SEARCH_API_KEY: string;
  ADZUNA_APP_ID: string;
  ADZUNA_APP_KEY: string;
  TAVILY_API_KEY: string;
  VECTOR_STORE_PROVIDER: VectorStoreProvider;
  VECTOR_STORE_URL?: string;
};

function readEnv(): AppEnv {
  const e = process.env;
  if (!e.DATABASE_URL) throw new Error("DATABASE_URL is required");
  if (!e.LLM_API_KEY) throw new Error("LLM_API_KEY is required");
  if (!e.JOB_SEARCH_API_KEY) throw new Error("JOB_SEARCH_API_KEY is required");
  if (!e.ADZUNA_APP_ID) throw new Error("ADZUNA_APP_ID is required");
  if (!e.ADZUNA_APP_KEY) throw new Error("ADZUNA_APP_KEY is required");
  if (!e.TAVILY_API_KEY) throw new Error("TAVILY_API_KEY is required");

  return {
    NODE_ENV: (e.NODE_ENV ?? "development") as AppEnv["NODE_ENV"],
    DATABASE_URL: e.DATABASE_URL,
    LLM_PROVIDER: e.LLM_PROVIDER as LLMProvider,
    LLM_API_KEY: e.LLM_API_KEY,
    JOB_SEARCH_PROVIDER: e.JOB_SEARCH_PROVIDER as JobSearchProvider,
    JOB_SEARCH_API_KEY: e.JOB_SEARCH_API_KEY,
    ADZUNA_APP_ID: e.ADZUNA_APP_ID,
    ADZUNA_APP_KEY: e.ADZUNA_APP_KEY,
    TAVILY_API_KEY: e.TAVILY_API_KEY,
    VECTOR_STORE_PROVIDER: e.VECTOR_STORE_PROVIDER as VectorStoreProvider,
    VECTOR_STORE_URL: e.VECTOR_STORE_URL,
  };
}

let cached: AppEnv | undefined;
export function getEnv(): AppEnv {
  // Parse once per server process.
  return (cached ??= readEnv());
}

// Only NEXT_PUBLIC_* values are safe to send to the client.
export function getPublicEnv() {
  return {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? "",
  };
}