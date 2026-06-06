# 🎬 Create UGC Ads — Yapay Zeka UGC Video Üretici

Mağazalar / e-ticaret ürünleri için **gerçekçi UGC (kullanıcı tarzı) reklam videoları**
üreten, kendi başına çalışan bir web uygulaması. Tek yaptığın bir **ürün fotoğrafı**
yüklemek ve **ürün adını** yazmak; sistem gerisini hallediyor.

> n8n otomasyonundan bağımsız, tek tıkla Vercel'e deploy edilebilen Next.js uygulaması.

---

## 📌 Ne yapar? (Özet)

1. Ürün fotoğrafına bakıp o ürünü en iyi tanıtacak **ideal kişiyi (persona)** tasarlar.
2. Bu personaya göre **3 farklı, 12 saniyelik UGC senaryosu** yazar.
3. Her senaryo için ürün fotoğrafından **gerçekçi bir "selfie" karesi** üretir.
4. Bu kareyi **harekete geçirip videoya** çevirir.
5. Videoları **Google Drive'a yükler** ve paylaşılabilir link verir.

Sonuç: tek bir fotoğraftan, sosyal medyaya hazır **3 farklı gerçekçi reklam videosu**.

---

## ⚙️ Sistem nasıl çalışır? (Akış)

```
  Ürün fotoğrafı + Ürün adı
            │
            ▼
   [1] fal storage'a yükle ───────────────► herkese açık görsel URL
            │
            ▼
   [2] PERSONA   (OpenRouter · gemini-2.5-flash, görseli "görür")
            │   → ideal influencer profili (yaş, tarz, ton, neden güvenilir...)
            ▼
   [3] SENARYOLAR (OpenRouter · gemini-2.5-pro)
            │   → 3 adet 12 sn'lik UGC senaryosu (replik + sahne)
            ▼
   ┌─ her senaryo için (1-3 kez) ──────────────────────────┐
   │  [4] KARE   fal · flux/dev/image-to-image              │
   │       → ürün fotoğrafından UGC selfie karesi           │
   │  [5] VIDEO  fal · kling-video v2 master i2v            │
   │       → kareyi 5 sn'lik 9:16 videoya çevirir           │
   │  [6] DRIVE  videoyu Google Drive'a yükler + link verir │
   └────────────────────────────────────────────────────────┘
            │
            ▼
   Ekranda: video önizleme + Drive linkleri + senaryo metni
```

### Kullanılan AI modelleri
| Adım | Servis / Model |
|------|----------------|
| Persona | OpenRouter `google/gemini-2.5-flash` (vision) |
| Senaryolar | OpenRouter `google/gemini-2.5-pro` (vision) |
| Görsel (kare) | fal.ai `fal-ai/flux/dev/image-to-image` |
| Video | fal.ai `fal-ai/kling-video/v2/master/image-to-video` |
| Depolama | Google Drive (OAuth) |

### Neden Vercel'de sorunsuz çalışır?
Video üretimi dakikalar sürer; sunucusuz (serverless) fonksiyonlar ise kısa ömürlüdür.
Bu yüzden ağır iş **fal.ai'nin kuyruğunda (queue)** asenkron yapılır: sunucumuz sadece
işi başlatır ve durumu sorgular; uzun bekleme **tarayıcıda** olur. Böylece hiçbir
fonksiyon zaman aşımına uğramaz.

---

## 🚀 Nasıl kullanılır? (Adım adım)

1. Uygulamayı aç (yerelde `http://localhost:3000`, canlıda Vercel adresin).
2. **Ürün adı** yaz (örn. "Vitamin C Serum").
3. **Kaç varyasyon** istediğini seç (1–3 video).
4. (İsteğe bağlı) bildirim e-postası — boş bırakabilirsin.
5. **Ürün fotoğrafı** yükle. *İpucu: temiz / nötr arka planlı, net ürün fotoğrafı en iyi sonucu verir.*
6. **Video Üret**'e bas.
7. İlerlemeyi adım adım izle: persona → senaryolar → her video için kare/video/Drive.
8. Bitince her video için **önizleme + "Drive'da Görüntüle" + "İndir"** linkleri ve
   senaryo metni ekranda görünür.

⏱️ **Süre:** video başına ~3–4 dk (Kling). 3 varyasyon ≈ 10–12 dk.
💰 **Maliyet:** çalıştırma başına kabaca **$1–4** (çoğu Kling videosundan) + çok küçük LLM ücreti.

---

## 🔧 Yerel kurulum (geliştirme)

```bash
npm install
cp .env.example .env.local     # Windows: copy .env.example .env.local
# .env.local içindeki anahtarları doldur (aşağıya bak)
npm run dev                     # http://localhost:3000
```

### Gerekli anahtarlar (`.env.local`)
| Değişken | Nereden alınır |
|----------|----------------|
| `FAL_KEY` | https://fal.ai/dashboard/keys (bakiye gerekir) |
| `OPENROUTER_API_KEY` | https://openrouter.ai/keys (kredi gerekir) |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Google Cloud Console → OAuth client (Desktop app) |
| `GOOGLE_REFRESH_TOKEN` | `npm run get-google-token` ile alınır |
| `GDRIVE_FOLDER_ID` | Drive klasör URL'sindeki son parça (boş = ana dizin) |
| `GMAIL_USER`, `GMAIL_APP_PASSWORD`, `NOTIFY_EMAIL` | (opsiyonel) e-posta bildirimi için |

#### Google Drive kurulumu
1. Google Cloud Console → **Google Drive API**'yi **Enable** et.
2. **OAuth consent screen → Test users**'a kendi Gmail'ini ekle.
3. **Credentials → OAuth client ID → Desktop app** oluştur; ID/Secret'i `.env.local`'e yaz.
4. `npm run get-google-token` → açılan linki onayla → terminaldeki `refresh_token`'ı
   `GOOGLE_REFRESH_TOKEN`'a koy. *(Web app client kullanıyorsan redirect URIs'e
   `http://localhost:42813` ekle.)*
5. Drive'da bir klasör aç, URL'deki son parçayı `GDRIVE_FOLDER_ID`'ye koy.

> E-posta istemiyorsan Gmail alanlarını boş bırak — o adım otomatik atlanır.

---

## ✅ Test / Doğrulama

- **Hızlı boot testi:** `npm run dev` → `http://localhost:3000` açılıyor mu?
- **Uçtan uca (Drive/e-posta hariç) test:** dev sunucusu açıkken
  ```bash
  node scripts/e2e-test.mjs
  ```
  Bu, örnek bir ürün görseliyle persona → senaryo → kare → video zincirini çalıştırıp
  süreleri ve çıktı URL'lerini yazdırır.
- **Tam test:** tarayıcıdan gerçek bir ürün fotoğrafı yükleyip "Video Üret".

---

## ☁️ Vercel'e deploy

1. Bu repoyu Vercel'de **New Project** ile içe aktar.
2. **Settings → Environment Variables**'a `.env.example`'daki tüm anahtarları gir
   (`FAL_KEY`, `OPENROUTER_API_KEY`, `GOOGLE_*`, `GDRIVE_FOLDER_ID`, varsa `GMAIL_*`).
   `APP_URL`'i canlı Vercel adresin yap.
3. **Deploy.**

> `.env.local` asla repoya gönderilmez (`.gitignore`'da). Anahtarlar yalnızca Vercel
> ortam değişkenlerinde tutulur.

---

## 🗂️ Proje yapısı

```
app/
  page.tsx              Form + adım adım ilerleme + sonuç (çoklu video)
  api/upload            foto → fal storage (public URL)
  api/persona           OpenRouter gemini-2.5-flash → persona
  api/scripts           OpenRouter gemini-2.5-pro  → 3 senaryo
  api/frame             flux i2i submit (UGC kare)
  api/video             kling i2v submit
  api/status            fal queue durum sorgusu (polling)
  api/finalize          videoyu Drive'a yükle (yoksa fal linkine düşer)
  api/notify            (opsiyonel) özet e-posta
lib/
  fal.ts  openrouter.ts  drive.ts  mail.ts  prompts.ts
scripts/
  get-google-token.mjs  Drive refresh token alma
  e2e-test.mjs          uçtan uca test
```

## 🎛️ Özelleştirme
- **Promptlar / modeller:** `lib/prompts.ts` (persona promptu, "Raw 12-Second UGC"
  master promptu, `PERSONA_MODEL` / `SCRIPTS_MODEL`).
- **Model parametreleri:** `lib/fal.ts` (flux `strength` 0.78, `image_size`
  `portrait_4_3`; Kling `duration` "5", `aspect_ratio` "9:16", negative prompt).

## 🩺 Sık karşılaşılanlar
- **402 / "requires more credits" (OpenRouter):** kredi yükle.
- **403 / "Exhausted balance" (fal):** fal bakiyesi yükle.
- **"Drive API has not been used…":** Google Cloud'da Drive API'yi Enable et, 1-2 dk bekle.
- **`access_denied` (token alırken):** OAuth consent screen → Test users'a Gmail'ini ekle.
