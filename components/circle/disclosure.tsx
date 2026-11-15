import type { ReactNode, Ref } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface DisclosureProps {
  summary: ReactNode;
  children: ReactNode;
  className?: string;
  ref?: Ref<HTMLDetailsElement>;
}

/** A native show/hide section with a large, keyboard-friendly toggle. */
export function Disclosure({ summary, children, className, ref }: DisclosureProps) {
  return (
    <details ref={ref} className={cn("group", className)}>
      <summary className="flex min-h-12 w-fit cursor-pointer list-none items-center gap-2 rounded-xl text-lg font-bold text-primary hover:underline [&::-webkit-details-marker]:hidden">
        <ChevronDown
          aria-hidden="true"
          className="size-5 shrink-0 transition-transform group-open:rotate-180"
        />
        {summary}
      </summary>
      <div className="pt-2">{children}</div>
    </details>
  );
}
