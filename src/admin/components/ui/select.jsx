"use client";

import * as React from "react";
import { Select as SelectPrimitive } from "@base-ui/react/select";
import { cn } from "cn";
import { ChevronDownIcon, CheckIcon, ChevronUpIcon } from "lucide-react";

const Select = SelectPrimitive.Root;

function SelectGroup({ className, ...props }) {
  return (
    <SelectPrimitive.Group
      data-slot="select-group"
      className={cn("fhint:scroll-my-1 fhint:p-1", className)}
      {...props}
    />
  );
}

function SelectValue({ className, ...props }) {
  return (
    <SelectPrimitive.Value
      data-slot="select-value"
      className={cn("fhint:flex fhint:flex-1 fhint:text-left", className)}
      {...props}
    />
  );
}

function SelectTrigger({ className, size = "default", children, ...props }) {
  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      data-size={size}
      className={cn(
        "fhint:flex fhint:w-fit fhint:items-center fhint:justify-between fhint:gap-1.5 fhint:rounded-md fhint:border fhint:border-input fhint:bg-transparent fhint:py-2 fhint:pr-2 fhint:pl-2.5 fhint:text-sm fhint:whitespace-nowrap fhint:shadow-xs fhint:transition-[color,box-shadow] fhint:outline-none fhint:focus-visible:border-ring fhint:focus-visible:ring-3 fhint:focus-visible:ring-ring/50 fhint:disabled:cursor-not-allowed fhint:disabled:opacity-50 fhint:aria-invalid:border-destructive fhint:aria-invalid:ring-3 fhint:aria-invalid:ring-destructive/20 fhint:data-placeholder:text-muted-foreground fhint:data-[size=default]:h-9 fhint:data-[size=sm]:h-8 fhint:*:data-[slot=select-value]:line-clamp-1 fhint:*:data-[slot=select-value]:flex fhint:*:data-[slot=select-value]:items-center fhint:*:data-[slot=select-value]:gap-1.5 fhint:dark:bg-input/30 fhint:dark:hover:bg-input/50 fhint:dark:aria-invalid:border-destructive/50 fhint:dark:aria-invalid:ring-destructive/40 fhint:[&_svg]:pointer-events-none fhint:[&_svg]:shrink-0 fhint:[&_svg:not([class*=size-])]:size-4",
        className,
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon
        render={
          <ChevronDownIcon className="fhint:pointer-events-none fhint:size-4 fhint:text-muted-foreground" />
        }
      />
    </SelectPrimitive.Trigger>
  );
}

function SelectContent({
  className,
  children,
  side = "bottom",
  sideOffset = 4,
  align = "center",
  alignOffset = 0,
  alignItemWithTrigger = true,
  ...props
}) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Positioner
        side={side}
        sideOffset={sideOffset}
        align={align}
        alignOffset={alignOffset}
        alignItemWithTrigger={alignItemWithTrigger}
        className="fhint:isolate fhint:z-50"
      >
        <SelectPrimitive.Popup
          data-slot="select-content"
          data-align-trigger={alignItemWithTrigger}
          className={cn(
            "fhint: fhint: fhint:relative fhint:isolate fhint:z-50 fhint:max-h-(--available-height) fhint:w-(--anchor-width) fhint:min-w-36 fhint:origin-(--transform-origin) fhint:overflow-x-hidden fhint:overflow-y-auto fhint:rounded-md fhint:bg-popover fhint:text-popover-foreground fhint:shadow-md fhint:ring-1 fhint:ring-foreground/10 fhint:duration-100 fhint:data-[align-trigger=true]:animate-none fhint:data-[side=bottom]:slide-in-from-top-2 fhint:data-[side=inline-end]:slide-in-from-left-2 fhint:data-[side=inline-start]:slide-in-from-right-2 fhint:data-[side=left]:slide-in-from-right-2 fhint:data-[side=right]:slide-in-from-left-2 fhint:data-[side=top]:slide-in-from-bottom-2 fhint:data-open:animate-in fhint:data-open:fade-in-0 fhint:data-open:zoom-in-95 fhint:data-closed:animate-out fhint:data-closed:fade-out-0 fhint:data-closed:zoom-out-95",
            className,
          )}
          {...props}
        >
          <SelectScrollUpButton />
          <SelectPrimitive.List>{children}</SelectPrimitive.List>
          <SelectScrollDownButton />
        </SelectPrimitive.Popup>
      </SelectPrimitive.Positioner>
    </SelectPrimitive.Portal>
  );
}

function SelectLabel({ className, ...props }) {
  return (
    <SelectPrimitive.GroupLabel
      data-slot="select-label"
      className={cn(
        "fhint:px-2 fhint:py-1.5 fhint:text-xs fhint:text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
}

function SelectItem({ className, children, ...props }) {
  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      className={cn(
        "fhint:relative fhint:flex fhint:w-full fhint:cursor-default fhint:items-center fhint:gap-2 fhint:rounded-sm fhint:py-1.5 fhint:pr-8 fhint:pl-2 fhint:text-sm fhint:outline-hidden fhint:select-none fhint:focus:bg-accent fhint:focus:text-accent-foreground fhint:not-data-[variant=destructive]:focus:**:text-accent-foreground fhint:data-disabled:pointer-events-none fhint:data-disabled:opacity-50 fhint:[&_svg]:pointer-events-none fhint:[&_svg]:shrink-0 fhint:[&_svg:not([class*=size-])]:size-4 fhint:*:[span]:last:flex fhint:*:[span]:last:items-center fhint:*:[span]:last:gap-2",
        className,
      )}
      {...props}
    >
      <SelectPrimitive.ItemText className="fhint:flex fhint:flex-1 fhint:shrink-0 fhint:gap-2 fhint:whitespace-nowrap">
        {children}
      </SelectPrimitive.ItemText>
      <SelectPrimitive.ItemIndicator
        render={
          <span className="fhint:pointer-events-none fhint:absolute fhint:right-2 fhint:flex fhint:size-4 fhint:items-center fhint:justify-center" />
        }
      >
        <CheckIcon className="fhint:pointer-events-none" />
      </SelectPrimitive.ItemIndicator>
    </SelectPrimitive.Item>
  );
}

function SelectSeparator({ className, ...props }) {
  return (
    <SelectPrimitive.Separator
      data-slot="select-separator"
      className={cn(
        "fhint:pointer-events-none fhint:-mx-1 fhint:my-1 fhint:h-px fhint:bg-border",
        className,
      )}
      {...props}
    />
  );
}

function SelectScrollUpButton({ className, ...props }) {
  return (
    <SelectPrimitive.ScrollUpArrow
      data-slot="select-scroll-up-button"
      className={cn(
        "fhint:top-0 fhint:z-10 fhint:flex fhint:w-full fhint:cursor-default fhint:items-center fhint:justify-center fhint:bg-popover fhint:py-1 fhint:[&_svg:not([class*=size-])]:size-4",
        className,
      )}
      {...props}
    >
      <ChevronUpIcon />
    </SelectPrimitive.ScrollUpArrow>
  );
}

function SelectScrollDownButton({ className, ...props }) {
  return (
    <SelectPrimitive.ScrollDownArrow
      data-slot="select-scroll-down-button"
      className={cn(
        "fhint:bottom-0 fhint:z-10 fhint:flex fhint:w-full fhint:cursor-default fhint:items-center fhint:justify-center fhint:bg-popover fhint:py-1 fhint:[&_svg:not([class*=size-])]:size-4",
        className,
      )}
      {...props}
    >
      <ChevronDownIcon />
    </SelectPrimitive.ScrollDownArrow>
  );
}

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
};
