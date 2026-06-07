/**
 * Google AI Studio (Gemini API) cagrilari — ucretsiz katman.
 *   - generatePersona : gemini-2.5-flash -> persona profili
 *   - generateScripts : gemini-2.5-pro   -> 3 UGC senaryosu (JSON)
 *
 * OpenRouter URL ile gorsel gonderebiliyordu; Gemini API ise gorseli
 * inline base64 (inline_data) olarak ister. Bu yuzden urun gorselini
 * (fal storage public URL'si) once indirip base64'e ceviriyoruz.
 */
import {
  PERSONA_MODEL,
  SCRIPTS_MODEL,
  buildPersonaPrompt,
  buildScriptsPrompt,
} from "./prompts";

const GEMINI_BASE =
  "https://generativelanguage.googleapis.com/v1beta/models";

function apiKey(): string {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY tanimli degil.");
  return key;
}

/** Gorseli indirip base64 + mime tipi olarak dondurur (Gemini inline_data icin). */
async function fetchImageInline(
  imageUrl: string
): Promise<{ mimeType: string; data: string }> {
  const res = await fetch(imageUrl);
  if (!res.ok) {
    throw new Error(`Urun gorseli indirilemedi (${res.status}).`);
  }
  const mimeType = res.headers.get("content-type") || "image/jpeg";
  const buf = Buffer.from(await res.arrayBuffer());
  return { mimeType, data: buf.toString("base64") };
}

/** Vision destekli tek mesajli generateContent; metni dondurur. */
async function visionCompletion(
  model: string,
  text: string,
  imageUrl: string,
  opts?: { jsonMode?: boolean; maxTokens?: number }
): Promise<string> {
  const image = await fetchImageInline(imageUrl);

  const body: Record<string, unknown> = {
    contents: [
      {
        role: "user",
        parts: [
          { text },
          { inline_data: { mime_type: image.mimeType, data: image.data } },
        ],
      },
    ],
    generationConfig: {
      maxOutputTokens: opts?.maxTokens ?? 2048,
      ...(opts?.jsonMode ? { responseMimeType: "application/json" } : {}),
    },
  };

  const res = await fetch(`${GEMINI_BASE}/${model}:generateContent`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey(),
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Gemini API hatasi (${res.status}): ${t}`);
  }

  const json = await res.json();
  const parts = json?.candidates?.[0]?.content?.parts as
    | Array<{ text?: string }>
    | undefined;
  return (parts ?? [])
    .map((p) => p?.text ?? "")
    .join("")
    .toString();
}

/** 1) Persona profili uretir. */
export async function generatePersona(
  productName: string,
  imageUrl: string
): Promise<string> {
  const text = buildPersonaPrompt(productName);
  const persona = await visionCompletion(PERSONA_MODEL, text, imageUrl);
  if (!persona.trim()) throw new Error("Persona uretilemedi (bos yanit).");
  return persona.trim();
}

/** 2) 3 adet UGC senaryosu uretir. */
export async function generateScripts(
  persona: string,
  productName: string,
  imageUrl: string
): Promise<string[]> {
  const text = buildScriptsPrompt(persona, productName);
  const content = await visionCompletion(SCRIPTS_MODEL, text, imageUrl, {
    jsonMode: true,
    maxTokens: 8192, // 3 detayli senaryo icin
  });
  return parseScripts(content);
}

/**
 * Model ciktisindan scripts dizisini cikarir.
 * (workflow extract_prompts code node'unun mantigini izler.)
 */
function parseScripts(content: string): string[] {
  let scripts: string[] = [];

  // 1) Once temiz JSON dene
  const clean = content.replace(/```json\s*|\s*```/g, "").trim();
  try {
    const parsed = JSON.parse(clean);
    if (Array.isArray(parsed?.scripts)) scripts = parsed.scripts;
  } catch {
    // 2) Metin icinde gomulu JSON
    const m = clean.match(/\{[\s\S]*\}/);
    if (m) {
      try {
        const parsed = JSON.parse(m[0]);
        if (Array.isArray(parsed?.scripts)) scripts = parsed.scripts;
      } catch {
        /* asagidaki fallback */
      }
    }
  }

  // 3) Hala bossa "Script N" basliklarina gore bol
  if (scripts.length === 0) {
    const parts = clean
      .split(/\n(?:Video\s+)?Script\s+#?\d+/i)
      .filter((s) => s.trim().length > 100);
    scripts = parts.slice(0, 3);
  }
  if (scripts.length === 0) {
    const chunks = clean.split(/\n\n+/).filter((s) => s.trim().length > 80);
    scripts = chunks.slice(0, 3);
  }

  return scripts
    .slice(0, 3)
    .map((s) => normalizeScript(s))
    .filter((s) => s.length > 0);
}

/**
 * Senaryo elemanini okunabilir DUZ metne cevirir.
 * gemini bazen string yerine ic ice nesne dondurur
 * (or. {script_1: {title, energy, dialogue:{part_1..}, shots:{...}}}).
 * Tum string yaprak degerlerini, sirayi koruyarak toplayip birlestirir.
 */
function normalizeScript(s: unknown): string {
  if (typeof s === "string") return s.trim();
  const parts: string[] = [];
  collectStrings(s, parts);
  return parts.join(" ").replace(/\s+/g, " ").trim();
}

/** Bir degerdeki tum string yapraklarini (ic ice dahil) sirayla toplar. */
function collectStrings(value: unknown, out: string[]): void {
  if (value == null) return;
  if (typeof value === "string") {
    const t = value.trim();
    if (t) out.push(t);
    return;
  }
  if (typeof value === "number" || typeof value === "boolean") return;
  if (Array.isArray(value)) {
    for (const v of value) collectStrings(v, out);
    return;
  }
  if (typeof value === "object") {
    for (const v of Object.values(value as Record<string, unknown>)) {
      collectStrings(v, out);
    }
  }
}
