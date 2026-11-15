import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "cn";

/** Every size is at least 44px tall so buttons are easy to press. */
const buttonVariants = cva(
  "inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-xl border-2 font-bold whitespace-nowrap transition-colors select-none disabled:pointer-events-none disabled:opacity-55 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-5",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground hover:bg-[#0f3d2c]",
        outline: "border-primary bg-card text-primary hover:bg-leaf-soft",
        quiet: "border-transparent bg-well text-foreground hover:bg-[#d2dfd6]",
        ghost: "border-transparent text-foreground hover:bg-well",
        amber: "border-transparent bg-amber text-foreground hover:bg-[#e9a626]",
        destructive: "border-destructive bg-card text-destructive hover:bg-alarm-soft",
      },
      size: {
        default: "min-h-12 px-5 text-base",
        sm: "min-h-11 px-4 text-[0.95rem]",
        lg: "min-h-14 px-7 text-lg",
        icon: "size-12",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

function Button({
  className,
  variant,
  size,
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
