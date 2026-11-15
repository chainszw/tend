import { devAccessEnabled } from "@/lib/dev";
import { DEMO_CIRCLE_CODE } from "@/lib/dev-mode";
import { getCircle } from "@/lib/data";
import { getSession } from "@/lib/session";
import { DevModeToggle } from "@/components/dev/dev-mode-toggle";

/** Corner toggle that lets a reviewer skip sign-up. Renders nothing unless Dev mode is enabled. */
export async function DevMode() {
  if (!devAccessEnabled()) return null;
  const session = await getSession();
  const circle = session ? await getCircle(session.circleId) : null;
  const active = circle?.code === DEMO_CIRCLE_CODE;
  return <DevModeToggle active={active} role={active ? (session?.role ?? null) : null} />;
}
