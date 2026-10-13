import { cn } from "cn";
import { focus } from "../../styles";

// The service form is set a size larger than the sections behind it: it is
// a dialog with one job, read at arm's length rather than scanned.
export const fieldLabel = "fhint:text-[15px] fhint:font-extrabold";
export const optionalText =
  "fhint:text-[14px] fhint:font-normal fhint:text-muted-strong";
export const counterText =
  "fhint:ml-auto fhint:text-[13px] fhint:font-bold fhint:text-muted-foreground";
export const fieldControl = cn(
  // `max-w-none!`: WordPress caps every select at 25rem.
  "fhint:w-full fhint:max-w-none! fhint:min-w-0 fhint:border fhint:border-input fhint:bg-card fhint:px-4! fhint:py-3! fhint:text-[15px] fhint:text-foreground fhint:placeholder:text-muted-foreground fhint:aria-invalid:border-destructive",
  focus,
);
export const pillButton = cn(
  "fhint:inline-flex fhint:h-11 fhint:cursor-pointer fhint:items-center fhint:gap-2 fhint:rounded-full fhint:px-6 fhint:text-[14.5px] fhint:font-extrabold",
  focus,
);
