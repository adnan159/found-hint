import { cn } from "cn";

function Skeleton({ className, ...props }) {
  return (
    <div
      data-slot="skeleton"
      className={cn(
        "fhint:animate-pulse fhint:rounded-md fhint:bg-muted",
        className,
      )}
      {...props}
    />
  );
}

export { Skeleton };
