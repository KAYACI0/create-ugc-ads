/**
 * Google Drive icin bir kerelik REFRESH TOKEN alma yardimcisi (loopback yontemi).
 *
 * Kullanim:
 *   1) Google Cloud Console > APIs & Services
 *      - "Google Drive API"yi Enable edin.
 *      - OAuth consent screen > Test users > kendi Gmail'inizi ekleyin.
 *      - Credentials > Create Credentials > OAuth client ID > "Desktop app".
 *        (Desktop app ise localhost yonlendirmesi otomatik calisir.)
 *      - Client ID / Secret'i .env.local'e yazin.
 *   2) Terminalde:  npm run get-google-token
 *   3) Acilan linki tarayicida onaylayin; kod otomatik yakalanir.
 *   4) Yazdirilan refresh_token'i .env.local > GOOGLE_REFRESH_TOKEN'a koyun.
 *
 * Not: "Web application" client kullaniyorsaniz, Authorized redirect URIs'e
 *      http://localhost:42813 adresini eklemeniz gerekir.
 */
import { google } from "googleapis";
import { createServer } from "node:http";
import { readFileSync } from "node:fs";

loadEnvLocal();

const clientId = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

if (!clientId || !clientSecret) {
  console.error(
    "HATA: .env.local icinde GOOGLE_CLIENT_ID ve GOOGLE_CLIENT_SECRET dolu olmali."
  );
  process.exit(1);
}

const PORT = 42813;
const REDIRECT = `http://localhost:${PORT}`;
const oauth2 = new google.auth.OAuth2(clientId, clientSecret, REDIRECT);

const url = oauth2.generateAuthUrl({
  access_type: "offline",
  prompt: "consent",
  scope: ["https://www.googleapis.com/auth/drive.file"],
});

const server = createServer(async (req, res) => {
  try {
    const u = new URL(req.url, REDIRECT);
    const code = u.searchParams.get("code");
    const err = u.searchParams.get("error");

    if (err) {
      res.end(`Hata: ${err}. Terminale donun.`);
      console.error("\nYetkilendirme reddedildi:", err);
      server.close();
      process.exit(1);
    }
    if (!code) {
      res.end("Kod bulunamadi.");
      return;
    }

    const { tokens } = await oauth2.getToken(code);
    res.end(
      "Basarili! Bu sekmeyi kapatabilirsiniz. refresh_token terminale yazildi."
    );

    console.log("\n=== BASARILI ===");
    console.log("refresh_token (bunu .env.local > GOOGLE_REFRESH_TOKEN'a yapistirin):\n");
    console.log(
      tokens.refresh_token ||
        "(refresh_token donmedi — Google hesabinda uygulamanin onceki erisimini kaldirip tekrar deneyin)"
    );
    console.log("");
    server.close();
    process.exit(0);
  } catch (e) {
    res.end("Token alinirken hata olustu. Terminale bakin.");
    console.error("Token alinamadi:", e.message);
    server.close();
    process.exit(1);
  }
});

server.listen(PORT, () => {
  console.log("\n1) Asagidaki linki tarayicida acin ve izin verin:\n");
  console.log(url + "\n");
  console.log(`2) Onay sonrasi kod otomatik olarak yakalanacak (port ${PORT})...`);
});

function loadEnvLocal() {
  try {
    const content = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
    for (const line of content.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) {
        process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
      }
    }
  } catch {
    /* .env.local yoksa ortam degiskenleri zaten set edilmis olabilir */
  }
}
