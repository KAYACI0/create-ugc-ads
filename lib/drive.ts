/**
 * Google Drive yukleme (OAuth - kendi hesabiniz, refresh token ile).
 * Bir video URL'sini indirip Drive'a yukler ve paylasilabilir link dondurur.
 */
import { google } from "googleapis";
import { Readable } from "node:stream";

function getDriveClient() {
  const {
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REFRESH_TOKEN,
  } = process.env;

  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REFRESH_TOKEN) {
    throw new Error(
      "Google OAuth bilgileri eksik (GOOGLE_CLIENT_ID / SECRET / REFRESH_TOKEN)."
    );
  }

  const oauth2 = new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET
  );
  oauth2.setCredentials({ refresh_token: GOOGLE_REFRESH_TOKEN });

  return google.drive({ version: "v3", auth: oauth2 });
}

export interface DriveUploadResult {
  fileId: string;
  /** Tarayicida onizleme/paylasim linki */
  webViewLink: string;
  /** Dogrudan indirme linki */
  webContentLink: string;
}

/**
 * Verilen URL'deki videoyu Drive'a yukler, "baglantiya sahip herkes"
 * goruntuleyebilsin diye izin verir ve linkleri dondurur.
 */
export async function uploadVideoToDrive(
  videoUrl: string,
  fileName: string
): Promise<DriveUploadResult> {
  const drive = getDriveClient();
  const folderId = process.env.GDRIVE_FOLDER_ID;

  // Videoyu indir (fal ciktisi gecici URL'dir)
  const resp = await fetch(videoUrl);
  if (!resp.ok) {
    throw new Error(`Video indirilemedi (${resp.status}) : ${videoUrl}`);
  }
  const arrayBuf = await resp.arrayBuffer();
  const buffer = Buffer.from(arrayBuf);
  const stream = Readable.from(buffer);

  const created = await drive.files.create({
    requestBody: {
      name: fileName,
      ...(folderId ? { parents: [folderId] } : {}),
    },
    media: {
      mimeType: "video/mp4",
      body: stream,
    },
    fields: "id, webViewLink, webContentLink",
  });

  const fileId = created.data.id!;

  // Baglantiya sahip herkese okuma izni
  await drive.permissions.create({
    fileId,
    requestBody: { role: "reader", type: "anyone" },
  });

  // Izin sonrasi guncel linkleri al
  const meta = await drive.files.get({
    fileId,
    fields: "id, webViewLink, webContentLink",
  });

  return {
    fileId,
    webViewLink: meta.data.webViewLink ?? `https://drive.google.com/file/d/${fileId}/view`,
    webContentLink:
      meta.data.webContentLink ??
      `https://drive.google.com/uc?id=${fileId}&export=download`,
  };
}
