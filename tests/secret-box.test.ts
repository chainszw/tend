import { describe, expect, it } from "vitest";
import { deriveKey, openWith, sealWith } from "@/lib/secret-box";

const key = deriveKey("test-session-secret", "tend:passcode:v1");

describe("secret box", () => {
  it("round-trips a passcode", () => {
    expect(openWith(key, sealWith(key, "482913"))).toBe("482913");
  });

  it("never contains the plaintext and uses a fresh IV each time", () => {
    const first = sealWith(key, "482913");
    const second = sealWith(key, "482913");
    expect(first).not.toContain("482913");
    expect(first).not.toBe(second);
  });

  it("rejects tampered ciphertext and tags", () => {
    const [version, iv, tag, data] = sealWith(key, "482913").split("$");
    const flip = (text: string) => {
      const bytes = Buffer.from(text, "base64url");
      bytes[0] ^= 1;
      return bytes.toString("base64url");
    };
    expect(openWith(key, [version, iv, tag, flip(data)].join("$"))).toBeNull();
    expect(openWith(key, [version, iv, flip(tag), data].join("$"))).toBeNull();
  });

  it("rejects the wrong key", () => {
    const other = deriveKey("another-secret", "tend:passcode:v1");
    expect(openWith(other, sealWith(key, "482913"))).toBeNull();
  });

  it("derives different keys for different purposes", () => {
    expect(deriveKey("s", "a").equals(deriveKey("s", "b"))).toBe(false);
  });

  it("rejects malformed values", () => {
    for (const bad of ["", "482913", "v2$a$b$c", "v1$a$b", "v1$$$", "v1$a$b$c$d"]) {
      expect(openWith(key, bad)).toBeNull();
    }
  });
});
