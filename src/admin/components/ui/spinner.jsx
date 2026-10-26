import { cn } from "cn";
import { Loader2Icon } from "lucide-react";

function Spinner({ className, ...props }) {
  return (
    <Loader2Icon
      data-slot="spinner"
      role="status"
      aria-label="Loading"
      className={cn("fhint:size-4 fhint:animate-spin", className)}
      {...props}
    />
  );
}

export { Spinner };
