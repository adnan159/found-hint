"use client";

import { Switch as SwitchPrimitive } from "@base-ui/react/switch";
import { cn } from "cn";

function Switch({ className, size = "default", ...props }) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      data-size={size}
      className={cn(
        "fhint:peer fhint:group/switch fhint:relative fhint:inline-flex fhint:shrink-0 fhint:items-center fhint:rounded-full fhint:border fhint:border-transparent fhint:shadow-xs fhint:transition-all fhint:outline-none fhint:group-has-[:focus-visible]/field-label:border-transparent fhint:group-has-[:focus-visible]/field-label:ring-0 fhint:after:absolute fhint:after:-inset-x-3 fhint:after:-inset-y-2 fhint:focus-visible:border-ring fhint:focus-visible:ring-3 fhint:focus-visible:ring-ring/50 fhint:aria-invalid:border-destructive fhint:aria-invalid:ring-3 fhint:aria-invalid:ring-destructive/20 fhint:data-[size=default]:h-[18.4px] fhint:data-[size=default]:w-[32px] fhint:data-[size=sm]:h-[14px] fhint:data-[size=sm]:w-[24px] fhint:dark:aria-invalid:border-destructive/50 fhint:dark:aria-invalid:ring-destructive/40 fhint:data-checked:bg-primary fhint:data-unchecked:bg-input fhint:dark:data-unchecked:bg-input/80 fhint:data-disabled:cursor-not-allowed fhint:data-disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className="fhint:pointer-events-none fhint:block fhint:rounded-full fhint:bg-background fhint:ring-0 fhint:transition-transform fhint:group-data-[size=default]/switch:size-4 fhint:group-data-[size=sm]/switch:size-3 fhint:group-data-[size=default]/switch:data-checked:translate-x-[calc(100%-2px)] fhint:group-data-[size=sm]/switch:data-checked:translate-x-[calc(100%-2px)] fhint:dark:data-checked:bg-primary-foreground fhint:group-data-[size=default]/switch:data-unchecked:translate-x-0 fhint:group-data-[size=sm]/switch:data-unchecked:translate-x-0 fhint:dark:data-unchecked:bg-foreground"
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
