import Link from "next/link";

/** Two-tone capsule mark: the app's one recurring motif. */
export function Capsule({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-flex h-[0.7em] w-[1.5em] overflow-hidden rounded-full ring-2 ring-foreground/15 ${className}`}
    >
      <span className="h-full w-1/2 bg-primary" />
      <span className="h-full w-1/2 bg-amber" />
    </span>
  );
}

export function Wordmark({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-2 text-2xl font-extrabold tracking-tight">
      <Capsule />
      Tend
    </Link>
  );
}
