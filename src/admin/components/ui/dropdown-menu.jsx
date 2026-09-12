"use client";

import * as React from "react";
import { Menu as MenuPrimitive } from "@base-ui/react/menu";
import { cn } from "cn";
import { ChevronRightIcon, CheckIcon } from "lucide-react";

function DropdownMenu({ ...props }) {
  return <MenuPrimitive.Root data-slot="dropdown-menu" {...props} />;
}

function DropdownMenuPortal({ ...props }) {
  return <MenuPrimitive.Portal data-slot="dropdown-menu-portal" {...props} />;
}

function DropdownMenuTrigger({ ...props }) {
  return <MenuPrimitive.Trigger data-slot="dropdown-menu-trigger" {...props} />;
}

function DropdownMenuContent({
  align = "start",
  alignOffset = 0,
  side = "bottom",
  sideOffset = 4,
  className,
  ...props
}) {
  return (
    <MenuPrimitive.Portal>
      <MenuPrimitive.Positioner
        className="fhint:isolate fhint:z-50 fhint:outline-none"
        align={align}
        alignOffset={alignOffset}
        side={side}
        sideOffset={sideOffset}
      >
        <MenuPrimitive.Popup
          data-slot="dropdown-menu-content"
          className={cn(
            "fhint: fhint: fhint:z-50 fhint:max-h-(--available-height) fhint:w-(--anchor-width) fhint:min-w-32 fhint:origin-(--transform-origin) fhint:overflow-x-hidden fhint:overflow-y-auto fhint:rounded-md fhint:bg-popover fhint:p-1 fhint:text-popover-foreground fhint:shadow-md fhint:ring-1 fhint:ring-foreground/10 fhint:duration-100 fhint:outline-none fhint:data-[side=bottom]:slide-in-from-top-2 fhint:data-[side=inline-end]:slide-in-from-left-2 fhint:data-[side=inline-start]:slide-in-from-right-2 fhint:data-[side=left]:slide-in-from-right-2 fhint:data-[side=right]:slide-in-from-left-2 fhint:data-[side=top]:slide-in-from-bottom-2 fhint:data-open:animate-in fhint:data-open:fade-in-0 fhint:data-open:zoom-in-95 fhint:data-closed:animate-out fhint:data-closed:overflow-hidden fhint:data-closed:fade-out-0 fhint:data-closed:zoom-out-95",
            className,
          )}
          {...props}
        />
      </MenuPrimitive.Positioner>
    </MenuPrimitive.Portal>
  );
}

function DropdownMenuGroup({ ...props }) {
  return <MenuPrimitive.Group data-slot="dropdown-menu-group" {...props} />;
}

function DropdownMenuLabel({ className, inset, ...props }) {
  return (
    <MenuPrimitive.GroupLabel
      data-slot="dropdown-menu-label"
      data-inset={inset}
      className={cn(
        "fhint:px-2 fhint:py-1.5 fhint:text-xs fhint:font-medium fhint:text-muted-foreground fhint:data-inset:pl-8",
        className,
      )}
      {...props}
    />
  );
}

function DropdownMenuItem({ className, inset, variant = "default", ...props }) {
  return (
    <MenuPrimitive.Item
      data-slot="dropdown-menu-item"
      data-inset={inset}
      data-variant={variant}
      className={cn(
        "fhint:group/dropdown-menu-item fhint:relative fhint:flex fhint:cursor-default fhint:items-center fhint:gap-2 fhint:rounded-sm fhint:px-2 fhint:py-1.5 fhint:text-sm fhint:outline-hidden fhint:select-none fhint:focus:bg-accent fhint:focus:text-accent-foreground fhint:not-data-[variant=destructive]:focus:**:text-accent-foreground fhint:data-inset:pl-8 fhint:data-[variant=destructive]:text-destructive fhint:data-[variant=destructive]:focus:bg-destructive/10 fhint:data-[variant=destructive]:focus:text-destructive fhint:dark:data-[variant=destructive]:focus:bg-destructive/20 fhint:data-disabled:pointer-events-none fhint:data-disabled:opacity-50 fhint:[&_svg]:pointer-events-none fhint:[&_svg]:shrink-0 fhint:[&_svg:not([class*=size-])]:size-4 fhint:data-[variant=destructive]:*:[svg]:text-destructive",
        className,
      )}
      {...props}
    />
  );
}

function DropdownMenuSub({ ...props }) {
  return <MenuPrimitive.SubmenuRoot data-slot="dropdown-menu-sub" {...props} />;
}

function DropdownMenuSubTrigger({ className, inset, children, ...props }) {
  return (
    <MenuPrimitive.SubmenuTrigger
      data-slot="dropdown-menu-sub-trigger"
      data-inset={inset}
      className={cn(
        "fhint:flex fhint:cursor-default fhint:items-center fhint:gap-2 fhint:rounded-sm fhint:px-2 fhint:py-1.5 fhint:text-sm fhint:outline-hidden fhint:select-none fhint:focus:bg-accent fhint:focus:text-accent-foreground fhint:not-data-[variant=destructive]:focus:**:text-accent-foreground fhint:data-inset:pl-8 fhint:data-popup-open:bg-accent fhint:data-popup-open:text-accent-foreground fhint:data-open:bg-accent fhint:data-open:text-accent-foreground fhint:[&_svg]:pointer-events-none fhint:[&_svg]:shrink-0 fhint:[&_svg:not([class*=size-])]:size-4",
        className,
      )}
      {...props}
    >
      {children}
      <ChevronRightIcon className="fhint:ml-auto" />
    </MenuPrimitive.SubmenuTrigger>
  );
}

function DropdownMenuSubContent({
  align = "start",
  alignOffset = -3,
  side = "right",
  sideOffset = 0,
  className,
  ...props
}) {
  return (
    <DropdownMenuContent
      data-slot="dropdown-menu-sub-content"
      className={cn(
        "fhint: fhint: fhint:w-auto fhint:min-w-[96px] fhint:rounded-md fhint:bg-popover fhint:p-1 fhint:text-popover-foreground fhint:shadow-lg fhint:ring-1 fhint:ring-foreground/10 fhint:duration-100 fhint:data-[side=bottom]:slide-in-from-top-2 fhint:data-[side=left]:slide-in-from-right-2 fhint:data-[side=right]:slide-in-from-left-2 fhint:data-[side=top]:slide-in-from-bottom-2 fhint:data-open:animate-in fhint:data-open:fade-in-0 fhint:data-open:zoom-in-95 fhint:data-closed:animate-out fhint:data-closed:fade-out-0 fhint:data-closed:zoom-out-95",
        className,
      )}
      align={align}
      alignOffset={alignOffset}
      side={side}
      sideOffset={sideOffset}
      {...props}
    />
  );
}

function DropdownMenuCheckboxItem({
  className,
  children,
  checked,
  inset,
  ...props
}) {
  return (
    <MenuPrimitive.CheckboxItem
      data-slot="dropdown-menu-checkbox-item"
      data-inset={inset}
      className={cn(
        "fhint:relative fhint:flex fhint:cursor-default fhint:items-center fhint:gap-2 fhint:rounded-sm fhint:py-1.5 fhint:pr-8 fhint:pl-2 fhint:text-sm fhint:outline-hidden fhint:select-none fhint:focus:bg-accent fhint:focus:text-accent-foreground fhint:focus:**:text-accent-foreground fhint:data-inset:pl-8 fhint:data-disabled:pointer-events-none fhint:data-disabled:opacity-50 fhint:[&_svg]:pointer-events-none fhint:[&_svg]:shrink-0 fhint:[&_svg:not([class*=size-])]:size-4",
        className,
      )}
      checked={checked}
      {...props}
    >
      <span
        className="fhint:pointer-events-none fhint:absolute fhint:right-2 fhint:flex fhint:items-center fhint:justify-center"
        data-slot="dropdown-menu-checkbox-item-indicator"
      >
        <MenuPrimitive.CheckboxItemIndicator>
          <CheckIcon />
        </MenuPrimitive.CheckboxItemIndicator>
      </span>
      {children}
    </MenuPrimitive.CheckboxItem>
  );
}

function DropdownMenuRadioGroup({ ...props }) {
  return (
    <MenuPrimitive.RadioGroup
      data-slot="dropdown-menu-radio-group"
      {...props}
    />
  );
}

function DropdownMenuRadioItem({ className, children, inset, ...props }) {
  return (
    <MenuPrimitive.RadioItem
      data-slot="dropdown-menu-radio-item"
      data-inset={inset}
      className={cn(
        "fhint:relative fhint:flex fhint:cursor-default fhint:items-center fhint:gap-2 fhint:rounded-sm fhint:py-1.5 fhint:pr-8 fhint:pl-2 fhint:text-sm fhint:outline-hidden fhint:select-none fhint:focus:bg-accent fhint:focus:text-accent-foreground fhint:focus:**:text-accent-foreground fhint:data-inset:pl-8 fhint:data-disabled:pointer-events-none fhint:data-disabled:opacity-50 fhint:[&_svg]:pointer-events-none fhint:[&_svg]:shrink-0 fhint:[&_svg:not([class*=size-])]:size-4",
        className,
      )}
      {...props}
    >
      <span
        className="fhint:pointer-events-none fhint:absolute fhint:right-2 fhint:flex fhint:items-center fhint:justify-center"
        data-slot="dropdown-menu-radio-item-indicator"
      >
        <MenuPrimitive.RadioItemIndicator>
          <CheckIcon />
        </MenuPrimitive.RadioItemIndicator>
      </span>
      {children}
    </MenuPrimitive.RadioItem>
  );
}

function DropdownMenuSeparator({ className, ...props }) {
  return (
    <MenuPrimitive.Separator
      data-slot="dropdown-menu-separator"
      className={cn(
        "fhint:-mx-1 fhint:my-1 fhint:h-px fhint:bg-border",
        className,
      )}
      {...props}
    />
  );
}

function DropdownMenuShortcut({ className, ...props }) {
  return (
    <span
      data-slot="dropdown-menu-shortcut"
      className={cn(
        "fhint:ml-auto fhint:text-xs fhint:tracking-widest fhint:text-muted-foreground fhint:group-focus/dropdown-menu-item:text-accent-foreground",
        className,
      )}
      {...props}
    />
  );
}

export {
  DropdownMenu,
  DropdownMenuPortal,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
};
