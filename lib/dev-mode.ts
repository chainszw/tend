import type { Role } from "@/lib/types";

/** Code of the shared demo circle that Dev mode signs into. */
export const DEMO_CIRCLE_CODE = "DEMO-0000";

/**
 * Dev mode lets a reviewer open every screen of the demo circle without signing in.
 * It is always on in `next dev`. In production it is opt-in: set `DEV_MODE=on`
 * (and remove it to switch it off).
 */
export function isDevModeEnabled(env: { NODE_ENV?: string; DEV_MODE?: string }): boolean {
  return env.NODE_ENV === "development" || env.DEV_MODE === "on";
}

/** Every screen Dev mode can jump to, in the order a reviewer would walk through them. */
export const DEV_SCREENS = [
  { href: "/circle", label: "Today" },
  { href: "/circle/medications", label: "Medicines" },
  { href: "/circle/appointments", label: "Visits" },
  { href: "/circle/health", label: "Health" },
  { href: "/circle/companion", label: "Ask" },
  { href: "/circle/family", label: "Family" },
  { href: "/device", label: "3D device" },
] as const;

export type DevDestination = (typeof DEV_SCREENS)[number]["href"];

/** Only the listed screens are allowed, so the shortcut can never redirect anywhere else. */
export function isDevDestination(value: unknown): value is DevDestination {
  return DEV_SCREENS.some((screen) => screen.href === value);
}

export const DEV_ROLES: readonly { role: Role; label: string }[] = [
  { role: "elder", label: "Elder" },
  { role: "family", label: "Family" },
  { role: "caretaker", label: "Caretaker" },
];
