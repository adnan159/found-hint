"use client";

import * as React from "react";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { cn } from "cn";

import { Button } from "@/components/ui/button";
import { XIcon } from "lucide-react";

function Dialog({ ...props }) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />;
}

function DialogTrigger({ ...props }) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;
}

function DialogPortal({ ...props }) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />;
}

function DialogClose({ ...props }) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
}

function DialogOverlay({ className, ...props }) {
  return (
    <DialogPrimitive.Backdrop
      data-slot="dialog-overlay"
      className={cn(
        "fhint:fixed fhint:inset-0 fhint:isolate fhint:z-50 fhint:bg-black/10 fhint:duration-100 fhint:supports-backdrop-filter:backdrop-blur-xs fhint:data-open:animate-in fhint:data-open:fade-in-0 fhint:data-closed:animate-out fhint:data-closed:fade-out-0",
        className,
      )}
      {...props}
    />
  );
}

function DialogContent({
  className,
  children,
  showCloseButton = true,
  ...props
}) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Popup
        data-slot="dialog-content"
        className={cn(
          "fhint:fixed fhint:top-1/2 fhint:left-1/2 fhint:z-50 fhint:grid fhint:w-full fhint:max-w-[calc(100%-2rem)] fhint:-translate-x-1/2 fhint:-translate-y-1/2 fhint:gap-6 fhint:rounded-xl fhint:bg-popover fhint:p-6 fhint:text-sm fhint:text-popover-foreground fhint:ring-1 fhint:ring-foreground/10 fhint:duration-100 fhint:outline-none fhint:sm:max-w-md fhint:data-open:animate-in fhint:data-open:fade-in-0 fhint:data-open:zoom-in-95 fhint:data-closed:animate-out fhint:data-closed:fade-out-0 fhint:data-closed:zoom-out-95",
          className,
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close
            data-slot="dialog-close"
            render={
              <Button
                variant="ghost"
                className="fhint:absolute fhint:top-4 fhint:right-4"
                size="icon-sm"
              />
            }
          >
            <XIcon />
            <span className="fhint:sr-only">Close</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Popup>
    </DialogPortal>
  );
}

function DialogHeader({ className, ...props }) {
  return (
    <div
      data-slot="dialog-header"
      className={cn("fhint:flex fhint:flex-col fhint:gap-2", className)}
      {...props}
    />
  );
}

function DialogFooter({
  className,
  showCloseButton = false,
  children,
  ...props
}) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "fhint:flex fhint:flex-col-reverse fhint:gap-2 fhint:sm:flex-row fhint:sm:justify-end",
        className,
      )}
      {...props}
    >
      {children}
      {showCloseButton && (
        <DialogPrimitive.Close render={<Button variant="outline" />}>
          Close
        </DialogPrimitive.Close>
      )}
    </div>
  );
}

function DialogTitle({ className, ...props }) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn(
        "fhint:font-heading fhint:leading-none fhint:font-medium",
        className,
      )}
      {...props}
    />
  );
}

function DialogDescription({ className, ...props }) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn(
        "fhint:text-sm fhint:text-muted-foreground fhint:*:[a]:underline fhint:*:[a]:underline-offset-3 fhint:*:[a]:hover:text-foreground",
        className,
      )}
      {...props}
    />
  );
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
};
