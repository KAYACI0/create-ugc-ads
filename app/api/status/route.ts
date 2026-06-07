/**
 * GET /api/status?statusUrl=<...>&responseUrl=<...>
 * submit yanitindan gelen fal status_url/response_url ile isin durumunu sorgular;
 * COMPLETED ise medya URL'sini dondurur. (URL'ler sunucuda fal.run host'una karsi
 * dogrulanir — SSRF korumasi.)
 * Donus: { status, url? }
 */
import { NextRequest, NextResponse } from "next/server";
import { checkStatusByUrl } from "@/lib/fal";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const statusUrl = searchParams.get("statusUrl");
    const responseUrl = searchParams.get("responseUrl");

    if (!statusUrl || !responseUrl) {
      return NextResponse.json(
        { error: "statusUrl ve responseUrl zorunludur." },
        { status: 400 }
      );
    }

    const result = await checkStatusByUrl(statusUrl, responseUrl);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[/api/status]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Bilinmeyen hata" },
      { status: 500 }
    );
  }
}
