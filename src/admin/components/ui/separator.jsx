import { Separator as SeparatorPrimitive } from "@base-ui/react/separator";
import { cn } from "cn";

function Separator({ className, orientation = "horizontal", ...props }) {
  return (
    <SeparatorPrimitive
      data-slot="separator"
      orientation={orientation}
      className={cn(
        "fhint:shrink-0 fhint:bg-border fhint:data-horizontal:h-px fhint:data-horizontal:w-full fhint:data-vertical:w-px fhint:data-vertical:self-stretch",
        className,
      )}
      {...props}
    />
  );
}

export { Separator };
