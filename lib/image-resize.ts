const MAX_SIDE = 2000;
const QUALITY = 0.85;

/**
 * Shrinks a phone photo in the browser so it uploads quickly and fits the
 * Server Action body limit. Converts to JPEG; returns the original file if the
 * browser cannot decode it.
 */
export async function shrinkImage(file: File): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) {
      bitmap.close();
      return file;
    }
    context.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", QUALITY));
    if (!blob) return file;
    // Always send the JPEG for formats the server does not accept (e.g. HEIC).
    const accepted = /^image\/(jpeg|png|webp)$/.test(file.type);
    return !accepted || blob.size < file.size ? blob : file;
  } catch {
    return file;
  }
}
