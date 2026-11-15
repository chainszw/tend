import type { Metadata } from "next";
import Link from "next/link";
import { CreateForm } from "@/components/public/create-form";

export const metadata: Metadata = { title: "Create Family" };

export default function CreatePage() {
  return (
    <div className="mx-auto w-full max-w-2xl px-5 pb-16 pt-6">
      <h1 className="text-4xl font-extrabold">Create Family</h1>
      <p className="mt-3 text-lg text-muted-foreground">
        A family holds one person&apos;s medicines and appointments. You will get a code to share
        with family and caretakers.
      </p>
      <div className="mt-8 rounded-2xl border-2 border-border bg-card p-6 sm:p-8">
        <CreateForm />
      </div>
      <p className="mt-6">
        Already have a code?{" "}
        <Link href="/join" className="font-bold text-primary underline underline-offset-4">
          Join a family
        </Link>
      </p>
    </div>
  );
}
