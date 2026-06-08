/**
 * fal.ai istemci sarmalayicisi.
 *   - Kare  : fal-ai/flux-pro/v1.1/redux            (Flux 1.1 Pro, image-to-image)
 *   - Video : bytedance/seedance-2.0/image-to-video (Seedance 2.0, sesli, 9:16)
 *
 * Vercel uyumu icin queue API: submit -> request_id + status_url/response_url,
 * sonra tarayicidan polling. status_url/response_url'yi submit yanitindan
 * dogrudan tasiyoruz; boylece farkli model namespace'lerinde (fal-ai/... vs
 * bytedance/...) "base app" tahmini yapmak gerekmez.
 */
import { fal } from "@fal-ai/client";

const FAL_KEY = process.env.FAL_KEY;
if (!FAL_KEY) {
  console.warn("[fal] FAL_KEY tanimli degil. .env.local dosyasini kontrol edin.");
}
fal.config({ credentials: FAL_KEY });

// Not: tip kasitli olarak `string` -> @fal-ai/client InputType<string> = Record<string, any>
// boylece image_size / aspect_ratio gibi alanlar tip hatasi vermez.
export const FLUX_ENDPOINT: string = "fal-ai/flux-pro/v1.1/redux";
export const SEEDANCE_15_ENDPOINT: string =
  "fal-ai/bytedance/seedance/v1.5/pro/image-to-video";

/** Bir fal kuyruk isini takip etmek icin gereken referanslar. */
export interface FalJobRef {
  requestId: string;
  statusUrl: string;
  responseUrl: string;
}

/** Bir dosyayi fal storage'a yukler, public URL dondurur. */
export async function uploadToFal(file: File | Blob): Promise<string> {
  return fal.storage.upload(file);
}

/** Flux 1.1 Pro Redux ile UGC kare uretimini queue'ya gonderir. */
export async function submitFrame(
  prompt: string,
  imageUrl: string
): Promise<FalJobRef> {
  const sub = await fal.queue.submit(FLUX_ENDPOINT, {
    input: {
      image_url: imageUrl,
      prompt,
      image_size: "portrait_4_3",
      num_images: 1,
      num_inference_steps: 28,
      guidance_scale: 3.5,
    },
  });
  return {
    requestId: sub.request_id,
    statusUrl: sub.status_url,
    responseUrl: sub.response_url,
  };
}

/** Seedance 1.5 Pro prompt siniri. */
const VIDEO_PROMPT_MAX = 2500;

/** Seedance 1.5 Pro i2v video uretimini queue'ya gonderir (9:16, sesli, 720p). */
export async function submitVideo(
  prompt: string,
  imageUrl: string,
  duration: string = "5"
): Promise<FalJobRef> {
  const safePrompt = prompt.slice(0, VIDEO_PROMPT_MAX);
  // Seedance 1.5 Pro 4-12 sn araligini destekler.
  const safeDuration = duration === "10" ? "10" : "5";
  const sub = await fal.queue.submit(SEEDANCE_15_ENDPOINT, {
    input: {
      image_url: imageUrl,
      prompt: safePrompt,
      duration: safeDuration,
      aspect_ratio: "9:16",
      resolution: "720p",
      generate_audio: true,
    },
  });
  return {
    requestId: sub.request_id,
    statusUrl: sub.status_url,
    responseUrl: sub.response_url,
  };
}

export type FalStatus = "IN_QUEUE" | "IN_PROGRESS" | "COMPLETED" | "ERROR";

export interface FalStatusResult {
  status: FalStatus;
  url?: string;
  raw?: unknown;
}

/**
 * SSRF korumasi: status_url/response_url tarayicidan geri gelir; sunucu bu
 * URL'leri FAL_KEY ile cektigi icin yalnizca fal.run host'larina izin veririz.
 */
function assertFalUrl(u: string): URL {
  const url = new URL(u);
  if (url.protocol !== "https:" || !url.hostname.endsWith(".fal.run")) {
    throw new Error("Gecersiz fal URL.");
  }
  return url;
}

/**
 * Bir isin durumunu submit'ten gelen status_url/response_url ile sorgular.
 * COMPLETED ise response_url'den medya URL'sini normalize eder.
 */
export async function checkStatusByUrl(
  statusUrl: string,
  responseUrl: string
): Promise<FalStatusResult> {
  assertFalUrl(statusUrl);
  const headers = { Authorization: `Key ${FAL_KEY}` };

  const statusRes = await fetch(statusUrl, { headers });
  const statusJson = (await statusRes.json()) as { status?: string };
  const s = statusJson.status as FalStatus | undefined;

  if (s !== "COMPLETED") {
    return { status: (s ?? "IN_PROGRESS") as FalStatus, raw: statusJson };
  }

  assertFalUrl(responseUrl);
  const resultRes = await fetch(responseUrl, { headers });
  const data = (await resultRes.json()) as Record<string, unknown>;
  return { status: "COMPLETED", url: extractMediaUrl(data), raw: data };
}

/** flux ({images:[{url}]}) ve seedance ({video:{url}}) ciktilarini destekler. */
function extractMediaUrl(data: Record<string, unknown>): string | undefined {
  const video = data.video as { url?: string } | undefined;
  if (video?.url) return video.url;

  const images = data.images as Array<{ url?: string }> | undefined;
  if (images?.[0]?.url) return images[0].url;

  const image = data.image as { url?: string } | undefined;
  if (image?.url) return image.url;

  return undefined;
}
