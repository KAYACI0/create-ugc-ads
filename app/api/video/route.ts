/**
 * POST /api/video  { imageUrl, prompt }
 * Flux kare ciktisini Seedance 2.0 i2v ile (sesli) videoya cevirir (queue submit).
 *   - imageUrl: Flux kare URL'si
 *   - prompt  : ilgili UGC senaryosu
 * Donus: { requestId, statusUrl, responseUrl }
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
    const job = await submitVideo(prompt, imageUrl);
    return NextResponse.json(job);
  } catch (err) {
    console.error("[/api/video]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Bilinmeyen hata" },
      { status: 500 }
    );
  }
}
