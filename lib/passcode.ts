import { randomBytes, randomInt, scrypt, timingSafeEqual } from "node:crypto";

const KEY_LENGTH = 32;
const SALT_LENGTH = 16;

const CODE_WORDS = [
  "MAPLE", "CEDAR", "OLIVE", "LOTUS", "RIVER", "AMBER", "HAVEN", "TULIP",
  "ROBIN", "CORAL", "BIRCH", "DAISY", "PEARL", "SUNNY", "MANGO", "NEEM",
] as const;

function derive(passcode: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(passcode, salt, KEY_LENGTH, (error, key) => {
      if (error) reject(error);
      else resolve(key);
    });
  });
}

/** Hashes a passcode with a random salt. Format: `scrypt$<salt>$<hash>` (hex). */
export async function hashPasscode(passcode: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH);
  const key = await derive(passcode, salt);
  return `scrypt$${salt.toString("hex")}$${key.toString("hex")}`;
}

/** Constant-time check of a passcode against a stored hash. */
export async function verifyPasscode(
  passcode: string,
  stored: string,
): Promise<boolean> {
  const [scheme, saltHex, hashHex] = stored.split("$");
  if (scheme !== "scrypt" || !saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, "hex");
  const actual = await derive(passcode, Buffer.from(saltHex, "hex"));
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

/** Generates a friendly circle code such as `MAPLE-4821`. */
export function generateCircleCode(): string {
  const word = CODE_WORDS[randomInt(CODE_WORDS.length)];
  const digits = String(randomInt(10_000)).padStart(4, "0");
  return `${word}-${digits}`;
}

/** Normalises user-typed circle codes ("maple 4821" → "MAPLE-4821"). */
export function normaliseCircleCode(input: string): string {
  const cleaned = input.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const match = /^([A-Z]+)(\d{4})$/.exec(cleaned);
  return match ? `${match[1]}-${match[2]}` : input.trim().toUpperCase();
}
