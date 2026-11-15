"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useT } from "@/components/i18n/language-provider";
import type { Messages } from "@/lib/i18n";
import {
  Activity,
  CalendarDays,
  MessageCircleQuestion,
  Pill,
  Sun,
  UsersRound,
  type LucideIcon,
} from "lucide-react";

const ITEMS: { href: string; label: keyof Messages["nav"]; icon: LucideIcon }[] = [
  { href: "/circle", label: "today", icon: Sun },
  { href: "/circle/medications", label: "medicines", icon: Pill },
  { href: "/circle/appointments", label: "visits", icon: CalendarDays },
  { href: "/circle/health", label: "health", icon: Activity },
  { href: "/circle/companion", label: "ask", icon: MessageCircleQuestion },
  { href: "/circle/family", label: "family", icon: UsersRound },
];

/** Main navigation: a bottom bar on phones, a row of tabs on wider screens. */
export function CircleNav() {
  const pathname = usePathname();
  const t = useT();
  return (
    <nav
      aria-label={t.mainNav}
      className="fixed inset-x-0 bottom-0 z-40 border-t-2 border-border bg-card pb-[env(safe-area-inset-bottom)] md:static md:border-t-0 md:bg-transparent md:pb-0"
    >
      <ul className="mx-auto grid max-w-6xl grid-cols-6 md:flex md:gap-2 md:px-5">
        {ITEMS.map(({ href, label, icon: Icon }) => {
          const active = href === "/circle" ? pathname === href : pathname.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className="flex min-h-16 flex-col items-center justify-center gap-0.5 px-0.5 text-[0.72rem] font-bold text-muted-foreground aria-[current=page]:text-primary md:min-h-12 md:flex-row md:gap-2 md:rounded-full md:px-5 md:text-base md:aria-[current=page]:bg-primary md:aria-[current=page]:text-primary-foreground md:hover:bg-well md:aria-[current=page]:hover:bg-primary"
              >
                <Icon aria-hidden="true" className="size-6 md:size-5" strokeWidth={active ? 2.5 : 2} />
                {t.nav[label]}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
