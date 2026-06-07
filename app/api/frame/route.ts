/**
 * POST /api/frame  { persona, imageUrl }
 * Flux 1.1 Pro Redux ile UGC selfie ilk-karesini uretir (queue submit).
 * Donus: { requestId, statusUrl, responseUrl }
 */
import { NextRequest, NextResponse } from "next/server";
import { submitFrame } from "@/lib/fal";
import { buildFramePrompt } from "@/lib/prompts";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { persona, imageUrl } = (await req.json()) as {
      persona?: string;
      imageUrl?: string;
    };
    if (!imageUrl) {
      return NextResponse.json(
        { error: "imageUrl zorunludur." },
        { status: 400 }
      );
    }
    const job = await submitFrame(buildFramePrompt(persona || ""), imageUrl);
    return NextResponse.json(job);
  } catch (err) {
    console.error("[/api/frame]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Bilinmeyen hata" },
      { status: 500 }
    );
  }
}
