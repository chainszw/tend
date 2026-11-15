import type { Role } from "@/lib/types";

export const TEXT_SIZE_COOKIE = "tend_text";
export type TextSize = "normal" | "large";

/** Chosen text size, defaulting to large for the person being cared for. */
export function resolveTextSize(cookieValue: string | undefined, role: Role): TextSize {
  if (cookieValue === "large" || cookieValue === "normal") return cookieValue;
  return role === "elder" ? "large" : "normal";
}
