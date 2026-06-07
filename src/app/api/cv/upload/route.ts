import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    const response = await fetch("http://localhost:8000/upload-cv", {
      method: "POST",
      body: formData,
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unknown error proxying upload.";
    return NextResponse.json(
      { success: false, error: `Upload proxy failed: ${message}` },
      { status: 502 }
    );
  }
}
