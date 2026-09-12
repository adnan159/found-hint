import * as React from "react";
import { cva } from "class-variance-authority";
import { cn } from "cn";

const alertVariants = cva(
  "fhint:group/alert fhint:relative fhint:grid fhint:w-full fhint:gap-0.5 fhint:rounded-lg fhint:border fhint:px-4 fhint:py-3 fhint:text-left fhint:text-sm fhint:has-data-[slot=alert-action]:relative fhint:has-data-[slot=alert-action]:pr-18 fhint:has-[>svg]:grid-cols-[auto_1fr] fhint:has-[>svg]:gap-x-2.5 fhint:*:[svg]:row-span-2 fhint:*:[svg]:translate-y-0.5 fhint:*:[svg]:text-current fhint:*:[svg:not([class*=size-])]:size-4",
  {
    variants: {
      variant: {
        default: "fhint:bg-card fhint:text-card-foreground",
        destructive:
          "fhint:bg-card fhint:text-destructive fhint:*:data-[slot=alert-description]:text-destructive/90 fhint:*:[svg]:text-current",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Alert({ className, variant, ...props }) {
  return (
    <div
      data-slot="alert"
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  );
}

function AlertTitle({ className, ...props }) {
  return (
    <div
      data-slot="alert-title"
      className={cn(
        "fhint:font-medium fhint:group-has-[>svg]/alert:col-start-2 fhint:[&_a]:underline fhint:[&_a]:underline-offset-3 fhint:[&_a]:hover:text-foreground",
        className,
      )}
      {...props}
    />
  );
}

function AlertDescription({ className, ...props }) {
  return (
    <div
      data-slot="alert-description"
      className={cn(
        "fhint:text-sm fhint:text-balance fhint:text-muted-foreground fhint:md:text-pretty fhint:[&_a]:underline fhint:[&_a]:underline-offset-3 fhint:[&_a]:hover:text-foreground fhint:[&_p:not(:last-child)]:mb-4",
        className,
      )}
      {...props}
    />
  );
}

function AlertAction({ className, ...props }) {
  return (
    <div
      data-slot="alert-action"
      className={cn("fhint:absolute fhint:top-2.5 fhint:right-3", className)}
      {...props}
    />
  );
}

export { Alert, AlertTitle, AlertDescription, AlertAction };
