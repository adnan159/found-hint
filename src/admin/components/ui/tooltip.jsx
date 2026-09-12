import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip";
import { cn } from "cn";

function TooltipProvider({ delay = 0, ...props }) {
  return (
    <TooltipPrimitive.Provider
      data-slot="tooltip-provider"
      delay={delay}
      {...props}
    />
  );
}

function Tooltip({ ...props }) {
  return <TooltipPrimitive.Root data-slot="tooltip" {...props} />;
}

function TooltipTrigger({ ...props }) {
  return <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props} />;
}

function TooltipContent({
  className,
  side = "top",
  sideOffset = 4,
  align = "center",
  alignOffset = 0,
  children,
  ...props
}) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Positioner
        align={align}
        alignOffset={alignOffset}
        side={side}
        sideOffset={sideOffset}
        className="fhint:isolate fhint:z-50"
      >
        <TooltipPrimitive.Popup
          data-slot="tooltip-content"
          className={cn(
            "fhint:z-50 fhint:inline-flex fhint:w-fit fhint:max-w-xs fhint:origin-(--transform-origin) fhint:items-center fhint:gap-1.5 fhint:rounded-md fhint:bg-foreground fhint:px-3 fhint:py-1.5 fhint:text-xs fhint:text-background fhint:has-data-[slot=kbd]:pr-1.5 fhint:data-[side=bottom]:slide-in-from-top-2 fhint:data-[side=inline-end]:slide-in-from-left-2 fhint:data-[side=inline-start]:slide-in-from-right-2 fhint:data-[side=left]:slide-in-from-right-2 fhint:data-[side=right]:slide-in-from-left-2 fhint:data-[side=top]:slide-in-from-bottom-2 fhint:**:data-[slot=kbd]:relative fhint:**:data-[slot=kbd]:isolate fhint:**:data-[slot=kbd]:z-50 fhint:**:data-[slot=kbd]:rounded-sm fhint:data-[state=delayed-open]:animate-in fhint:data-[state=delayed-open]:fade-in-0 fhint:data-[state=delayed-open]:zoom-in-95 fhint:data-open:animate-in fhint:data-open:fade-in-0 fhint:data-open:zoom-in-95 fhint:data-closed:animate-out fhint:data-closed:fade-out-0 fhint:data-closed:zoom-out-95",
            className,
          )}
          {...props}
        >
          {children}
          <TooltipPrimitive.Arrow className="fhint:z-50 fhint:size-2.5 fhint:translate-y-[calc(-50%-2px)] fhint:rotate-45 fhint:rounded-[2px] fhint:bg-foreground fhint:fill-foreground fhint:data-[side=bottom]:top-1 fhint:data-[side=inline-end]:top-1/2! fhint:data-[side=inline-end]:-left-1 fhint:data-[side=inline-end]:-translate-y-1/2 fhint:data-[side=inline-start]:top-1/2! fhint:data-[side=inline-start]:-right-1 fhint:data-[side=inline-start]:-translate-y-1/2 fhint:data-[side=left]:top-1/2! fhint:data-[side=left]:-right-1 fhint:data-[side=left]:-translate-y-1/2 fhint:data-[side=right]:top-1/2! fhint:data-[side=right]:-left-1 fhint:data-[side=right]:-translate-y-1/2 fhint:data-[side=top]:-bottom-2.5" />
        </TooltipPrimitive.Popup>
      </TooltipPrimitive.Positioner>
    </TooltipPrimitive.Portal>
  );
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
