# 🎬 Create UGC Ads — Yapay Zeka UGC Video Üretici

Mağazalar / e-ticaret ürünleri için **gerçekçi UGC (kullanıcı tarzı) reklam videoları** üreten, kendi başına çalışan bir web uygulaması. Tek yaptığın bir **ürün fotoğrafı** yüklemek ve birkaç bilgi girmek; sistem gerisini hallediyor.

> n8n otomasyonundan bağımsız, tek tıkla Vercel'e deploy edilebilen Next.js uygulaması.

---

## 📌 Ne yapar?

1. Ürün fotoğrafına bakıp o ürünü en iyi tanıtacak **ideal kişiyi (persona)** tasarlar.
2. Bu personaya göre **3 farklı UGC senaryosu** yazar — her biri farklı bir satış açısı kullanır.
3. Her senaryo için ürün fotoğrafından **gerçekçi bir "selfie" karesi** üretir.
4. Bu kareyi **harekete geçirip sesli videoya** çevirir.
5. Videoları **Google Drive'a yükler** ve paylaşılabilir link verir.

Sonuç: tek bir fotoğraftan, sosyal medyaya hazır **3 farklı gerçekçi reklam videosu**.

---

## ⚙️ Sistem Akışı

```
Ürün Fotoğrafı + Ürün Bilgileri
         │
         ▼
[1] fal storage'a yükle ───────────► herkese açık görsel URL
         │
         ▼
[2] PERSONA   (Gemini 2.5 Flash — görseli "görür")
         │   → ideal influencer profili
         │     (yaş, tarz, ton, pain point'ler, neden güvenilir...)
         ▼
[3] SENARYOLAR (Gemini 2.5 Pro)
         │   → 3 farklı UGC senaryosu:
         │     Script 1: Coşkulu Keşif
         │     Script 2: Problem → Çözüm Hikayesi  ← yeni
         │     Script 3: Anlık Demo
         ▼
┌─ her senaryo için (1–3 kez) ─────────────────────────┐
│  [4] KARE   Flux 1.1 Pro Redux                        │
│       → ürün fotoğrafından UGC selfie karesi          │
│  [5] VİDEO  Seedance 2.0 i2v (sesli, 9:16)           │
│       → kareyi 5–10 sn'lik dikey videoya çevirir     │
│  [6] DRIVE  videoyu Google Drive'a yükler + link      │
└───────────────────────────────────────────────────────┘
         │
         ▼
Ekranda: video önizleme + Drive linkleri + senaryo metni
```

---

## 🎯 3 Senaryo Tipi

| # | Tip | Nasıl çalışır |
|---|-----|---------------|
| 1 | **Coşkulu Keşif** | "Az önce buldum, paylaşmam lazımdı" enerjisi |
| 2 | **Problem → Çözüm** | Önce izleyicinin yaşadığı sıkıntıyı açar, sonra ürünün nasıl çözdüğünü doğal dille anlatır |
| 3 | **Anlık Demo** | Ürünü kullanırken gösterir, faydayı yaşayarak aktarır |

> Script 2, "Ne problemini çözüyor?" alanına girdiğin bilgiyi doğrudan kullanır. Ne kadar spesifik girersen senaryo o kadar güçlü olur.

---

## 🚀 Kullanım (Adım Adım)

### 1. Uygulamayı aç
- Yerelde: `http://localhost:3000`
- Canlıda: Vercel adresin

### 2. Formu doldur

| Alan | Zorunlu | Açıklama |
|------|---------|----------|
| **Ürün adı** | ✅ | Kısa ve net. Örn: `Vitamin C Serum` |
| **Kaç varyasyon?** | ✅ | 1, 2 veya 3 video |
| **Ürün açıklaması** | ⬜ | Genel özellikler, kullanım şekli |
| **Ne problemini çözüyor?** | ⬜ | ⭐ En önemli alan — Script 2 buradan beslenir |
| **Hedef kitle** | ⬜ | Persona oluşturmaya yön verir |
| **Video süresi** | ✅ | 5 sn veya 10 sn |
| **Bildirim e-postası** | ⬜ | Bitince e-posta gönderilsin mi? |
| **Ürün fotoğrafı** | ✅ | Temiz/nötr arka plan en iyi sonucu verir |

### 3. "Video Üret"e bas

İlerlemeyi adım adım izle:
```
✓ Ürün görseli yükleniyor
✓ Persona oluşturuluyor (gemini-2.5-flash)
✓ Senaryolar yazılıyor (gemini-2.5-pro)
⟳ Video 1 üretiliyor — kare üretiliyor (Flux 1.1 Pro)
⟳ Video 1 üretiliyor — video üretiliyor (Seedance 2.0, 5sn)
⟳ Video 1 üretiliyor — Drive'a yükleniyor
✓ Video 1 üretildi
...
```

### 4. Sonuçları al

Her video için:
- ▶️ Tarayıcıda önizleme
- 🔗 Drive'da Görüntüle linki
- ⬇️ İndir linki
- 📄 Senaryo metni (aç/kapat)

---

## 💡 "Ne problemini çözüyor?" Alanı — İpuçları

Bu alan Script 2'yi (Problem → Çözüm) besler. Ne kadar spesifik girersen, senaryo o kadar güçlü olur.

**Zayıf giriş:**
> "Cildi nemlendiriyor"

**Güçlü giriş:**
> "Sabah uyandığımda cildim çok kuru ve sıkışık hissettiriyordu, makyaj da düzgün oturmuyordu. Bu serum sabah rutinime girdi ve 10 günde fark ettim — cilt daha dolgun, makyaj çok daha kolay oturuyor."

Formatı kopyalayabilirsin:
```
ÖNCE (problem): [kullanıcının yaşadığı somut sıkıntı]
SONRA (çözüm): [ürün kullandıktan sonra ne değişti, ne kadar sürede]
```

---

## 🛠️ Kurulum (Yerel Geliştirme)

```bash
git clone https://github.com/KAYACI0/create-ugc-ads.git
cd create-ugc-ads
npm install
cp .env.example .env.local     # Windows: copy .env.example .env.local
# .env.local içindeki anahtarları doldur
npm run dev                    # http://localhost:3000
```

### Gerekli API Anahtarları

| Değişken | Nereden alınır |
|----------|----------------|
| `FAL_KEY` | [fal.ai/dashboard/keys](https://fal.ai/dashboard/keys) — bakiye gerekir |
| `OPENROUTER_API_KEY` | [openrouter.ai/keys](https://openrouter.ai/keys) — kredi gerekir |
| `GOOGLE_CLIENT_ID` | Google Cloud Console → OAuth client (Desktop app) |
| `GOOGLE_CLIENT_SECRET` | Google Cloud Console → OAuth client (Desktop app) |
| `GOOGLE_REFRESH_TOKEN` | `npm run get-google-token` ile alınır (aşağıya bak) |
| `GDRIVE_FOLDER_ID` | Drive klasör URL'sindeki son parça (boş = ana dizin) |
| `GMAIL_USER` | (opsiyonel) e-posta bildirimi için |
| `GMAIL_APP_PASSWORD` | (opsiyonel) Gmail uygulama şifresi |
| `NOTIFY_EMAIL` | (opsiyonel) bildirim alacak adres |

### Google Drive Kurulumu (Adım Adım)

1. [Google Cloud Console](https://console.cloud.google.com/) → sol menü **APIs & Services → Library**
2. **"Google Drive API"** ara → **Enable** et
3. **APIs & Services → OAuth consent screen**
   - User Type: **External**
   - Test users → kendi Gmail adresini ekle
4. **Credentials → Create Credentials → OAuth client ID**
   - Application type: **Desktop app**
   - Oluşturulan `Client ID` ve `Client Secret`'ı `.env.local`'e yaz
5. Terminal'de:
   ```bash
   npm run get-google-token
   ```
   Açılan linki tarayıcıda onayla → terminaldeki `refresh_token` değerini `GOOGLE_REFRESH_TOKEN`'a yaz
6. Drive'da bir klasör oluştur → URL'deki son parçayı `GDRIVE_FOLDER_ID`'ye yaz

> E-posta bildirimi istemiyorsan `GMAIL_*` alanlarını boş bırak — o adım otomatik atlanır.

---

## ☁️ Vercel'e Deploy

1. [vercel.com](https://vercel.com) → **New Project** → bu repoyu içe aktar
2. **Settings → Environment Variables** → `.env.example`'daki tüm anahtarları gir
3. `APP_URL` değişkenini Vercel'in verdiği alan adıyla güncelle
4. **Deploy** — her `git push main` otomatik yeniden deploy eder

> `.env.local` asla repoya gönderilmez (`.gitignore`'da). Anahtarlar yalnızca Vercel ortam değişkenlerinde tutulur.

---

## 🤖 Kullanılan AI Modelleri

| Adım | Servis / Model | Görev |
|------|----------------|-------|
| Persona | OpenRouter `google/gemini-2.5-flash` | Görsel analiz + karakter profili |
| Senaryolar | OpenRouter `google/gemini-2.5-pro` | 3 UGC senaryosu (JSON) |
| Kare | fal.ai `fal-ai/flux-pro/v1.1/redux` | UGC selfie karesi üretimi |
| Video | fal.ai `fal-ai/kling-video/v3/pro/image-to-video` | Dikey video (9:16) |
| Depolama | Google Drive (OAuth) | Video arşivi + paylaşım |

### Maliyet (yaklaşık)

| Kalem | Maliyet |
|-------|---------|
| Flux kare (x1) | ~$0.04 |
| Kling v3 Pro video (x1) | ~$0.07 |
| Gemini persona + senaryo (tüm çalıştırma) | ~$0.07 |
| **3 video toplam** | **~$0.34** |

### Süre

- Video başına: **2–4 dakika** (Seedance kuyruğuna bağlı)
- 3 varyasyon: **~8–12 dakika**

---

## 🗂️ Proje Yapısı

```
app/
  page.tsx              Form + ilerleme adımları + sonuç ekranı
  api/
    upload/             Fotoğraf → fal storage (public URL)
    persona/            Gemini 2.5 Flash → persona profili
    scripts/            Gemini 2.5 Pro → 3 senaryo (JSON)
    frame/              Flux 1.1 Pro Redux → UGC kare (queue submit)
    video/              Seedance 2.0 → sesli video (queue submit)
    status/             fal queue durum sorgusu (polling)
    finalize/           Video → Drive yükleme + link
    notify/             (opsiyonel) özet e-posta
lib/
  prompts.ts            Tüm AI promptları ve model ID'leri
  openrouter.ts         Gemini API çağrıları
  fal.ts                Flux + Seedance queue işlemleri
  drive.ts              Google Drive yükleme
  mail.ts               Gmail bildirimi
scripts/
  get-google-token.mjs  Drive OAuth refresh token alma
  e2e-test.mjs          Uçtan uca test scripti
```

---

## 🎛️ Özelleştirme

- **Promptlar / modeller:** `lib/prompts.ts`
  - `PERSONA_MODEL`, `SCRIPTS_MODEL` — model değiştirme
  - `buildPersonaPrompt` — persona yapısını özelleştirme
  - `buildScriptsPrompt` — senaryo tiplerini ve talimatları düzenleme
- **Görsel & video parametreleri:** `lib/fal.ts`
  - Flux: `image_size`, `guidance_scale`, `num_inference_steps`
  - Seedance: `duration`, `resolution`, `aspect_ratio`, `generate_audio`

---

## ✅ Test

```bash
# Hızlı boot testi
npm run dev   # http://localhost:3000 açılıyor mu?

# Uçtan uca (Drive/e-posta hariç)
node scripts/e2e-test.mjs
# → persona, senaryo, kare, video zincirini çalıştırır; URL'leri yazdırır

# Tam test
# Tarayıcıdan gerçek ürün fotoğrafı yükle → "Video Üret"
```

---

## 🩺 Sık Karşılaşılan Hatalar

| Hata | Çözüm |
|------|-------|
| `402 / "requires more credits"` | OpenRouter'a kredi yükle |
| `403 / "Exhausted balance"` | fal.ai bakiyesi yükle |
| `"Drive API has not been used…"` | Google Cloud'da Drive API'yi Enable et, 1-2 dk bekle |
| `access_denied` (token alırken) | OAuth consent screen → Test users'a Gmail'ini ekle |
| Video üretildi ama Drive'a yüklenemedi | `GOOGLE_REFRESH_TOKEN` süresi dolmuş olabilir, `npm run get-google-token` ile yenile |
| Senaryo boş geliyor | OpenRouter kredi kontrolü yap; `OPENROUTER_API_KEY` doğruluğunu kontrol et |

---

## 📝 Notlar

- Senaryolar her zaman **İngilizce** üretilir (Seedance ses/diyalog kalitesi için).
- Script 2 (Problem → Çözüm) en ikna edici senaryo tipidir; **"Ne problemini çözüyor?"** alanını doldurmak kaliteyi belirgin şekilde artırır.
- Temiz, nötr arka planlı ürün fotoğrafları Flux ile en iyi kareyi üretir.
- Vercel'de serverless zaman aşımı sorunu yaşanmaz — ağır iş fal.ai kuyruğunda asenkron çalışır, polling tarayıcıdan yapılır.
