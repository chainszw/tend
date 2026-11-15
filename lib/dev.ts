import "server-only";
import { isDevModeEnabled } from "@/lib/dev-mode";

/** True when the Dev mode toggle (sign straight into the demo circle) is available. */
export function devAccessEnabled(): boolean {
  return isDevModeEnabled(process.env);
}
