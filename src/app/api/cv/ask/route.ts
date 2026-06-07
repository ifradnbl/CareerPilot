import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

type AskBody = {
  question?: string;
  user_id?: string;
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as AskBody;

    const response = await fetch("http://localhost:8000/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unknown error proxying ask.";
    return NextResponse.json(
      { error: `Ask proxy failed: ${message}` },
      { status: 502 }
    );
  }
}
