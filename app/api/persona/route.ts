/**
 * POST /api/persona  { productName, imageUrl }
 * Urun gorselinden ideal UGC yaraticisi profili uretir
 * (OpenRouter google/gemini-2.5-flash, vision).
 * Donus: { persona }
 */
import { NextRequest, NextResponse } from "next/server";
import { generatePersona } from "@/lib/openrouter";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { productName, imageUrl } = (await req.json()) as {
      productName?: string;
      imageUrl?: string;
    };
    if (!productName || !imageUrl) {
      return NextResponse.json(
        { error: "productName ve imageUrl zorunludur." },
        { status: 400 }
      );
    }
    const persona = await generatePersona(productName, imageUrl);
    return NextResponse.json({ persona });
  } catch (err) {
    console.error("[/api/persona]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Bilinmeyen hata" },
      { status: 500 }
    );
  }
}
