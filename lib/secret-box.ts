import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from "node:crypto";

const VERSION = "v1";
const IV_LENGTH = 12;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;

/** Derives a 32-byte AES key from a secret, scoped by `info` so keys never collide. */
export function deriveKey(secret: string, info: string): Buffer {
  return Buffer.from(hkdfSync("sha256", secret, "tend", info, KEY_LENGTH));
}

/** Encrypts text with AES-256-GCM. Format: `v1$<iv>$<tag>$<ciphertext>` (base64url). */
export function sealWith(key: Buffer, text: string): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [VERSION, iv, tag, ciphertext].map((part) =>
    typeof part === "string" ? part : part.toString("base64url"),
  ).join("$");
}

/** Decrypts a value from `sealWith`. Returns null if it was tampered with or the key is wrong. */
export function openWith(key: Buffer, sealed: string): string | null {
  const [version, ivText, tagText, dataText, ...rest] = sealed.split("$");
  if (version !== VERSION || !ivText || !tagText || dataText === undefined || rest.length > 0) {
    return null;
  }
  try {
    const iv = Buffer.from(ivText, "base64url");
    const tag = Buffer.from(tagText, "base64url");
    if (iv.length !== IV_LENGTH || tag.length !== TAG_LENGTH) return null;
    const decipher = createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([
      decipher.update(Buffer.from(dataText, "base64url")),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    return null;
  }
}
