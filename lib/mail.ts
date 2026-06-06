/**
 * E-posta bildirimi (Gmail SMTP, uygulama sifresi ile).
 * 3 video varyasyonunun Drive linklerini tek e-postada gonderir.
 */
import nodemailer from "nodemailer";

function getTransport() {
  const { GMAIL_USER, GMAIL_APP_PASSWORD } = process.env;
  if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
    throw new Error("GMAIL_USER / GMAIL_APP_PASSWORD tanimli degil.");
  }
  return nodemailer.createTransport({
    service: "gmail",
    auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD },
  });
}

export interface VideoItem {
  index: number;
  driveViewLink: string;
  driveDownloadLink: string;
}

export interface NotifyParams {
  to: string;
  productName: string;
  videos: VideoItem[];
}

export async function sendCompletionEmail(params: NotifyParams): Promise<void> {
  const transport = getTransport();
  const from = process.env.GMAIL_USER!;

  const rows = params.videos
    .map(
      (v) => `
      <tr>
        <td style="padding:8px 0;color:#333">Video ${v.index}</td>
        <td style="padding:8px 12px">
          <a href="${v.driveViewLink}" style="color:#6d5dfc">Goruntule</a>
        </td>
        <td style="padding:8px 12px">
          <a href="${v.driveDownloadLink}" style="color:#6d5dfc">Indir</a>
        </td>
      </tr>`
    )
    .join("");

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto">
      <h2 style="color:#111">UGC videolariniz hazir! 🎬</h2>
      <p><strong>Urun:</strong> ${escapeHtml(params.productName)}<br/>
         <strong>${params.videos.length} varyasyon</strong> uretildi ve Google Drive'a yuklendi.</p>
      <table style="border-collapse:collapse;width:100%">${rows}</table>
      <hr/>
      <p style="color:#999;font-size:12px">UGC Otomasyon tarafindan otomatik gonderildi.</p>
    </div>
  `;

  await transport.sendMail({
    from: `"UGC Otomasyon" <${from}>`,
    to: params.to,
    subject: `UGC videolariniz hazir — ${params.productName} (${params.videos.length} varyasyon)`,
    html,
  });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
