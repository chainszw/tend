import type { Metadata } from "next";
import Link from "next/link";
import { JoinForm } from "@/components/public/join-form";

export const metadata: Metadata = { title: "Join a care circle" };

export default function JoinPage() {
  return (
    <div className="mx-auto w-full max-w-2xl px-5 pb-16 pt-6">
      <h1 className="text-4xl font-extrabold">Join a care circle</h1>
      <p className="mt-3 text-lg text-muted-foreground">
        Enter the circle code and passcode you were given. If you have joined before, this signs
        you back in.
      </p>
      <div className="mt-8 rounded-2xl border-2 border-border bg-card p-6 sm:p-8">
        <JoinForm />
      </div>
      <p className="mt-6">
        Setting this up for the first time?{" "}
        <Link href="/create" className="font-bold text-primary underline underline-offset-4">
          Start a care circle
        </Link>
      </p>
    </div>
  );
}
