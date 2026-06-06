/**
 * POST /api/video  { imageUrl, prompt }
 * flux kare ciktisini kling i2v ile videoya cevirir (queue submit).
 *   - imageUrl: flux kare URL'si
 *   - prompt  : ilgili UGC senaryosu
 * Donus: { requestId }
 */
import { NextRequest, NextResponse } from "next/server";
import { submitVideo } from "@/lib/fal";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { imageUrl, prompt } = (await req.json()) as {
      imageUrl?: string;
      prompt?: string;
    };
    if (!imageUrl || !prompt?.trim()) {
      return NextResponse.json(
        { error: "imageUrl ve prompt zorunludur." },
        { status: 400 }
      );
    }
    const requestId = await submitVideo(prompt, imageUrl);
    return NextResponse.json({ requestId });
  } catch (err) {
    console.error("[/api/video]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Bilinmeyen hata" },
      { status: 500 }
    );
  }
}
