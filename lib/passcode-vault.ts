import "server-only";
import { requireEnv } from "@/lib/env";
import { deriveKey, openWith, sealWith } from "@/lib/secret-box";

function passcodeKey(): Buffer {
  return deriveKey(requireEnv("SESSION_SECRET"), "tend:passcode:v1");
}

/** Encrypts a circle passcode so signed-in members can see it later. */
export function sealPasscode(passcode: string): string {
  return sealWith(passcodeKey(), passcode);
}

/** Decrypts a stored circle passcode, or null when it cannot be read. */
export function openPasscode(sealed: string): string | null {
  return openWith(passcodeKey(), sealed);
}
