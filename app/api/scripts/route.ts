/**
 * POST /api/scripts  { persona, productName, imageUrl }
 * persona + urun + gorselden 3 adet 12sn UGC senaryosu uretir
 * (OpenRouter google/gemini-2.5-pro, vision, JSON cikti).
 * Donus: { scripts: string[] }
 */
import { NextRequest, NextResponse } from "next/server";
import { generateScripts } from "@/lib/openrouter";

export const runtime = "nodejs";
// Vercel Hobby plani fonksiyon basina en fazla 60 sn'ye izin verir.
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { persona, productName, imageUrl } = (await req.json()) as {
      persona?: string;
      productName?: string;
      imageUrl?: string;
    };
    if (!persona || !productName || !imageUrl) {
      return NextResponse.json(
        { error: "persona, productName ve imageUrl zorunludur." },
        { status: 400 }
      );
    }
    const scripts = await generateScripts(persona, productName, imageUrl);
    if (scripts.length === 0) {
      return NextResponse.json(
        { error: "Senaryo uretilemedi." },
        { status: 502 }
      );
    }
    return NextResponse.json({ scripts });
  } catch (err) {
    console.error("[/api/scripts]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Bilinmeyen hata" },
      { status: 500 }
    );
  }
}
