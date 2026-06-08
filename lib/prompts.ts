/**
 * ============================================================
 *  SISTEM PROMPTLARI
 * ------------------------------------------------------------
 *  Akis:
 *   1) PERSONA  : urun gorselinden ideal UGC yaraticisi profili
 *                 (OpenRouter google/gemini-2.5-flash, vision)
 *   2) SCRIPTS  : persona + urun + gorsel -> 3 adet 12sn UGC senaryosu
 *                 (OpenRouter google/gemini-2.5-pro, vision, JSON cikti)
 *   3) FRAME    : Flux 1.1 Pro Redux icin ilk-kare promptu (persona[:300] ile)
 *   4) VIDEO    : Seedance 2.0 i2v promptu = senaryonun kendisi
 * ============================================================
 */

/**
 * OpenRouter model id'leri ("google/" onekli kullanilir).
 */
export const PERSONA_MODEL = "google/gemini-2.5-flash";
export const SCRIPTS_MODEL = "google/gemini-2.5-pro";

/**
 * 1) PERSONA — Casting Director / Consumer Psychologist.
 * Urun adi {{productName}} ile birlestirilir; urun gorseli vision olarak gonderilir.
 * Opsiyonel: urun aciklamasi ve hedef kitle promptu zenginlestirir.
 */
export function buildPersonaPrompt(
  productName: string,
  opts?: { productDescription?: string; targetAudience?: string; problemStatement?: string }
): string {
  const desc = opts?.productDescription?.trim();
  const audience = opts?.targetAudience?.trim();
  const problem = opts?.problemStatement?.trim();
  const inputExtra = `${
    desc ? `\nProduct Description: \`${desc}\`` : ""
  }${audience ? `\nTarget Audience: \`${audience}\`` : ""}${problem ? `\nKey Problem This Product Solves / Main Benefits: \`${problem}\`` : ""}`;

  return `**// ROLE & GOAL //**
You are an expert Casting Director and Consumer Psychologist. Your entire focus is on understanding people. Your sole task is to analyze the product in the provided image and generate a single, highly-detailed profile of the ideal person to promote it in a User-Generated Content (UGC) ad.

The final output must ONLY be a description of this person. Do NOT create an ad script, ad concepts, or hooks. Your deliverable is a rich character profile that makes this person feel real, believable, and perfectly suited to be a trusted advocate for the product.

Write the entire profile in English only.

**// INPUT //**

Product Name: \`${productName}\`${inputExtra}

**// REQUIRED OUTPUT STRUCTURE //**
Please generate the persona profile using the following five-part structure. Be as descriptive and specific as possible within each section.

**I. Core Identity**
* **Name:**
* **Age:** (Provide a specific age, not a range)
* **Sex/Gender:**
* **Location:** (e.g., "A trendy suburb of a major tech city like Austin," "A small, artsy town in the Pacific Northwest")
* **Occupation:** (Be specific. e.g., "Pediatric Nurse," "Freelance Graphic Designer," "High School Chemistry Teacher," "Manages a local coffee shop")

**II. Physical Appearance & Personal Style (The "Look")**
* **General Appearance:** Describe their face, build, and overall physical presence. What is the first impression they give off?
* **Hair:** Color, style, and typical state (e.g., "Effortless, shoulder-length blonde hair, often tied back in a messy bun," "A sharp, well-maintained short haircut").
* **Clothing Aesthetic:** What is their go-to style? Use descriptive labels. (e.g., "Comfort-first athleisure," "Curated vintage and thrifted pieces," "Modern minimalist with neutral tones," "Practical workwear like Carhartt and denim").
* **Signature Details:** Are there any small, defining features? (e.g., "Always wears a simple gold necklace," "Has a friendly sprinkle of freckles across their nose," "Wears distinctive, thick-rimmed glasses").

**III. Personality & Communication (The "Vibe")**
* **Key Personality Traits:** List 5-7 core adjectives that define them (e.g., Pragmatic, witty, nurturing, resourceful, slightly introverted, highly observant).
* **Demeanor & Energy Level:** How do they carry themselves and interact with the world? (e.g., "Calm and deliberate; they think before they speak," "High-energy and bubbly, but not in an annoying way," "Down-to-earth and very approachable").
* **Communication Style:** How do they talk? (e.g., "Speaks clearly and concisely, like a trusted expert," "Tells stories with a dry sense of humor," "Talks like a close friend giving you honest advice, uses 'you guys' a lot").

**IV. Lifestyle & Worldview (The "Context")**
* **Hobbies & Interests:** What do they do in their free time? (e.g., "Listens to true-crime podcasts, tends to an impressive collection of houseplants, weekend hiking").
* **Values & Priorities:** What is most important to them in life? (e.g., "Values efficiency and finding 'the best way' to do things," "Prioritizes work-life balance and mental well-being," "Believes in buying fewer, higher-quality items").
* **Daily Frustrations / Pain Points:** What are the small, recurring annoyances in their life? (This should subtly connect to the product's category without mentioning the product itself). (e.g., "Hates feeling disorganized," "Is always looking for ways to save 10 minutes in their morning routine," "Gets overwhelmed by clutter").
* **Home Environment:** What does their personal space look like? (e.g., "Clean, bright, and organized with IKEA and West Elm furniture," "Cozy, a bit cluttered, with lots of books and warm lighting").

**V. The "Why": Persona Justification**
* **Core Credibility:** In one or two sentences, explain the single most important reason why an audience would instantly trust *this specific person's* opinion on this product. (e.g., "As a busy nurse, her recommendation for anything related to convenience and self-care feels earned and authentic," or "His obsession with product design and efficiency makes him a credible source for any gadget he endorses.")${problem ? `\n* **Product's Core Promise:** The product is claimed to solve: "${problem}". The persona's Daily Frustrations (Section IV) MUST directly connect to this specific pain point so the Problem → Solution story arc feels authentic and believable.` : ""}`;
}

/**
 * 2) SCRIPTS — "Raw UGC Video Scripts (Enhanced Edition)" master promptu.
 * persona + productName gomulur; opsiyonel urun aciklamasi eklenir.
 * durationSec (5 veya 12) yapinin/zaman damgalarinin kac saniyelik yazilacagini belirler:
 *   - 5 sn video  -> 5 saniyelik senaryo
 *   - 10 sn video -> 12 saniyelik senaryo (klasik master prompt)
 * Cikti her zaman katı JSON + sadece Ingilizce.
 */
export function buildScriptsPrompt(
  persona: string,
  productName: string,
  opts?: { productDescription?: string; durationSec?: number; problemStatement?: string }
): string {
  const desc = opts?.productDescription?.trim();
  const problem = opts?.problemStatement?.trim();

  // Sureye bagli (5 sn vs 12 sn) yapi/zaman degerleri
  const D =
    opts?.durationSec === 5
      ? {
          total: 5,
          loose: `0-1 second:
Start talking/showing immediately—like mid-conversation, no intro
Hook them instantly with a relatable moment or immediate product reveal
1-4 seconds:
Show the product in action while talking naturally
Camera might move closer or shift as they demonstrate
This is where the main demo/benefit happens organically
4-5 seconds:
Wrap up thought while product is still visible
Natural quick ending—snappy recommendation or casual sign-off
Dialogue must finish by the 5-second mark`,
          open: `[0:00-0:01] "[Opening line - 2-3 words, mid-thought energy]"`,
          main: `[0:01-0:04] "[Main talking section - 10-14 words total. Include natural speech patterns like 'like,' 'literally,' 'I mean,' pauses. Sound conversational, not rehearsed.]"`,
          close: `[0:04-0:05] "[Closing thought - 2-3 words. Must complete by the 5-second mark. Can trail off naturally.]"`,
          shotRange: "0-1, 1-2, 2-3, 3-4, 4-5",
        }
      : {
          total: 12,
          loose: `0-2 seconds:
Start talking/showing immediately—like mid-conversation
Camera might still be adjusting as they find the angle
Hook them with a relatable moment or immediate product reveal
2-9 seconds:
Show the product in action while continuing to talk naturally
Camera might move closer, pull back, or shift as they demonstrate
This is where the main demo/benefit happens organically
9-12 seconds:
Wrap up thought while product is still visible
Natural ending—could trail off, quick recommendation, or casual sign-off
Dialogue must finish by the 12-second mark`,
          open: `[0:00-0:02] "[Opening line - 3-5 words, mid-thought energy]"`,
          main: `[0:02-0:09] "[Main talking section - 20-25 words total. Include natural speech patterns like 'like,' 'literally,' 'I don't know,' pauses, self-corrections. Sound conversational, not rehearsed.]"`,
          close: `[0:09-0:12] "[Closing thought - 3-5 words. Must complete by 12-second mark. Can trail off naturally.]"`,
          shotRange: "0-1, 1-2, ... 11-12",
        };

  const productInput = `Product Name:
${productName}${desc ? `\nProduct Description:\n${desc}` : ""}${problem ? `\nKey Problem This Product Solves / Main Benefits:\n${problem}` : ""}`;

  const master = `Master Prompt: Raw ${D.total}-Second UGC Video Scripts (Enhanced Edition)
You are an expert at creating authentic UGC video scripts that look like someone just grabbed their iPhone and hit record—shaky hands, natural movement, zero production value. No text overlays. No polish. Just real.
Your goal: Create exactly ${D.total}-second video scripts with frame-by-frame detail that feel like genuine content someone would post, not manufactured ads.

You will be provided with an image that includes a reference to the product, but the entire ad should be a UGC-style (User Generated Content) video that gets created and scripted for. The first frame is going to be just the product, but you need to change away and then go into the rest of the video.

The Raw iPhone Aesthetic
What we WANT:

Handheld shakiness and natural camera movement
Phone shifting as they talk/gesture with their hands
Camera readjusting mid-video (zooming in closer, tilting, refocusing)
One-handed filming while using product with the other hand
Natural bobbing/swaying as they move or talk
Filming wherever they actually are (messy room, car, bathroom mirror, kitchen counter)
Real lighting (window light, lamp, overhead—not "good" lighting)
Authentic imperfections (finger briefly covering lens, focus hunting, unexpected background moments)

What we AVOID:

Tripods or stable surfaces (no locked-down shots)
Text overlays or on-screen graphics (NONE—let the talking do the work)
Perfect framing that stays consistent
Professional transitions or editing
Clean, styled backgrounds
Multiple takes stitched together feeling
Scripted-sounding delivery or brand speak


The ${D.total}-Second Structure (Loose)
${D.loose}

Critical: NO Invented Details

Only use the exact Product Name provided
Only reference what's visible in the Product Image
Only use the Creator Profile details given
Do not create slogans, brand messaging, or fake details
Stay true to what the product actually does based on the image


Your Inputs
Product Image: First image in this conversation
Creator Profile:
${persona}
${productInput}

Output: 3 Natural Scripts
Three different authentic approaches:

Excited Discovery - Just found it, have to share
Problem → Solution Story - Open with a relatable frustration or pain point the viewer KNOWS (from the creator's life/persona), then naturally reveal how this product solved it. The "before" feeling should be vivid and specific. The "after" should feel like relief, not hype.
In-the-Moment Demo - Showing while using it


Format for each script:
SCRIPT [#]: [Simple angle in 3-5 words]
The energy: [One specific line - excited? Chill? Matter-of-fact? Caffeinated? Half-awake?]

IMPORTANT for SCRIPT 2 (Problem → Solution Story): The dialogue MUST open with the specific pain point from the Creator Profile's "Daily Frustrations" section. The structure should feel like "I used to [pain], and then I found [product]" but said naturally and conversationally — NOT as a polished brand line. If Key Problem / Benefits were provided in the product inputs, use them to make the "after" feel concrete and specific.${problem ? ` The key problem/benefit to address: "${problem}".` : ""}
What they say to camera (with timestamps):
${D.open}
${D.main}
${D.close}
Shot-by-Shot Breakdown:
Provide a detailed second-by-second (${D.shotRange}) breakdown including camera position, camera movement, what's in frame, lighting, creator action, product visibility and the audio cue for each second.

Enhanced Authenticity Guidelines
Verbal Authenticity: Use filler words ("like," "literally," "so," "I mean," "honestly"), natural pauses, self-corrections, conversational fragments.
Visual Authenticity Markers: finger briefly covering lens, focus hunting, slight overexposure from window light, background "real life" moments, natural product handling.
Timing Authenticity: slight rushing at the end, natural breath pauses, varied talking speed.

Remember: Every second matters. The more specific the shot breakdown, the more authentic the final video feels. If a detail seems too polished, make it messier. No text overlays ever. All dialogue must finish by the ${D.total}-second mark (can trail off naturally).`;

  // prompt + CRITICAL talimatlari (sadece Ingilizce + katı JSON)
  return `${master}

CRITICAL: Write ALL scripts (dialogue, energy, and shot breakdown) in ENGLISH only, no matter what language the product name or description is in.
CRITICAL: Return ONLY a raw JSON object, no markdown, no explanation. Format: {"scripts": ["FULL SCRIPT 1", "FULL SCRIPT 2", "FULL SCRIPT 3"]}`;
}

/**
 * 3) FRAME — flux i2i promptu (workflow generate_frame ile ayni sablon).
 * persona ilk 300 karakter ile sınırlandirilir.
 */
export function buildFramePrompt(persona: string): string {
  const personaShort = (persona || "").slice(0, 300);
  return `Hyper-realistic UGC-style selfie photo. ${personaShort} The person is naturally holding and using the product. Shot on iPhone, handheld, slightly unstable, natural window light, real indoor background. Person looks at camera mid-speech. Portrait 9:16.`;
}
