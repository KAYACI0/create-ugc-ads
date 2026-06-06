/**
 * Uctan uca test (Drive/e-posta haric): persona -> scripts -> frame -> video.
 * Calisan dev sunucusuna (http://localhost:3000) istek atar.
 * Kullanim: node scripts/e2e-test.mjs
 */
const BASE = "http://localhost:3000";
const IMG =
  "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600";
const PRODUCT = "Wireless Headphones";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function post(path, body) {
  const res = await fetch(BASE + path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`${path} -> ${res.status}: ${JSON.stringify(data)}`);
  return data;
}

async function poll(id, kind) {
  const max = kind === "video" ? 150 : 60;
  for (let i = 0; i < max; i++) {
    const res = await fetch(`${BASE}/api/status?id=${id}&kind=${kind}`);
    const d = await res.json();
    process.stdout.write(`\r   [${kind}] ${d.status} (${i * 4}s)        `);
    if (d.status === "COMPLETED") {
      console.log("");
      return d.url;
    }
    if (d.status === "ERROR") throw new Error(`${kind} ERROR`);
    await sleep(4000);
  }
  throw new Error("timeout");
}

(async () => {
  const t0 = Date.now();
  console.log("1) PERSONA...");
  const { persona } = await post("/api/persona", { productName: PRODUCT, imageUrl: IMG });
  console.log("   OK (" + persona.length + " karakter)");

  console.log("2) SCRIPTS (gemini-2.5-pro)...");
  const { scripts } = await post("/api/scripts", { persona, productName: PRODUCT, imageUrl: IMG });
  console.log("   OK -> " + scripts.length + " senaryo");
  console.log("   Senaryo 1 ilk 200 char: " + scripts[0].slice(0, 200).replace(/\n/g, " "));

  console.log("3) FRAME (flux i2i)...");
  const frame = await post("/api/frame", { persona, imageUrl: IMG });
  const frameUrl = await poll(frame.requestId, "image");
  console.log("   frameUrl: " + frameUrl);

  console.log("4) VIDEO (kling i2v)...");
  const vid = await post("/api/video", { imageUrl: frameUrl, prompt: scripts[0] });
  const videoUrl = await poll(vid.requestId, "video");
  console.log("   videoUrl: " + videoUrl);

  console.log(`\nTAMAM. Toplam ${Math.round((Date.now() - t0) / 1000)}s`);
})().catch((e) => {
  console.error("\nHATA:", e.message);
  process.exit(1);
});
