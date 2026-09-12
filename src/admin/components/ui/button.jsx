import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva } from "class-variance-authority";
import { cn } from "cn";

const buttonVariants = cva(
  "fhint:group/button fhint:inline-flex fhint:shrink-0 fhint:items-center fhint:justify-center fhint:rounded-md fhint:border fhint:border-transparent fhint:bg-clip-padding fhint:text-sm fhint:font-medium fhint:whitespace-nowrap fhint:transition-all fhint:outline-none fhint:select-none fhint:focus-visible:border-ring fhint:focus-visible:ring-3 fhint:focus-visible:ring-ring/50 fhint:active:not-aria-[haspopup]:translate-y-px fhint:disabled:pointer-events-none fhint:disabled:opacity-50 fhint:aria-invalid:border-destructive fhint:aria-invalid:ring-3 fhint:aria-invalid:ring-destructive/20 fhint:dark:aria-invalid:border-destructive/50 fhint:dark:aria-invalid:ring-destructive/40 fhint:[&_svg]:pointer-events-none fhint:[&_svg]:shrink-0 fhint:[&_svg:not([class*=size-])]:size-4",
  {
    variants: {
      variant: {
        default:
          "fhint:bg-primary fhint:text-primary-foreground fhint:hover:bg-primary/80",
        outline:
          "fhint:border-border fhint:bg-background fhint:shadow-xs fhint:hover:bg-muted fhint:hover:text-foreground fhint:aria-expanded:bg-muted fhint:aria-expanded:text-foreground fhint:dark:border-input fhint:dark:bg-input/30 fhint:dark:hover:bg-input/50",
        secondary:
          "fhint:bg-secondary fhint:text-secondary-foreground fhint:hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_5%)] fhint:aria-expanded:bg-secondary fhint:aria-expanded:text-secondary-foreground",
        ghost:
          "fhint:hover:bg-muted fhint:hover:text-foreground fhint:aria-expanded:bg-muted fhint:aria-expanded:text-foreground fhint:dark:hover:bg-muted/50",
        destructive:
          "fhint:bg-destructive/10 fhint:text-destructive fhint:hover:bg-destructive/20 fhint:focus-visible:border-destructive/40 fhint:focus-visible:ring-destructive/20 fhint:dark:bg-destructive/20 fhint:dark:hover:bg-destructive/30 fhint:dark:focus-visible:ring-destructive/40",
        link: "fhint:text-primary fhint:underline-offset-4 fhint:hover:underline",
      },
      size: {
        default:
          "fhint:h-9 fhint:gap-1.5 fhint:px-2.5 fhint:in-data-[slot=button-group]:rounded-md fhint:has-data-[icon=inline-end]:pr-2 fhint:has-data-[icon=inline-start]:pl-2",
        xs: "fhint:h-6 fhint:gap-1 fhint:rounded-[min(var(--radius-md),8px)] fhint:px-2 fhint:text-xs fhint:in-data-[slot=button-group]:rounded-md fhint:has-data-[icon=inline-end]:pr-1.5 fhint:has-data-[icon=inline-start]:pl-1.5 fhint:[&_svg:not([class*=size-])]:size-3",
        sm: "fhint:h-8 fhint:gap-1 fhint:rounded-[min(var(--radius-md),10px)] fhint:px-2.5 fhint:in-data-[slot=button-group]:rounded-md fhint:has-data-[icon=inline-end]:pr-1.5 fhint:has-data-[icon=inline-start]:pl-1.5",
        lg: "fhint:h-10 fhint:gap-1.5 fhint:px-2.5 fhint:has-data-[icon=inline-end]:pr-2 fhint:has-data-[icon=inline-start]:pl-2",
        icon: "fhint:size-9",
        "icon-xs":
          "fhint:size-6 fhint:rounded-[min(var(--radius-md),8px)] fhint:in-data-[slot=button-group]:rounded-md fhint:[&_svg:not([class*=size-])]:size-3",
        "icon-sm":
          "fhint:size-8 fhint:rounded-[min(var(--radius-md),10px)] fhint:in-data-[slot=button-group]:rounded-md",
        "icon-lg": "fhint:size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
