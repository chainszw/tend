import { DevModePanel } from "@/components/dev/dev-mode-panel";
import { devAccessEnabled } from "@/lib/dev";

/** Corner shortcut to every screen of the demo family. Renders nothing unless Dev mode is enabled. */
export function DevMode() {
  return devAccessEnabled() ? <DevModePanel /> : null;
}
