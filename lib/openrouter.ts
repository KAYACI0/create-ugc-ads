/**
 * OpenRouter cagrilari (vision).
 *   - generatePersona : google/gemini-2.0-flash-001  -> persona profili
 *   - generateScripts : google/gemini-2.5-pro        -> 3 UGC senaryosu (JSON)
 *
 * Urun gorseli, OpenRouter'a public bir URL olarak image_url ile gonderilir
 * (workflow base64 kullaniyordu; URL de ayni sekilde desteklenir ve daha hafiftir).
 */
import {
  PERSONA_MODEL,
  SCRIPTS_MODEL,
  buildPersonaPrompt,
  buildScriptsPrompt,
} from "./prompts";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

function headers() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY tanimli degil.");
  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    "HTTP-Referer": process.env.APP_URL || "http://localhost:3000",
    "X-Title": "UGC Otomasyon",
  };
}

/** Vision destekli tek mesajli chat completion; metni dondurur. */
async function visionCompletion(
  model: string,
  text: string,
  imageUrl: string,
  opts?: { jsonMode?: boolean; maxTokens?: number }
): Promise<string> {
  const body: Record<string, unknown> = {
    model,
    // max_tokens olmadan OpenRouter modelin tum tavanini pesin rezerve eder;
    // bu free-tier'da kredi yetersizligine yol acar.
    max_tokens: opts?.maxTokens ?? 2048,
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text },
          { type: "image_url", image_url: { url: imageUrl } },
        ],
      },
    ],
  };
  if (opts?.jsonMode) body.response_format = { type: "json_object" };

  const res = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const t = await res.text();
    throw new Error(`OpenRouter hatasi (${res.status}): ${t}`);
  }
  const json = await res.json();
  return (json?.choices?.[0]?.message?.content ?? "").toString();
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
 * Boylece Kling'e gidecek prompt hem okunabilir hem de JSON kalabaligi olmadan olur.
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
