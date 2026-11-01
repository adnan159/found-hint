import { cn } from "cn";
import { textInput } from "@/lib/fieldStyles";
import { focus } from "../../styles";

// The service form is set a size larger than the sections behind it: it is
// a dialog with one job, read at arm's length rather than scanned.
export const fieldLabel = "fhint:text-[15px] fhint:font-extrabold";
export const optionalText =
  "fhint:text-[14px] fhint:font-normal fhint:text-muted-strong";
export const counterText =
  "fhint:ml-auto fhint:text-[13px] fhint:font-bold fhint:text-muted-foreground";
export const fieldControl = cn(
  textInput({ size: "lg" }),
  // WordPress caps every select at 25rem.
  "fhint:max-w-none!",
);
export const pillButton = cn(
  "fhint:inline-flex fhint:h-11 fhint:cursor-pointer fhint:items-center fhint:gap-2 fhint:rounded-full fhint:px-6 fhint:text-[14.5px] fhint:font-extrabold",
  focus,
);
