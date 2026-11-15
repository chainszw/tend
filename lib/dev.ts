import "server-only";
import { isDevModeEnabled } from "@/lib/dev-mode";

/** True when Dev mode (open the demo circle without signing in) is available. */
export function devAccessEnabled(): boolean {
  return isDevModeEnabled(process.env);
}
