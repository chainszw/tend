import * as React from "react";
import { cn } from "cn";

const fieldClasses =
  "w-full min-w-0 rounded-xl border-2 border-input bg-card px-4 text-base text-foreground placeholder:text-muted-foreground/80 disabled:cursor-not-allowed disabled:opacity-55 aria-invalid:border-destructive";

function Input({ className, ...props }: React.ComponentProps<"input">) {
  return <input data-slot="input" className={cn(fieldClasses, "min-h-12", className)} {...props} />;
}

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(fieldClasses, "min-h-28 py-3 leading-normal", className)}
      {...props}
    />
  );
}

function NativeSelect({ className, ...props }: React.ComponentProps<"select">) {
  return <select data-slot="select" className={cn(fieldClasses, "min-h-12", className)} {...props} />;
}

export { Input, NativeSelect, Textarea };
