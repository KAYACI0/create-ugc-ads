/**
 * POST /api/notify  { to?, productName, videos: [{index, driveViewLink, driveDownloadLink}] }
 * Tum videolar Drive'a yuklendikten sonra tek bir ozet e-postasi gonderir.
 * Donus: { emailed }
 */
import { NextRequest, NextResponse } from "next/server";
import { sendCompletionEmail, type VideoItem } from "@/lib/mail";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { to, productName, videos } = (await req.json()) as {
      to?: string;
      productName?: string;
      videos?: VideoItem[];
    };

    const recipient = to?.trim() || process.env.NOTIFY_EMAIL;
    if (!recipient) {
      return NextResponse.json({ emailed: false, reason: "alici yok" });
    }
    if (!videos || videos.length === 0) {
      return NextResponse.json(
        { error: "videos zorunludur." },
        { status: 400 }
      );
    }

    await sendCompletionEmail({
      to: recipient,
      productName: productName || "",
      videos,
    });
    return NextResponse.json({ emailed: true });
  } catch (err) {
    console.error("[/api/notify]", err);
    // E-posta hatasini kullanici akisini bozmadan dondur
    return NextResponse.json(
      { emailed: false, error: err instanceof Error ? err.message : "hata" },
      { status: 200 }
    );
  }
}
