"use client";

import { Toaster as Sonner, type ToasterProps } from "sonner";

/** Toast messages. Sonner announces them through an aria-live region. */
function Toaster(props: ToasterProps) {
  return (
    <Sonner
      theme="light"
      duration={6000}
      toastOptions={{
        style: {
          fontSize: "1rem",
          fontFamily: "inherit",
          padding: "1rem 1.125rem",
          borderRadius: "0.875rem",
          border: "1px solid var(--border)",
          background: "var(--card)",
          color: "var(--foreground)",
        },
      }}
      {...props}
    />
  );
}

export { Toaster };
