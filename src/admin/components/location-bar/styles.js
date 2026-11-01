import { cn } from "cn";
import { focus } from "@/pages/profile/styles";

// The header's pill buttons. Rounded, unlike the square controls inside the
// sections — that is the design's own distinction between the bar that says
// which business this is and the form that edits it.
export const pillButton = cn(
  "fhint:inline-flex fhint:h-9 fhint:cursor-pointer fhint:items-center fhint:gap-2 fhint:rounded-full fhint:border fhint:border-border fhint:bg-card fhint:px-4 fhint:text-[13px] fhint:font-bold fhint:whitespace-nowrap fhint:text-foreground fhint:no-underline fhint:hover:bg-muted fhint:disabled:cursor-not-allowed fhint:disabled:text-muted-foreground",
  focus,
);

// The pill, for a link: keeps its colour against WordPress's blue link hover.
export const pillLink = cn(pillButton, "fhint:text-foreground!");
