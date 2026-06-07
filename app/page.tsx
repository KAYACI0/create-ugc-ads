"use client";

import { useRef, useState } from "react";

type StepState = "pending" | "active" | "done" | "error";

interface Step {
  key: string;
  label: string;
  state: StepState;
  note?: string;
}

interface VideoResult {
  index: number;
  videoUrl: string;
  driveViewLink: string;
  driveDownloadLink: string;
  script: string;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export default function Home() {
  const [productName, setProductName] = useState("");
  const [productDescription, setProductDescription] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [duration, setDuration] = useState("5"); // "5" | "10" (saniye)
  const [email, setEmail] = useState("");
  const [count, setCount] = useState(3);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [running, setRunning] = useState(false);
  const [steps, setSteps] = useState<Step[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<VideoResult[]>([]);
  const [emailed, setEmailed] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  function onPickFile(f: File | null) {
    setFile(f);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(f ? URL.createObjectURL(f) : null);
  }

  function setStep(key: string, state: StepState, note?: string) {
    setSteps((prev) =>
      prev.map((s) => (s.key === key ? { ...s, state, note } : s))
    );
  }

  /** Bir fal isini COMPLETED olana kadar poll eder; medya URL dondurur. */
  async function pollUntilDone(
    statusUrl: string,
    responseUrl: string,
    kind: "image" | "video"
  ): Promise<string> {
    const maxTries = kind === "video" ? 150 : 60; // video ~10dk, kare ~4dk
    for (let i = 0; i < maxTries; i++) {
      const qs = new URLSearchParams({ statusUrl, responseUrl });
      const res = await fetch(`/api/status?${qs.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Durum sorgusu basarisiz.");
      if (data.status === "COMPLETED") {
        if (!data.url) throw new Error("Cikti URL'si bulunamadi.");
        return data.url as string;
      }
      if (data.status === "ERROR") throw new Error("fal uretim hatasi (ERROR).");
      await sleep(4000);
    }
    throw new Error("Zaman asimi: is cok uzun surdu.");
  }

  async function postJson<T>(url: string, body: unknown): Promise<T> {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `${url} basarisiz.`);
    return data as T;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResults([]);
    setEmailed(false);

    if (!file) return setError("Lutfen bir urun fotografi yukleyin.");
    if (!productName.trim()) return setError("Urun adi zorunludur.");

    // Adim listesini hazirla
    const base: Step[] = [
      { key: "upload", label: "Urun gorseli yukleniyor", state: "pending" },
      { key: "persona", label: "Persona olusturuluyor (gemini-2.5-flash)", state: "pending" },
      { key: "scripts", label: "Senaryolar yaziliyor (gemini-2.5-pro)", state: "pending" },
    ];
    for (let i = 1; i <= count; i++) {
      base.push({ key: `video-${i}`, label: `Video ${i} uretiliyor`, state: "pending" });
    }
    base.push({ key: "notify", label: "E-posta bildirimi", state: "pending" });
    setSteps(base);
    setRunning(true);

    try {
      // 1) Gorsel upload -> fal public URL
      setStep("upload", "active");
      const fd = new FormData();
      fd.append("file", file);
      const upRes = await fetch("/api/upload", { method: "POST", body: fd });
      const upData = await upRes.json();
      if (!upRes.ok) throw new Error(upData.error || "Gorsel yuklenemedi.");
      const imageUrl: string = upData.productImageUrl;
      setStep("upload", "done");

      // 2) Persona
      setStep("persona", "active");
      const { persona } = await postJson<{ persona: string }>("/api/persona", {
        productName,
        imageUrl,
        productDescription,
        targetAudience,
      });
      setStep("persona", "done");

      // 3) Senaryolar (5sn video -> 5sn senaryo, 10sn video -> 12sn senaryo)
      setStep("scripts", "active");
      const { scripts } = await postJson<{ scripts: string[] }>("/api/scripts", {
        persona,
        productName,
        imageUrl,
        productDescription,
        durationSec: duration === "10" ? 12 : 5,
      });
      const selected = scripts.slice(0, count);
      setStep("scripts", "done", `${selected.length} senaryo`);

      // 4) Her senaryo icin: kare -> video -> Drive
      const collected: VideoResult[] = [];
      for (let i = 0; i < selected.length; i++) {
        const stepKey = `video-${i + 1}`;
        const script = selected[i];

        setStep(stepKey, "active", "kare uretiliyor (Flux 1.1 Pro)");
        const frame = await postJson<{
          statusUrl: string;
          responseUrl: string;
        }>("/api/frame", {
          persona,
          imageUrl,
        });
        const frameUrl = await pollUntilDone(
          frame.statusUrl,
          frame.responseUrl,
          "image"
        );

        setStep(stepKey, "active", `video uretiliyor (Seedance 2.0, ${duration}sn)`);
        const vid = await postJson<{
          statusUrl: string;
          responseUrl: string;
        }>("/api/video", {
          imageUrl: frameUrl,
          prompt: script,
          duration,
        });
        const videoUrl = await pollUntilDone(
          vid.statusUrl,
          vid.responseUrl,
          "video"
        );

        setStep(stepKey, "active", "Drive'a yukleniyor");
        const fin = await postJson<{
          driveViewLink: string;
          driveDownloadLink: string;
        }>("/api/finalize", { videoUrl, productName, index: i + 1 });

        const item: VideoResult = {
          index: i + 1,
          videoUrl,
          driveViewLink: fin.driveViewLink,
          driveDownloadLink: fin.driveDownloadLink,
          script,
        };
        collected.push(item);
        setResults([...collected]);
        setStep(stepKey, "done");
      }

      // 5) E-posta bildirimi
      setStep("notify", "active");
      const notifyRes = await postJson<{ emailed: boolean }>("/api/notify", {
        to: email,
        productName,
        videos: collected.map((v) => ({
          index: v.index,
          driveViewLink: v.driveViewLink,
          driveDownloadLink: v.driveDownloadLink,
        })),
      });
      setEmailed(notifyRes.emailed);
      setStep("notify", notifyRes.emailed ? "done" : "done", notifyRes.emailed ? "gonderildi" : "alici yok");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Bilinmeyen hata";
      setError(msg);
      setSteps((prev) =>
        prev.map((s) => (s.state === "active" ? { ...s, state: "error" } : s))
      );
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="wrap">
      <div className="header">
        <h1>🎬 UGC Otomasyon</h1>
        <p>
          Urun fotografi + adi girin; sistem persona olusturur, 3 UGC senaryosu
          yazar, her biri icin kare (Flux 1.1 Pro) ve sesli video (Seedance 2.0)
          uretir, Google Drive'a yukler ve e-posta ile bildirir.
        </p>
      </div>

      <form className="card" onSubmit={handleSubmit}>
        <div className="row">
          <div className="field">
            <label>Urun adi *</label>
            <input
              type="text"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              placeholder="Or. Vitamin C Serum"
              disabled={running}
            />
          </div>
          <div className="field">
            <label>Kac varyasyon?</label>
            <select
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              disabled={running}
              style={{
                width: "100%",
                background: "var(--panel-2)",
                border: "1px solid var(--border)",
                borderRadius: 10,
                color: "var(--text)",
                padding: "11px 13px",
                fontSize: 14,
              }}
            >
              <option value={1}>1 video</option>
              <option value={2}>2 video</option>
              <option value={3}>3 video</option>
            </select>
          </div>
        </div>

        <div className="field">
          <label>Urun aciklamasi (opsiyonel)</label>
          <textarea
            value={productDescription}
            onChange={(e) => setProductDescription(e.target.value)}
            placeholder="Urun ne ise yarar, one cikan ozellikleri, faydalari..."
            disabled={running}
            rows={3}
            style={{
              width: "100%",
              background: "var(--panel-2)",
              border: "1px solid var(--border)",
              borderRadius: 10,
              color: "var(--text)",
              padding: "11px 13px",
              fontSize: 14,
              fontFamily: "inherit",
              resize: "vertical",
            }}
          />
        </div>

        <div className="row">
          <div className="field">
            <label>Hedef kitle (opsiyonel)</label>
            <input
              type="text"
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
              placeholder="Or. 25-35 yas calisan kadinlar"
              disabled={running}
            />
          </div>
          <div className="field">
            <label>Video suresi</label>
            <select
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              disabled={running}
              style={{
                width: "100%",
                background: "var(--panel-2)",
                border: "1px solid var(--border)",
                borderRadius: 10,
                color: "var(--text)",
                padding: "11px 13px",
                fontSize: 14,
              }}
            >
              <option value="5">5 saniye</option>
              <option value="10">10 saniye</option>
            </select>
          </div>
        </div>

        <div className="field">
          <label>Bildirim e-postasi (opsiyonel)</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="ornek@eposta.com"
            disabled={running}
          />
        </div>

        <div className="field">
          <label>Urun fotografi * (temiz / notr arka plan en iyi sonucu verir)</label>
          <div className="dropzone" onClick={() => fileInputRef.current?.click()}>
            {file ? (
              <>
                <div>{file.name}</div>
                {previewUrl && (
                  <img className="preview-img" src={previewUrl} alt="onizleme" />
                )}
              </>
            ) : (
              <div>Tiklayin veya bir gorsel secin (JPG / PNG)</div>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
            disabled={running}
          />
        </div>

        <button className="btn" type="submit" disabled={running}>
          {running ? "Uretiliyor..." : "Video Uret"}
        </button>
      </form>

      {steps.length > 0 && (
        <div className="steps">
          {steps.map((s, idx) => (
            <div key={s.key} className={`step ${s.state}`}>
              <span className="dot">
                {s.state === "done" ? "✓" : s.state === "error" ? "!" : idx + 1}
              </span>
              <span>
                {s.label}
                {s.note ? ` — ${s.note}` : ""}
              </span>
            </div>
          ))}
        </div>
      )}

      {error && <div className="error-box">⚠️ {error}</div>}

      {results.length > 0 && (
        <div className="result">
          <h3 style={{ marginTop: 24 }}>
            ✅ {results.length} video hazir{" "}
            {emailed && (
              <span style={{ color: "var(--ok)", fontSize: 14 }}>· e-posta gonderildi ✉️</span>
            )}
          </h3>
          {results.map((r) => (
            <div className="result card" key={r.index}>
              <strong>Video {r.index}</strong>
              <video src={r.videoUrl} controls playsInline style={{ marginTop: 10 }} />
              <div className="links">
                <a className="link-primary" href={r.driveViewLink} target="_blank" rel="noreferrer">
                  Drive'da Goruntule
                </a>
                <a className="link-secondary" href={r.driveDownloadLink} target="_blank" rel="noreferrer">
                  Indir
                </a>
              </div>
              <details className="script-box">
                <summary style={{ cursor: "pointer", color: "var(--text)" }}>
                  Senaryoyu goster
                </summary>
                {"\n"}
                {r.script}
              </details>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
