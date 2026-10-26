import { cva } from "class-variance-authority";
import { cn } from "cn";

function Empty({ className, ...props }) {
  return (
    <div
      data-slot="empty"
      className={cn(
        "fhint:flex fhint:w-full fhint:min-w-0 fhint:flex-1 fhint:flex-col fhint:items-center fhint:justify-center fhint:gap-4 fhint:rounded-lg fhint:border-dashed fhint:p-12 fhint:text-center fhint:text-balance",
        className,
      )}
      {...props}
    />
  );
}

function EmptyHeader({ className, ...props }) {
  return (
    <div
      data-slot="empty-header"
      className={cn(
        "fhint:flex fhint:max-w-sm fhint:flex-col fhint:items-center fhint:gap-2",
        className,
      )}
      {...props}
    />
  );
}

const emptyMediaVariants = cva(
  "fhint:mb-2 fhint:flex fhint:shrink-0 fhint:items-center fhint:justify-center fhint:[&_svg]:pointer-events-none fhint:[&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "fhint:bg-transparent",
        icon: "fhint:flex fhint:size-10 fhint:shrink-0 fhint:items-center fhint:justify-center fhint:rounded-lg fhint:bg-muted fhint:text-foreground fhint:[&_svg:not([class*=size-])]:size-6",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function EmptyMedia({ className, variant = "default", ...props }) {
  return (
    <div
      data-slot="empty-icon"
      data-variant={variant}
      className={cn(emptyMediaVariants({ variant, className }))}
      {...props}
    />
  );
}

function EmptyTitle({ className, ...props }) {
  return (
    <div
      data-slot="empty-title"
      className={cn(
        "fhint:font-heading fhint:text-lg fhint:font-medium fhint:tracking-tight",
        className,
      )}
      {...props}
    />
  );
}

function EmptyDescription({ className, ...props }) {
  return (
    <div
      data-slot="empty-description"
      className={cn(
        "fhint:text-sm/relaxed fhint:text-muted-foreground fhint:[&>a]:underline fhint:[&>a]:underline-offset-4 fhint:[&>a:hover]:text-primary",
        className,
      )}
      {...props}
    />
  );
}

function EmptyContent({ className, ...props }) {
  return (
    <div
      data-slot="empty-content"
      className={cn(
        "fhint:flex fhint:w-full fhint:max-w-sm fhint:min-w-0 fhint:flex-col fhint:items-center fhint:gap-4 fhint:text-sm fhint:text-balance",
        className,
      )}
      {...props}
    />
  );
}

export {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
  EmptyMedia,
};
