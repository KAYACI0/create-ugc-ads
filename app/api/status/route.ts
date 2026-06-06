/**
 * GET /api/status?id=<requestId>&kind=image|video
 * Ilgili fal isinin durumunu sorgular; COMPLETED ise medya URL'sini dondurur.
 * Donus: { status, url? }
 */
import { NextRequest, NextResponse } from "next/server";
import { checkStatus, FLUX_ENDPOINT, KLING_ENDPOINT } from "@/lib/fal";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const kind = searchParams.get("kind");

    if (!id) {
      return NextResponse.json({ error: "id zorunludur." }, { status: 400 });
    }
    if (kind !== "image" && kind !== "video") {
      return NextResponse.json(
        { error: "kind 'image' veya 'video' olmali." },
        { status: 400 }
      );
    }

    const endpoint = kind === "image" ? FLUX_ENDPOINT : KLING_ENDPOINT;
    const result = await checkStatus(endpoint, id);

    return NextResponse.json(result);
  } catch (err) {
    console.error("[/api/status]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Bilinmeyen hata" },
      { status: 500 }
    );
  }
}
