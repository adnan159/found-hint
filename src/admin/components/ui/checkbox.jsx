import { Checkbox as CheckboxPrimitive } from "@base-ui/react/checkbox";
import { cn } from "cn";
import { CheckIcon } from "lucide-react";

function Checkbox({ className, ...props }) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "fhint:peer fhint:relative fhint:flex fhint:size-4 fhint:shrink-0 fhint:items-center fhint:justify-center fhint:rounded-[4px] fhint:border fhint:border-input fhint:shadow-xs fhint:transition-shadow fhint:outline-none fhint:group-has-disabled/field:opacity-50 fhint:group-has-[:focus-visible]/field-label:ring-0 fhint:group-has-[:focus-visible]/field-label:not-data-checked:border-input fhint:after:absolute fhint:after:-inset-x-3 fhint:after:-inset-y-2 fhint:focus-visible:border-ring fhint:focus-visible:ring-3 fhint:focus-visible:ring-ring/50 fhint:disabled:cursor-not-allowed fhint:disabled:opacity-50 fhint:aria-invalid:border-destructive fhint:aria-invalid:ring-3 fhint:aria-invalid:ring-destructive/20 fhint:aria-invalid:aria-checked:border-primary fhint:dark:bg-input/30 fhint:dark:aria-invalid:border-destructive/50 fhint:dark:aria-invalid:ring-destructive/40 fhint:data-checked:border-primary fhint:data-checked:bg-primary fhint:data-checked:text-primary-foreground fhint:group-has-[:focus-visible]/field-label:data-checked:border-primary fhint:dark:data-checked:bg-primary",
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="fhint:grid fhint:place-content-center fhint:text-current fhint:transition-none fhint:[&>svg]:size-3.5"
      >
        <CheckIcon />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

export { Checkbox };
