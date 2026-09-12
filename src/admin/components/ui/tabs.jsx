"use client";

import { Tabs as TabsPrimitive } from "@base-ui/react/tabs";
import { cva } from "class-variance-authority";
import { cn } from "cn";

function Tabs({ className, orientation = "horizontal", ...props }) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      data-orientation={orientation}
      className={cn(
        "fhint:group/tabs fhint:flex fhint:gap-2 fhint:data-horizontal:flex-col",
        className,
      )}
      {...props}
    />
  );
}

const tabsListVariants = cva(
  "fhint:group/tabs-list fhint:inline-flex fhint:w-fit fhint:items-center fhint:justify-center fhint:rounded-lg fhint:p-[3px] fhint:text-muted-foreground fhint:group-data-horizontal/tabs:h-9 fhint:group-data-vertical/tabs:h-fit fhint:group-data-vertical/tabs:flex-col fhint:data-[variant=line]:rounded-none",
  {
    variants: {
      variant: {
        default: "fhint:bg-muted",
        line: "fhint:gap-1 fhint:bg-transparent",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function TabsList({ className, variant = "default", ...props }) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      data-variant={variant}
      className={cn(tabsListVariants({ variant }), className)}
      {...props}
    />
  );
}

function TabsTrigger({ className, ...props }) {
  return (
    <TabsPrimitive.Tab
      data-slot="tabs-trigger"
      className={cn(
        "fhint:relative fhint:inline-flex fhint:h-[calc(100%-1px)] fhint:flex-1 fhint:items-center fhint:justify-center fhint:gap-1.5 fhint:rounded-md fhint:border fhint:border-transparent fhint:px-2 fhint:py-1 fhint:text-sm fhint:font-medium fhint:whitespace-nowrap fhint:text-foreground/60 fhint:transition-all fhint:group-data-vertical/tabs:w-full fhint:group-data-vertical/tabs:justify-start fhint:hover:text-foreground fhint:focus-visible:border-ring fhint:focus-visible:ring-[3px] fhint:focus-visible:ring-ring/50 fhint:focus-visible:outline-1 fhint:focus-visible:outline-ring fhint:disabled:pointer-events-none fhint:disabled:opacity-50 fhint:has-data-[icon=inline-end]:pr-1.5 fhint:has-data-[icon=inline-start]:pl-1.5 fhint:aria-disabled:pointer-events-none fhint:aria-disabled:opacity-50 fhint:dark:text-muted-foreground fhint:dark:hover:text-foreground fhint:group-data-[variant=default]/tabs-list:data-active:shadow-sm fhint:group-data-[variant=line]/tabs-list:data-active:shadow-none fhint:[&_svg]:pointer-events-none fhint:[&_svg]:shrink-0 fhint:[&_svg:not([class*=size-])]:size-4",
        "fhint:group-data-[variant=line]/tabs-list:bg-transparent fhint:group-data-[variant=line]/tabs-list:data-active:bg-transparent fhint:dark:group-data-[variant=line]/tabs-list:data-active:border-transparent fhint:dark:group-data-[variant=line]/tabs-list:data-active:bg-transparent",
        "fhint:data-active:bg-background fhint:data-active:text-foreground fhint:dark:data-active:border-input fhint:dark:data-active:bg-input/30 fhint:dark:data-active:text-foreground",
        "fhint:after:absolute fhint:after:bg-foreground fhint:after:opacity-0 fhint:after:transition-opacity fhint:group-data-horizontal/tabs:after:inset-x-0 fhint:group-data-horizontal/tabs:after:bottom-[-5px] fhint:group-data-horizontal/tabs:after:h-0.5 fhint:group-data-vertical/tabs:after:inset-y-0 fhint:group-data-vertical/tabs:after:-right-1 fhint:group-data-vertical/tabs:after:w-0.5 fhint:group-data-[variant=line]/tabs-list:data-active:after:opacity-100",
        className,
      )}
      {...props}
    />
  );
}

function TabsContent({ className, ...props }) {
  return (
    <TabsPrimitive.Panel
      data-slot="tabs-content"
      className={cn("fhint:flex-1 fhint:text-sm fhint:outline-none", className)}
      {...props}
    />
  );
}

export { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants };
