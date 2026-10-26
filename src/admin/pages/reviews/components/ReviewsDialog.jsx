import { __ } from "@wordpress/i18n";
import { XIcon } from "lucide-react";
import { cn } from "cn";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { focus } from "@/pages/profile/styles";

/**
 * The frame every dialog on the Reviews screen shares: a title with a close
 * button, a scrolling body, and a footer that says what pressing the main
 * button will do, beside the buttons themselves.
 *
 * @param {Object}   props
 * @param {string}   props.title       Dialog title.
 * @param {string}   props.description Read by screen readers.
 * @param {Function} props.onClose     Close the dialog.
 * @param {*}        props.footer      Buttons, right-aligned.
 * @param {string}   props.note        Words at the footer's left.
 * @param {string}   props.width       Tailwind max-width for the dialog.
 */
export function ReviewsDialog({
  title,
  description,
  onClose,
  footer,
  note,
  width = "fhint:sm:max-w-[560px]",
  children,
}) {
  return (
    <Dialog open onOpenChange={(open) => (open ? null : onClose())}>
      <DialogContent
        showCloseButton={false}
        className={cn(
          "fhint:flex fhint:max-h-[calc(100vh-4rem)] fhint:flex-col fhint:gap-0 fhint:rounded-none fhint:border fhint:border-[#b9b2af] fhint:p-0 fhint:shadow-2xl fhint:ring-0",
          width,
        )}
      >
        <div className="fhint:flex fhint:flex-none fhint:items-center fhint:gap-4 fhint:border-b fhint:border-b-border fhint:px-5 fhint:py-4">
          <DialogTitle className="fhint:m-0 fhint:flex-1 fhint:text-[17px] fhint:leading-tight fhint:font-extrabold">
            {title}
          </DialogTitle>
          <DialogDescription className="fhint:sr-only">
            {description}
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

        <div className="fhint:grid fhint:min-h-0 fhint:flex-1 fhint:gap-4 fhint:overflow-y-auto fhint:px-5 fhint:py-4">
          {children}
        </div>

        <div className="fhint:flex fhint:flex-none fhint:flex-wrap fhint:items-center fhint:gap-3 fhint:border-t fhint:border-t-border fhint:px-5 fhint:py-3.5">
          <span className="fhint:min-w-0 fhint:flex-1 fhint:text-[12.5px] fhint:text-muted-strong">
            {note}
          </span>
          <div className="fhint:flex fhint:gap-2">{footer}</div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ReviewsDialog;
