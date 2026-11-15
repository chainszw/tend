import type { Metadata } from "next";
import { cookies } from "next/headers";
import { LogOut, ZoomIn, ZoomOut } from "lucide-react";
import { signOutAction } from "@/app/actions/auth";
import { setTextSizeAction } from "@/app/actions/circle";
import { CircleNav } from "@/components/circle/circle-nav";
import { Button } from "@/components/ui/button";
import { Wordmark } from "@/components/wordmark";
import { TEXT_SIZE_COOKIE, resolveTextSize } from "@/lib/preferences";
import { requireSession } from "@/lib/session";
import { loadCircle } from "@/lib/snapshot";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function CircleLayout({ children }: LayoutProps<"/circle">) {
  const session = await requireSession();
  const [circle, cookieStore] = await Promise.all([loadCircle(session.circleId), cookies()]);
  const textSize = resolveTextSize(cookieStore.get(TEXT_SIZE_COOKIE)?.value, session.role);
  const isLarge = textSize === "large";

  return (
    <div data-text-size={textSize} className="flex min-h-dvh flex-col">
      <header className="border-b-2 border-border bg-card">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-5 py-3">
          <div className="flex min-w-0 flex-col">
            <Wordmark href="/circle" />
            <p className="truncate text-[0.95rem] text-muted-foreground">
              {circle.elder_name}&apos;s care circle, signed in as {session.name}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <form action={setTextSizeAction.bind(null, isLarge ? "normal" : "large")}>
              <Button type="submit" variant="quiet" size="sm" aria-pressed={isLarge}>
                {isLarge ? <ZoomOut aria-hidden="true" /> : <ZoomIn aria-hidden="true" />}
                {isLarge ? "Standard text" : "Larger text"}
              </Button>
            </form>
            <form action={signOutAction}>
              <Button type="submit" variant="ghost" size="sm">
                <LogOut aria-hidden="true" />
                Sign out
              </Button>
            </form>
          </div>
        </div>
        <div className="md:pb-3">
          <CircleNav />
        </div>
      </header>
      <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-5 pb-28 pt-7 md:pb-14">
        {children}
      </main>
    </div>
  );
}
