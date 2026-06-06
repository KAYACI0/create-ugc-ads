/**
 * fal.ai istemci sarmalayicisi (workflow ile ayni modeller/parametreler).
 *   - Kare  : fal-ai/flux/dev/image-to-image          (strength 0.78, portrait_4_3)
 *   - Video : fal-ai/kling-video/v2/master/image-to-video (5sn, 9:16)
 *
 * Vercel uyumu icin queue API: submit -> request_id, sonra polling.
 */
import { fal } from "@fal-ai/client";
import { VIDEO_NEGATIVE_PROMPT } from "./prompts";

const FAL_KEY = process.env.FAL_KEY;
if (!FAL_KEY) {
  console.warn("[fal] FAL_KEY tanimli degil. .env.local dosyasini kontrol edin.");
}
fal.config({ credentials: FAL_KEY });

// Not: tip kasitli olarak `string` -> @fal-ai/client InputType<string> = Record<string, any>
// boylece image_size / aspect_ratio gibi alanlar tip hatasi vermez.
export const FLUX_ENDPOINT: string = "fal-ai/flux/dev/image-to-image";
export const KLING_ENDPOINT: string =
  "fal-ai/kling-video/v2/master/image-to-video";

/** Bir dosyayi fal storage'a yukler, public URL dondurur. */
export async function uploadToFal(file: File | Blob): Promise<string> {
  return fal.storage.upload(file);
}

/** flux i2i kare uretimini queue'ya gonderir (workflow generate_frame ayarlari). */
export async function submitFrame(
  prompt: string,
  imageUrl: string
): Promise<string> {
  const { request_id } = await fal.queue.submit(FLUX_ENDPOINT, {
    input: {
      image_url: imageUrl,
      prompt,
      strength: 0.78,
      num_images: 1,
      image_size: "portrait_4_3",
      num_inference_steps: 28,
      guidance_scale: 3.5,
    },
  });
  return request_id;
}

/** Kling prompt'u en fazla 2500 karakter kabul eder; guvenli sinir. */
const KLING_PROMPT_MAX = 2400;

/** kling i2v video uretimini queue'ya gonderir (workflow generate_video1 ayarlari). */
export async function submitVideo(
  prompt: string,
  imageUrl: string
): Promise<string> {
  const safePrompt = prompt.slice(0, KLING_PROMPT_MAX);
  const { request_id } = await fal.queue.submit(KLING_ENDPOINT, {
    input: {
      image_url: imageUrl,
      prompt: safePrompt,
      duration: "5",
      aspect_ratio: "9:16",
      negative_prompt: VIDEO_NEGATIVE_PROMPT,
    },
  });
  return request_id;
}

export type FalStatus = "IN_QUEUE" | "IN_PROGRESS" | "COMPLETED" | "ERROR";

export interface FalStatusResult {
  status: FalStatus;
  url?: string;
  raw?: unknown;
}

/**
 * fal queue status/result icin BASE app id gerekir (ilk iki segment):
 *   fal-ai/flux/dev/image-to-image          -> fal-ai/flux
 *   fal-ai/kling-video/v2/master/i2v        -> fal-ai/kling-video
 * @fal-ai/client'in queue.status'u derin yollarda 422/405 verdigi icin
 * dogrudan REST kullaniyoruz (workflow ile ayni yaklasim).
 */
function baseApp(endpoint: string): string {
  return endpoint.split("/").slice(0, 2).join("/");
}

/** Bir isin durumunu sorgular; COMPLETED ise medya URL'sini normalize eder. */
export async function checkStatus(
  endpoint: string,
  requestId: string
): Promise<FalStatusResult> {
  const app = baseApp(endpoint);
  const headers = { Authorization: `Key ${FAL_KEY}` };

  const statusRes = await fetch(
    `https://queue.fal.run/${app}/requests/${requestId}/status`,
    { headers }
  );
  const statusJson = (await statusRes.json()) as { status?: string };
  const s = statusJson.status as FalStatus | undefined;

  if (s !== "COMPLETED") {
    return { status: (s ?? "IN_PROGRESS") as FalStatus, raw: statusJson };
  }

  const resultRes = await fetch(
    `https://queue.fal.run/${app}/requests/${requestId}`,
    { headers }
  );
  const data = (await resultRes.json()) as Record<string, unknown>;
  return { status: "COMPLETED", url: extractMediaUrl(data), raw: data };
}

/** flux ({images:[{url}]}) ve kling ({video:{url}}) ciktilarini destekler. */
function extractMediaUrl(data: Record<string, unknown>): string | undefined {
  const video = data.video as { url?: string } | undefined;
  if (video?.url) return video.url;

  const images = data.images as Array<{ url?: string }> | undefined;
  if (images?.[0]?.url) return images[0].url;

  const image = data.image as { url?: string } | undefined;
  if (image?.url) return image.url;

  return undefined;
}
