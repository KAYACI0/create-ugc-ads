/**
 * POST /api/frame  { persona, imageUrl }
 * flux i2i ile UGC selfie ilk-karesini uretir (queue submit).
 * Donus: { requestId }
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
    const requestId = await submitFrame(buildFramePrompt(persona || ""), imageUrl);
    return NextResponse.json({ requestId });
  } catch (err) {
    console.error("[/api/frame]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Bilinmeyen hata" },
      { status: 500 }
    );
  }
}
