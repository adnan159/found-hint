import { useMemo } from "react";
import { cva } from "class-variance-authority";
import { cn } from "cn";

import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

function FieldSet({ className, ...props }) {
  return (
    <fieldset
      data-slot="field-set"
      className={cn(
        "fhint:flex fhint:flex-col fhint:gap-6 fhint:has-[>[data-slot=checkbox-group]]:gap-3 fhint:has-[>[data-slot=radio-group]]:gap-3",
        className,
      )}
      {...props}
    />
  );
}

function FieldLegend({ className, variant = "legend", ...props }) {
  return (
    <legend
      data-slot="field-legend"
      data-variant={variant}
      className={cn(
        "fhint:mb-3 fhint:font-medium fhint:data-[variant=label]:text-sm fhint:data-[variant=legend]:text-base",
        className,
      )}
      {...props}
    />
  );
}

function FieldGroup({ className, ...props }) {
  return (
    <div
      data-slot="field-group"
      className={cn(
        "fhint:group/field-group fhint:@container/field-group fhint:flex fhint:w-full fhint:flex-col fhint:gap-7 fhint:data-[slot=checkbox-group]:gap-3 fhint:*:data-[slot=field-group]:gap-4",
        className,
      )}
      {...props}
    />
  );
}

const fieldVariants = cva(
  "fhint:group/field fhint:flex fhint:w-full fhint:gap-3 fhint:data-[invalid=true]:text-destructive",
  {
    variants: {
      orientation: {
        vertical: "fhint:flex-col fhint:*:w-full fhint:[&>.sr-only]:w-auto",
        horizontal:
          "fhint:flex-row fhint:items-center fhint:has-[>[data-slot=field-content]]:items-start fhint:*:data-[slot=field-label]:flex-auto fhint:has-[>[data-slot=field-content]]:[&>[role=checkbox],[role=radio]]:mt-px",
        responsive:
          "fhint:flex-col fhint:*:w-full fhint:@md/field-group:flex-row fhint:@md/field-group:items-center fhint:@md/field-group:*:w-auto fhint:@md/field-group:has-[>[data-slot=field-content]]:items-start fhint:@md/field-group:*:data-[slot=field-label]:flex-auto fhint:[&>.sr-only]:w-auto fhint:@md/field-group:has-[>[data-slot=field-content]]:[&>[role=checkbox],[role=radio]]:mt-px",
      },
    },
    defaultVariants: {
      orientation: "vertical",
    },
  },
);

function Field({ className, orientation = "vertical", ...props }) {
  return (
    <div
      role="group"
      data-slot="field"
      data-orientation={orientation}
      className={cn(fieldVariants({ orientation }), className)}
      {...props}
    />
  );
}

function FieldContent({ className, ...props }) {
  return (
    <div
      data-slot="field-content"
      className={cn(
        "fhint:group/field-content fhint:flex fhint:flex-1 fhint:flex-col fhint:gap-1 fhint:leading-snug",
        className,
      )}
      {...props}
    />
  );
}

function FieldLabel({ className, ...props }) {
  return (
    <Label
      data-slot="field-label"
      className={cn(
        "fhint:group/field-label fhint:peer/field-label fhint:flex fhint:w-fit fhint:gap-2 fhint:leading-snug fhint:group-data-[disabled=true]/field:opacity-50 fhint:has-data-checked:border-primary/30 fhint:has-data-checked:bg-primary/5 fhint:has-[>[data-slot=field]]:rounded-md fhint:has-[>[data-slot=field]]:border fhint:has-[>[data-slot=field]]:not-has-[:disabled,[data-disabled]]:hover:bg-muted/50 fhint:has-[>[data-slot=field]]:has-[:focus-visible]:border-ring fhint:has-[>[data-slot=field]]:has-[:focus-visible]:ring-3 fhint:has-[>[data-slot=field]]:has-[:focus-visible]:ring-ring/50 fhint:*:data-[slot=field]:p-3 fhint:dark:has-data-checked:border-primary/20 fhint:dark:has-data-checked:bg-primary/10",
        "fhint:has-[>[data-slot=field]]:w-full fhint:has-[>[data-slot=field]]:flex-col",
        className,
      )}
      {...props}
    />
  );
}

function FieldTitle({ className, ...props }) {
  return (
    <div
      data-slot="field-label"
      className={cn(
        "fhint:flex fhint:w-fit fhint:items-center fhint:gap-2 fhint:text-sm fhint:font-medium fhint:group-data-[disabled=true]/field:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

function FieldDescription({ className, ...props }) {
  return (
    <p
      data-slot="field-description"
      className={cn(
        "fhint:text-left fhint:text-sm fhint:leading-normal fhint:font-normal fhint:text-muted-foreground fhint:group-has-data-horizontal/field:text-balance fhint:[[data-variant=legend]+&]:-mt-1.5",
        "fhint:last:mt-0 fhint:nth-last-2:-mt-1",
        "fhint:[&>a]:underline fhint:[&>a]:underline-offset-4 fhint:[&>a:hover]:text-primary",
        className,
      )}
      {...props}
    />
  );
}

function FieldSeparator({ children, className, ...props }) {
  return (
    <div
      data-slot="field-separator"
      data-content={!!children}
      className={cn(
        "fhint:relative fhint:-my-2 fhint:h-5 fhint:text-sm fhint:group-data-[variant=outline]/field-group:-mb-2",
        className,
      )}
      {...props}
    >
      <Separator className="fhint:absolute fhint:inset-0 fhint:top-1/2" />
      {children && (
        <span
          className="fhint:relative fhint:mx-auto fhint:block fhint:w-fit fhint:bg-background fhint:px-2 fhint:text-muted-foreground"
          data-slot="field-separator-content"
        >
          {children}
        </span>
      )}
    </div>
  );
}

function FieldError({ className, children, errors, ...props }) {
  const content = useMemo(() => {
    if (children) {
      return children;
    }

    if (!errors?.length) {
      return null;
    }

    const uniqueErrors = [
      ...new Map(errors.map((error) => [error?.message, error])).values(),
    ];

    if (uniqueErrors?.length == 1) {
      return uniqueErrors[0]?.message;
    }

    return (
      <ul className="fhint:ml-4 fhint:flex fhint:list-disc fhint:flex-col fhint:gap-1">
        {uniqueErrors.map(
          (error, index) =>
            error?.message && <li key={index}>{error.message}</li>,
        )}
      </ul>
    );
  }, [children, errors]);

  if (!content) {
    return null;
  }

  return (
    <div
      role="alert"
      data-slot="field-error"
      className={cn(
        "fhint:text-sm fhint:font-normal fhint:text-destructive",
        className,
      )}
      {...props}
    >
      {content}
    </div>
  );
}

export {
  Field,
  FieldLabel,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLegend,
  FieldSeparator,
  FieldSet,
  FieldContent,
  FieldTitle,
};
