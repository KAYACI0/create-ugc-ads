/**
 * POST /api/finalize  { videoUrl, productName, index }
 * Tek bir video varyasyonunu Google Drive'a yukler ve paylasim linklerini dondurur.
 * (E-posta, tum videolar bitince /api/notify ile tek seferde gonderilir.)
 * Donus: { index, driveViewLink, driveDownloadLink }
 */
import { NextRequest, NextResponse } from "next/server";
import { uploadVideoToDrive } from "@/lib/drive";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  try {
    const { videoUrl, productName, index } = (await req.json()) as {
      videoUrl?: string;
      productName?: string;
      index?: number;
    };
    if (!videoUrl) {
      return NextResponse.json(
        { error: "videoUrl zorunludur." },
        { status: 400 }
      );
    }

    // Drive yapilandirilmamissa (refresh token yoksa) fal video URL'sini don.
    // Boylece akis kesintisiz tamamlanir; Drive bilgileri girilince yuklemeye baslar.
    if (!process.env.GOOGLE_REFRESH_TOKEN) {
      return NextResponse.json({
        index: index ?? 1,
        driveViewLink: videoUrl,
        driveDownloadLink: videoUrl,
        drive: false,
      });
    }

    const safeProduct = (productName || "video").replace(
      /[^\p{L}\p{N}_-]+/gu,
      "_"
    );
    const stamp = new Date().toISOString().replace(/[:.]/g, "").slice(0, 15);
    const fileName = `UGC_${safeProduct}_${stamp}_v${index ?? 1}.mp4`;

    try {
      const drive = await uploadVideoToDrive(videoUrl, fileName);
      return NextResponse.json({
        index: index ?? 1,
        driveViewLink: drive.webViewLink,
        driveDownloadLink: drive.webContentLink,
        drive: true,
      });
    } catch (driveErr) {
      // Drive hatasinda akisi bozma: fal URL'sine geri don, uyari ekle.
      console.error("[/api/finalize] Drive hatasi:", driveErr);
      return NextResponse.json({
        index: index ?? 1,
        driveViewLink: videoUrl,
        driveDownloadLink: videoUrl,
        drive: false,
        warning:
          driveErr instanceof Error ? driveErr.message : "Drive yukleme hatasi",
      });
    }
  } catch (err) {
    console.error("[/api/finalize]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Bilinmeyen hata" },
      { status: 500 }
    );
  }
}
