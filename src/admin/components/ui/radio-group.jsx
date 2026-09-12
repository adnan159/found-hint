import { Radio as RadioPrimitive } from "@base-ui/react/radio";
import { RadioGroup as RadioGroupPrimitive } from "@base-ui/react/radio-group";
import { cn } from "cn";

function RadioGroup({ className, ...props }) {
  return (
    <RadioGroupPrimitive
      data-slot="radio-group"
      className={cn("fhint:grid fhint:w-full fhint:gap-3", className)}
      {...props}
    />
  );
}

function RadioGroupItem({ className, ...props }) {
  return (
    <RadioPrimitive.Root
      data-slot="radio-group-item"
      className={cn(
        "fhint:group/radio-group-item fhint:peer fhint:relative fhint:flex fhint:aspect-square fhint:size-4 fhint:shrink-0 fhint:rounded-full fhint:border fhint:border-input fhint:outline-none fhint:group-has-[:focus-visible]/field-label:ring-0 fhint:group-has-[:focus-visible]/field-label:not-data-checked:border-input fhint:after:absolute fhint:after:-inset-x-3 fhint:after:-inset-y-2 fhint:focus-visible:border-ring fhint:focus-visible:ring-3 fhint:focus-visible:ring-ring/50 fhint:disabled:cursor-not-allowed fhint:disabled:opacity-50 fhint:aria-invalid:border-destructive fhint:aria-invalid:ring-3 fhint:aria-invalid:ring-destructive/20 fhint:aria-invalid:aria-checked:border-primary fhint:dark:bg-input/30 fhint:dark:aria-invalid:border-destructive/50 fhint:dark:aria-invalid:ring-destructive/40 fhint:data-checked:border-primary fhint:data-checked:bg-primary fhint:data-checked:text-primary-foreground fhint:group-has-[:focus-visible]/field-label:data-checked:border-primary fhint:dark:data-checked:bg-primary",
        className,
      )}
      {...props}
    >
      <RadioPrimitive.Indicator
        data-slot="radio-group-indicator"
        className="fhint:flex fhint:size-4 fhint:items-center fhint:justify-center"
      >
        <span className="fhint:absolute fhint:top-1/2 fhint:left-1/2 fhint:size-2 fhint:-translate-x-1/2 fhint:-translate-y-1/2 fhint:rounded-full fhint:bg-primary-foreground" />
      </RadioPrimitive.Indicator>
    </RadioPrimitive.Root>
  );
}

export { RadioGroup, RadioGroupItem };
