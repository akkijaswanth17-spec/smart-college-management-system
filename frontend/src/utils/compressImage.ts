/**
 * Downscales an image client-side before upload. Phone camera photos are
 * routinely 3-8MB at full resolution, well past what a small avatar needs
 * (and past the server's upload cap) — this brings any source photo down to
 * a sane size before it ever leaves the browser.
 */
export async function compressImage(file: File, maxDimension = 512, quality = 0.85): Promise<Blob> {
  // "from-image" makes the decode respect the photo's EXIF orientation tag —
  // without it, portrait phone photos come out rotated sideways.
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, width, height);

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
  return blob ?? file;
}
