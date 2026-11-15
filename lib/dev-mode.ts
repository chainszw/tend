/** Code of the shared demo circle that Dev mode signs into. */
export const DEMO_CIRCLE_CODE = "DEMO-0000";

/**
 * Dev mode lets a reviewer skip sign-up and open the demo circle. It is always on in
 * `next dev`. In production it is opt-in: set `DEV_MODE=on` (and remove it to switch it off).
 */
export function isDevModeEnabled(env: { NODE_ENV?: string; DEV_MODE?: string }): boolean {
  return env.NODE_ENV === "development" || env.DEV_MODE === "on";
}
