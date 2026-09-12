import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { cva } from "class-variance-authority";
import { cn } from "cn";

const badgeVariants = cva(
  "fhint:group/badge fhint:inline-flex fhint:h-5 fhint:w-fit fhint:shrink-0 fhint:items-center fhint:justify-center fhint:gap-1 fhint:overflow-hidden fhint:rounded-4xl fhint:border fhint:border-transparent fhint:px-2 fhint:py-0.5 fhint:text-xs fhint:font-medium fhint:whitespace-nowrap fhint:transition-all fhint:focus-visible:border-ring fhint:focus-visible:ring-[3px] fhint:focus-visible:ring-ring/50 fhint:has-data-[icon=inline-end]:pr-1.5 fhint:has-data-[icon=inline-start]:pl-1.5 fhint:aria-invalid:border-destructive fhint:aria-invalid:ring-destructive/20 fhint:dark:aria-invalid:ring-destructive/40 fhint:[&>svg]:pointer-events-none fhint:[&>svg]:size-3!",
  {
    variants: {
      variant: {
        default:
          "fhint:bg-primary fhint:text-primary-foreground fhint:[a]:hover:bg-primary/80",
        secondary:
          "fhint:bg-secondary fhint:text-secondary-foreground fhint:[a]:hover:bg-secondary/80",
        destructive:
          "fhint:bg-destructive/10 fhint:text-destructive fhint:focus-visible:ring-destructive/20 fhint:dark:bg-destructive/20 fhint:dark:focus-visible:ring-destructive/40 fhint:[a]:hover:bg-destructive/20",
        outline:
          "fhint:border-border fhint:text-foreground fhint:[a]:hover:bg-muted fhint:[a]:hover:text-muted-foreground",
        ghost:
          "fhint:hover:bg-muted fhint:hover:text-muted-foreground fhint:dark:hover:bg-muted/50",
        link: "fhint:text-primary fhint:underline-offset-4 fhint:hover:underline",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Badge({ className, variant = "default", render, ...props }) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps(
      {
        className: cn(badgeVariants({ variant }), className),
      },
      props,
    ),
    render,
    state: {
      slot: "badge",
      variant,
    },
  });
}

export { Badge, badgeVariants };
