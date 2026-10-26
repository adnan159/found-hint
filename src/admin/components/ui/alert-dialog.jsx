"use client";

import * as React from "react";
import { AlertDialog as AlertDialogPrimitive } from "@base-ui/react/alert-dialog";
import { cn } from "cn";

import { Button } from "@/components/ui/button";

function AlertDialog({ ...props }) {
  return <AlertDialogPrimitive.Root data-slot="alert-dialog" {...props} />;
}

function AlertDialogTrigger({ ...props }) {
  return (
    <AlertDialogPrimitive.Trigger data-slot="alert-dialog-trigger" {...props} />
  );
}

function AlertDialogPortal({ ...props }) {
  return (
    <AlertDialogPrimitive.Portal data-slot="alert-dialog-portal" {...props} />
  );
}

function AlertDialogOverlay({ className, ...props }) {
  return (
    <AlertDialogPrimitive.Backdrop
      data-slot="alert-dialog-overlay"
      className={cn(
        "fhint:fixed fhint:inset-0 fhint:isolate fhint:z-50 fhint:bg-black/10 fhint:duration-100 fhint:supports-backdrop-filter:backdrop-blur-xs fhint:data-open:animate-in fhint:data-open:fade-in-0 fhint:data-closed:animate-out fhint:data-closed:fade-out-0",
        className,
      )}
      {...props}
    />
  );
}

function AlertDialogContent({ className, size = "default", ...props }) {
  return (
    <AlertDialogPortal>
      <AlertDialogOverlay />
      <AlertDialogPrimitive.Popup
        data-slot="alert-dialog-content"
        data-size={size}
        className={cn(
          "fhint:group/alert-dialog-content fhint:fixed fhint:top-1/2 fhint:left-1/2 fhint:z-50 fhint:grid fhint:w-full fhint:-translate-x-1/2 fhint:-translate-y-1/2 fhint:gap-6 fhint:rounded-xl fhint:bg-popover fhint:p-6 fhint:text-popover-foreground fhint:ring-1 fhint:ring-foreground/10 fhint:duration-100 fhint:outline-none fhint:data-[size=default]:max-w-xs fhint:data-[size=sm]:max-w-xs fhint:data-[size=default]:sm:max-w-lg fhint:data-open:animate-in fhint:data-open:fade-in-0 fhint:data-open:zoom-in-95 fhint:data-closed:animate-out fhint:data-closed:fade-out-0 fhint:data-closed:zoom-out-95",
          className,
        )}
        {...props}
      />
    </AlertDialogPortal>
  );
}

function AlertDialogHeader({ className, ...props }) {
  return (
    <div
      data-slot="alert-dialog-header"
      className={cn(
        "fhint:grid fhint:grid-rows-[auto_1fr] fhint:place-items-center fhint:gap-1.5 fhint:text-center fhint:has-data-[slot=alert-dialog-media]:grid-rows-[auto_auto_1fr] fhint:has-data-[slot=alert-dialog-media]:gap-x-6 fhint:sm:group-data-[size=default]/alert-dialog-content:place-items-start fhint:sm:group-data-[size=default]/alert-dialog-content:text-left fhint:sm:group-data-[size=default]/alert-dialog-content:has-data-[slot=alert-dialog-media]:grid-rows-[auto_1fr]",
        className,
      )}
      {...props}
    />
  );
}

function AlertDialogFooter({ className, ...props }) {
  return (
    <div
      data-slot="alert-dialog-footer"
      className={cn(
        "fhint:flex fhint:flex-col-reverse fhint:gap-2 fhint:group-data-[size=sm]/alert-dialog-content:grid fhint:group-data-[size=sm]/alert-dialog-content:grid-cols-2 fhint:sm:flex-row fhint:sm:justify-end",
        className,
      )}
      {...props}
    />
  );
}

function AlertDialogMedia({ className, ...props }) {
  return (
    <div
      data-slot="alert-dialog-media"
      className={cn(
        "fhint:mb-2 fhint:inline-flex fhint:size-16 fhint:items-center fhint:justify-center fhint:rounded-md fhint:bg-muted fhint:sm:group-data-[size=default]/alert-dialog-content:row-span-2 fhint:*:[svg:not([class*=size-])]:size-8",
        className,
      )}
      {...props}
    />
  );
}

function AlertDialogTitle({ className, ...props }) {
  return (
    <AlertDialogPrimitive.Title
      data-slot="alert-dialog-title"
      className={cn(
        "fhint:font-heading fhint:text-lg fhint:font-medium fhint:sm:group-data-[size=default]/alert-dialog-content:group-has-data-[slot=alert-dialog-media]/alert-dialog-content:col-start-2",
        className,
      )}
      {...props}
    />
  );
}

function AlertDialogDescription({ className, ...props }) {
  return (
    <AlertDialogPrimitive.Description
      data-slot="alert-dialog-description"
      className={cn(
        "fhint:text-sm fhint:text-balance fhint:text-muted-foreground fhint:md:text-pretty fhint:*:[a]:underline fhint:*:[a]:underline-offset-3 fhint:*:[a]:hover:text-foreground",
        className,
      )}
      {...props}
    />
  );
}

function AlertDialogAction({ className, ...props }) {
  return (
    <Button
      data-slot="alert-dialog-action"
      className={cn(className)}
      {...props}
    />
  );
}

function AlertDialogCancel({
  className,
  variant = "outline",
  size = "default",
  ...props
}) {
  return (
    <AlertDialogPrimitive.Close
      data-slot="alert-dialog-cancel"
      className={cn(className)}
      render={<Button variant={variant} size={size} />}
      {...props}
    />
  );
}

export {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogOverlay,
  AlertDialogPortal,
  AlertDialogTitle,
  AlertDialogTrigger,
};
