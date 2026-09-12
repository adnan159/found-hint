import * as React from "react";
import { cn } from "cn";

function Label({ className, ...props }) {
  return (
    <label
      data-slot="label"
      className={cn(
        "fhint:flex fhint:items-center fhint:gap-2 fhint:text-sm fhint:leading-none fhint:font-medium fhint:select-none fhint:group-data-[disabled=true]:pointer-events-none fhint:group-data-[disabled=true]:opacity-50 fhint:peer-disabled:cursor-not-allowed fhint:peer-disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export { Label };
