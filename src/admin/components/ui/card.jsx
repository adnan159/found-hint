import * as React from "react";
import { cn } from "cn";

function Card({ className, size = "default", ...props }) {
  return (
    <div
      data-slot="card"
      data-size={size}
      className={cn(
        "fhint:group/card fhint:flex fhint:flex-col fhint:gap-(--card-spacing) fhint:overflow-hidden fhint:rounded-xl fhint:bg-card fhint:py-(--card-spacing) fhint:text-sm fhint:text-card-foreground fhint:shadow-xs fhint:ring-1 fhint:ring-foreground/10 fhint:[--card-spacing:--spacing(6)] fhint:has-[>img:first-child]:pt-0 fhint:data-[size=sm]:[--card-spacing:--spacing(4)] fhint:*:[img:first-child]:rounded-t-xl fhint:*:[img:last-child]:rounded-b-xl",
        className,
      )}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "fhint:group/card-header fhint:@container/card-header fhint:grid fhint:auto-rows-min fhint:items-start fhint:gap-1 fhint:rounded-t-xl fhint:px-(--card-spacing) fhint:has-data-[slot=card-action]:grid-cols-[1fr_auto] fhint:has-data-[slot=card-description]:grid-rows-[auto_auto] fhint:[.border-b]:pb-(--card-spacing)",
        className,
      )}
      {...props}
    />
  );
}

function CardTitle({ className, ...props }) {
  return (
    <div
      data-slot="card-title"
      className={cn(
        "fhint:font-heading fhint:text-base fhint:leading-normal fhint:font-medium fhint:group-data-[size=sm]/card:text-sm",
        className,
      )}
      {...props}
    />
  );
}

function CardDescription({ className, ...props }) {
  return (
    <div
      data-slot="card-description"
      className={cn("fhint:text-sm fhint:text-muted-foreground", className)}
      {...props}
    />
  );
}

function CardAction({ className, ...props }) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "fhint:col-start-2 fhint:row-span-2 fhint:row-start-1 fhint:self-start fhint:justify-self-end",
        className,
      )}
      {...props}
    />
  );
}

function CardContent({ className, ...props }) {
  return (
    <div
      data-slot="card-content"
      className={cn(
        "fhint:flex fhint:flex-col fhint:gap-3 fhint:px-(--card-spacing)",
        className,
      )}
      {...props}
    />
  );
}

function CardFooter({ className, ...props }) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        "fhint:flex fhint:items-center fhint:rounded-b-xl fhint:px-(--card-spacing) fhint:[.border-t]:pt-(--card-spacing)",
        className,
      )}
      {...props}
    />
  );
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
};
