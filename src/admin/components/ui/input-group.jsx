import * as React from "react";
import { cva } from "class-variance-authority";
import { cn } from "cn";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

function InputGroup({ className, ...props }) {
  return (
    <div
      data-slot="input-group"
      role="group"
      className={cn(
        "fhint:group/input-group fhint:relative fhint:flex fhint:h-9 fhint:w-full fhint:min-w-0 fhint:items-center fhint:rounded-md fhint:border fhint:border-input fhint:shadow-xs fhint:transition-[color,box-shadow] fhint:outline-none fhint:in-data-[slot=combobox-content]:focus-within:border-inherit fhint:in-data-[slot=combobox-content]:focus-within:ring-0 fhint:has-[[data-slot=input-group-control]:focus-visible]:border-ring fhint:has-[[data-slot=input-group-control]:focus-visible]:ring-3 fhint:has-[[data-slot=input-group-control]:focus-visible]:ring-ring/50 fhint:has-[[data-slot][aria-invalid=true]]:border-destructive fhint:has-[[data-slot][aria-invalid=true]]:ring-3 fhint:has-[[data-slot][aria-invalid=true]]:ring-destructive/20 fhint:has-[>[data-align=block-end]]:h-auto fhint:has-[>[data-align=block-end]]:flex-col fhint:has-[>[data-align=block-start]]:h-auto fhint:has-[>[data-align=block-start]]:flex-col fhint:has-[>textarea]:h-auto fhint:dark:bg-input/30 fhint:dark:has-[[data-slot][aria-invalid=true]]:ring-destructive/40 fhint:has-[>[data-align=block-end]]:[&>input]:pt-3 fhint:has-[>[data-align=block-start]]:[&>input]:pb-3 fhint:has-[>[data-align=inline-end]]:[&>input]:pr-1.5 fhint:has-[>[data-align=inline-start]]:[&>input]:pl-1.5",
        className,
      )}
      {...props}
    />
  );
}

const inputGroupAddonVariants = cva(
  "fhint:flex fhint:h-auto fhint:cursor-text fhint:items-center fhint:justify-center fhint:gap-2 fhint:py-1.5 fhint:text-sm fhint:font-medium fhint:text-muted-foreground fhint:select-none fhint:group-data-[disabled=true]/input-group:opacity-50 fhint:[&>kbd]:rounded-[calc(var(--radius)-5px)] fhint:[&>svg:not([class*=size-])]:size-4",
  {
    variants: {
      align: {
        "inline-start":
          "fhint:order-first fhint:pl-2 fhint:has-[>button]:-ml-1 fhint:has-[>kbd]:ml-[-0.15rem]",
        "inline-end":
          "fhint:order-last fhint:pr-2 fhint:has-[>button]:-mr-1 fhint:has-[>kbd]:mr-[-0.15rem]",
        "block-start":
          "fhint:order-first fhint:w-full fhint:justify-start fhint:px-2.5 fhint:pt-2 fhint:group-has-[>input]/input-group:pt-2 fhint:[.border-b]:pb-2",
        "block-end":
          "fhint:order-last fhint:w-full fhint:justify-start fhint:px-2.5 fhint:pb-2 fhint:group-has-[>input]/input-group:pb-2 fhint:[.border-t]:pt-2",
      },
    },
    defaultVariants: {
      align: "inline-start",
    },
  },
);

function InputGroupAddon({ className, align = "inline-start", ...props }) {
  return (
    <div
      role="group"
      data-slot="input-group-addon"
      data-align={align}
      className={cn(inputGroupAddonVariants({ align }), className)}
      onClick={(e) => {
        if (e.target.closest("button")) {
          return;
        }
        e.currentTarget.parentElement?.querySelector("input")?.focus();
      }}
      {...props}
    />
  );
}

const inputGroupButtonVariants = cva(
  "fhint:flex fhint:items-center fhint:gap-2 fhint:text-sm fhint:shadow-none",
  {
    variants: {
      size: {
        xs: "fhint:h-6 fhint:gap-1 fhint:rounded-[calc(var(--radius)-5px)] fhint:px-1.5 fhint:[&>svg:not([class*=size-])]:size-3.5",
        sm: "fhint:",
        "icon-xs":
          "fhint:size-6 fhint:rounded-[calc(var(--radius)-5px)] fhint:p-0 fhint:has-[>svg]:p-0",
        "icon-sm": "fhint:size-8 fhint:p-0 fhint:has-[>svg]:p-0",
      },
    },
    defaultVariants: {
      size: "xs",
    },
  },
);

function InputGroupButton({
  className,
  type = "button",
  variant = "ghost",
  size = "xs",
  ...props
}) {
  return (
    <Button
      type={type}
      data-size={size}
      variant={variant}
      className={cn(inputGroupButtonVariants({ size }), className)}
      {...props}
    />
  );
}

function InputGroupText({ className, ...props }) {
  return (
    <span
      className={cn(
        "fhint:flex fhint:items-center fhint:gap-2 fhint:text-sm fhint:text-muted-foreground fhint:[&_svg]:pointer-events-none fhint:[&_svg:not([class*=size-])]:size-4",
        className,
      )}
      {...props}
    />
  );
}

function InputGroupInput({ className, ...props }) {
  return (
    <Input
      data-slot="input-group-control"
      className={cn(
        "fhint:flex-1 fhint:rounded-none fhint:border-0 fhint:bg-transparent fhint:shadow-none fhint:ring-0 fhint:focus-visible:ring-0 fhint:aria-invalid:ring-0 fhint:dark:bg-transparent",
        className,
      )}
      {...props}
    />
  );
}

function InputGroupTextarea({ className, ...props }) {
  return (
    <Textarea
      data-slot="input-group-control"
      className={cn(
        "fhint:flex-1 fhint:resize-none fhint:rounded-none fhint:border-0 fhint:bg-transparent fhint:py-2 fhint:shadow-none fhint:ring-0 fhint:focus-visible:ring-0 fhint:aria-invalid:ring-0 fhint:dark:bg-transparent",
        className,
      )}
      {...props}
    />
  );
}

export {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupText,
  InputGroupInput,
  InputGroupTextarea,
};
