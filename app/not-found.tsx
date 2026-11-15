import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main id="main" className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-start gap-4 px-5 py-20">
      <h1 className="text-4xl font-extrabold">That page does not exist</h1>
      <p className="text-lg text-muted-foreground">
        The link may be old or mistyped. Go back to the first page and start from there.
      </p>
      <Link href="/" className={buttonVariants()}>
        Go to the first page
      </Link>
    </main>
  );
}
