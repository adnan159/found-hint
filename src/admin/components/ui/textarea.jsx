import * as React from "react";
import { cn } from "cn";

function Textarea({ className, ...props }) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "fhint:flex fhint:field-sizing-content fhint:min-h-16 fhint:w-full fhint:rounded-md fhint:border fhint:border-input fhint:bg-transparent fhint:px-2.5 fhint:py-2 fhint:text-base fhint:shadow-xs fhint:transition-[color,box-shadow] fhint:outline-none fhint:placeholder:text-muted-foreground fhint:focus-visible:border-ring fhint:focus-visible:ring-3 fhint:focus-visible:ring-ring/50 fhint:disabled:cursor-not-allowed fhint:disabled:opacity-50 fhint:aria-invalid:border-destructive fhint:aria-invalid:ring-3 fhint:aria-invalid:ring-destructive/20 fhint:md:text-sm fhint:dark:bg-input/30 fhint:dark:aria-invalid:border-destructive/50 fhint:dark:aria-invalid:ring-destructive/40",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
