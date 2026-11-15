import Link from "next/link";
import { Wordmark } from "@/components/wordmark";
import { buttonVariants } from "@/components/ui/button";

export default function PublicLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-5 py-5">
        <Wordmark />
        <nav aria-label="Account" className="flex items-center gap-2">
          <Link href="/join" className={buttonVariants({ variant: "ghost", size: "sm" })}>
            Join with a code
          </Link>
          <Link href="/create" className={buttonVariants({ size: "sm", className: "max-sm:hidden" })}>
            Start a circle
          </Link>
        </nav>
      </header>
      <main id="main" className="flex-1">
        {children}
      </main>
      <footer className="mx-auto w-full max-w-6xl px-5 py-8 text-[0.95rem] text-muted-foreground">
        Tend supports the care a doctor or pharmacist gives. It does not replace it.
      </footer>
    </>
  );
}
