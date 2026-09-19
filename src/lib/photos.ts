import { supabase } from "@/integrations/supabase/client";

export const PHOTO_BUCKET = "profile-photos";

const signedCache = new Map<string, { url: string; expires: number }>();

/**
 * Photos live in a private bucket, so display needs a short-lived signed URL.
 * Demo people use bundled images and are stored as plain "/demo/..." paths.
 */
export async function photoUrl(path: string | null): Promise<string | null> {
  if (!path) return null;
  if (path.startsWith("/") || path.startsWith("http")) return path;

  const cached = signedCache.get(path);
  if (cached && cached.expires > Date.now()) return cached.url;

  const { data } = await supabase.storage.from(PHOTO_BUCKET).createSignedUrl(path, 3600);
  if (!data?.signedUrl) return null;
  signedCache.set(path, { url: data.signedUrl, expires: Date.now() + 50 * 60 * 1000 });
  return data.signedUrl;
}

const MAX_BYTES = 3 * 1024 * 1024;

async function compress(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const maxSide = 1280;
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, width, height);
  return new Promise<Blob>((resolve) =>
    canvas.toBlob((blob) => resolve(blob ?? file), "image/jpeg", 0.85),
  );
}

export async function uploadProfilePhoto(file: File, userId: string): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Please choose an image file.");
  }
  if (file.size > 12 * 1024 * 1024) {
    throw new Error("That image is too large. Please pick one under 12 MB.");
  }
  const blob = await compress(file);
  if (blob.size > MAX_BYTES) {
    throw new Error("That image is too large even after resizing. Try another one.");
  }
  const path = `${userId}/photo-${Date.now()}.jpg`;
  const { error } = await supabase.storage
    .from(PHOTO_BUCKET)
    .upload(path, blob, { contentType: "image/jpeg", upsert: true });
  if (error) throw new Error(error.message);
  return path;
}
