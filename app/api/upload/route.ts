/**
 * POST /api/upload  (multipart/form-data, alan: file)
 * Yuklenen urun gorselini fal storage'a koyar, public URL dondurur.
 * Bu URL hem OpenRouter vision cagrilarinda hem Flux i2i'de kullanilir.
 * Donus: { productImageUrl }
 */
import { NextRequest, NextResponse } from "next/server";
import { uploadToFal } from "@/lib/fal";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "file zorunludur." }, { status: 400 });
    }
    const productImageUrl = await uploadToFal(file);
    return NextResponse.json({ productImageUrl });
  } catch (err) {
    console.error("[/api/upload]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Bilinmeyen hata" },
      { status: 500 }
    );
  }
}
