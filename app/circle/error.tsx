"use client";

import { Button } from "@/components/ui/button";

export default function CircleError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div role="alert" className="max-w-xl rounded-2xl border-2 border-destructive bg-card p-6">
      <h1 className="text-2xl font-extrabold">This page could not load</h1>
      <p className="mt-2 text-muted-foreground">
        Nothing was lost. Check the internet connection, then load the page again.
      </p>
      <Button onClick={reset} className="mt-5">
        Load the page again
      </Button>
    </div>
  );
}
