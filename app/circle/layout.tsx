import type { Metadata } from "next";
import { cookies } from "next/headers";
import { LogOut } from "lucide-react";
import { signOutAction } from "@/app/actions/auth";
import { CircleNav } from "@/components/circle/circle-nav";
import { SettingsMenu } from "@/components/circle/settings-menu";
import { LanguageProvider } from "@/components/i18n/language-provider";
import { Button } from "@/components/ui/button";
import { Wordmark } from "@/components/wordmark";
import { messages } from "@/lib/i18n";
import {
  LANGUAGE_COOKIE,
  TEXT_SIZE_COOKIE,
  resolveLanguage,
  resolveTextSize,
} from "@/lib/preferences";
import { requireSession } from "@/lib/session";
import { loadCircle } from "@/lib/snapshot";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function CircleLayout({
  children,
}: LayoutProps<"/circle">) {
  const session = await requireSession();
  const [circle, cookieStore] = await Promise.all([
    loadCircle(session.circleId),
    cookies(),
  ]);
  const textSize = resolveTextSize(
    cookieStore.get(TEXT_SIZE_COOKIE)?.value,
    session.role,
  );
  const lang = resolveLanguage(cookieStore.get(LANGUAGE_COOKIE)?.value);
  const t = messages(lang);

  return (
    <LanguageProvider lang={lang}>
      <div lang={lang} className="flex min-h-dvh flex-col">
        <style>{`html{font-size:${textSize}%}`}</style>
        <header className="border-b-2 border-border bg-card">
          <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-5 py-3">
            <div className="flex min-w-0 flex-col">
              <Wordmark />
              <p className="truncate text-[0.95rem] text-muted-foreground">
                {t.circleLine(circle.elder_name, session.name)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <SettingsMenu initial={textSize} />
              <form action={signOutAction}>
                <Button type="submit" variant="ghost" size="sm">
                  <LogOut aria-hidden="true" />
                  {t.signOut}
                </Button>
              </form>
            </div>
          </div>
          <div className="md:pb-3">
            <CircleNav />
          </div>
        </header>
        <main
          id="main"
          className="mx-auto w-full max-w-6xl flex-1 px-5 pb-28 pt-7 md:pb-14"
        >
          {children}
        </main>
      </div>
    </LanguageProvider>
  );
}
