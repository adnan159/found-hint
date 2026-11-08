import { __, sprintf } from "@wordpress/i18n";
import { XIcon } from "lucide-react";
import { cn } from "cn";
import {
  DialogClose,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { focus } from "@/pages/profile/styles";

/** The composer's title row: what is being written, for which listing. */
export function ComposerHeader({ isNew, onGoogle, scheduled, businessName }) {
  return (
    <div className="fhint:flex fhint:flex-none fhint:items-center fhint:gap-4 fhint:border-b fhint:border-b-border fhint:px-5 fhint:py-4">
      <div className="fhint:grid fhint:min-w-0 fhint:flex-1">
        <DialogTitle className="fhint:m-0 fhint:text-[17px] fhint:leading-tight fhint:font-extrabold">
          {isNew
            ? __("New post", "foundhint-local-seo")
            : onGoogle
              ? __("Edit post", "foundhint-local-seo")
              : scheduled
                ? __("Change scheduled post", "foundhint-local-seo")
                : __("Finish post", "foundhint-local-seo")}
        </DialogTitle>
        {businessName ? (
          <span className="fhint:truncate fhint:text-sm fhint:text-muted-strong">
            {sprintf(
              /* translators: %s: the Google listing's name. */
              __("For %s", "foundhint-local-seo"),
              businessName,
            )}
          </span>
        ) : null}
      </div>
      <DialogDescription className="fhint:sr-only">
        {__(
          "Write a post for your Google Business Profile. A preview of how Google shows it is beside the form.",
          "foundhint-local-seo",
        )}
      </DialogDescription>
      <DialogClose
        className={cn(
          "fhint:grid fhint:size-8 fhint:flex-none fhint:cursor-pointer fhint:place-items-center fhint:border fhint:border-[#b9b2af] fhint:bg-card fhint:text-foreground fhint:hover:bg-muted",
          focus,
        )}
      >
        <XIcon aria-hidden="true" className="fhint:size-4" />
        <span className="fhint:sr-only">
          {__("Close", "foundhint-local-seo")}
        </span>
      </DialogClose>
    </div>
  );
}

export default ComposerHeader;
