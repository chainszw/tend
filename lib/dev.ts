import "server-only";

/**
 * The developer shortcut (sign straight into a demo circle) exists only in
 * `next dev`. Production builds, including `next start` and Vercel, never
 * enable it, whatever the environment variables say.
 */
export function devAccessEnabled(): boolean {
  return process.env.NODE_ENV === "development";
}
