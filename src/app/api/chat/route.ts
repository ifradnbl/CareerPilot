import { NextResponse } from "next/server";
import Groq from "groq-sdk";

export const runtime = "nodejs";

type IncomingMessage = { role: "user" | "assistant"; content: string };

type ChatBody = {
  messages?: IncomingMessage[];
  conversationId?: string;
};

const SYSTEM_PROMPT =
  "You are CareerPilot, an agentic career co-pilot. Help users with job searching, resume advice, skill gap analysis, cover letters, and career roadmaps. Be concise and actionable.";

const MODEL = "llama-3.3-70b-versatile"; // fast + free on Groq
const MAX_TOKENS = 1024;

export async function POST(req: Request) {
  let body: ChatBody = {};
  try {
    body = (await req.json()) as ChatBody;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body." },
      { status: 400 }
    );
  }

  const messages = Array.isArray(body.messages) ? body.messages : [];
  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  const userText = (lastUser?.content ?? "").trim();

  if (!userText) {
    return NextResponse.json(
      { error: "No user message provided." },
      { status: 400 }
    );
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Server is missing GROQ_API_KEY." },
      { status: 500 }
    );
  }

  const client = new Groq({ apiKey });

  const groqMessages = messages
    .filter((m) => m && (m.role === "user" || m.role === "assistant"))
    .map((m) => ({ role: m.role, content: m.content }));

  try {
    const response = await client.chat.completions.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...groqMessages,
      ],
    });

    const reply = response.choices?.[0]?.message?.content?.trim() || "";

    if (!reply) {
      return NextResponse.json(
        { error: "Empty response from model." },
        { status: 502 }
      );
    }

    return NextResponse.json({
      reply,
      conversationId: body.conversationId ?? null,
    });

  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unknown error calling Groq.";
    const status =
      typeof (err as { status?: number })?.status === "number"
        ? (err as { status?: number }).status!
        : 502;

    return NextResponse.json(
      { error: `Groq request failed: ${message}` },
      { status: status >= 400 && status < 600 ? status : 502 }
    );
  }
}