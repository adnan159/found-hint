import { __, sprintf } from "@wordpress/i18n";
import { cn } from "cn";
import { InfoIcon } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Kept here rather than imported from a screen's own stylesheet: this is the
// same focus ring the rest of the admin draws, and a shared component must
// not reach into one page's styles to get it.
const FOCUS =
  "fhint:outline-none fhint:focus-visible:ring-2 fhint:focus-visible:ring-ring fhint:focus-visible:ring-offset-1";

/**
 * The small info button that sits beside a label or a heading and holds that
 * field's guidance.
 *
 * Advice used to sit under every input as permanent help text, which made a
 * form twice as tall as the fields it was explaining. It is the same words,
 * read on request — so it is a `button`, not a hover-only icon: it opens on
 * focus as well as on hover, closes on Escape, and is reachable by keyboard
 * and by a screen reader.
 *
 * Only guidance belongs in here. An error or a warning has to be on screen
 * without being asked for, so those stay under the field where `role="alert"`
 * can announce them.
 *
 *     <Hint about={__( 'Business name', 'foundhint-local-seo' )} text={ … } />
 *
 * @param {Object}                   props
 * @param {string}                   [props.about]   What the advice is about —
 *                                                   the field or section name.
 *                                                   It names the button for a
 *                                                   screen reader, so a page
 *                                                   with several hints does
 *                                                   not read as a row of
 *                                                   identical buttons.
 * @param {string|string[]}          [props.text]    One paragraph or several.
 * @param {import('react').ReactNode} [props.children] Richer content, in place
 *                                                   of `text`.
 * @param {string}                   [props.side]    Which side of the button
 *                                                   the popup takes.
 * @param {string}                   [props.align]   How the popup lines up
 *                                                   against the button.
 * @param {string}                   [props.className] Added to the button, for
 *                                                   a section that needs a
 *                                                   different size or colour.
 * @param {string}                   [props.contentClassName] Added to the
 *                                                   popup.
 */
export function Hint({
  about,
  text,
  children,
  side = "top",
  align = "center",
  className,
  contentClassName,
}) {
  const paragraphs = Array.isArray(text) ? text : [text];

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            aria-label={
              about
                ? sprintf(
                    /* translators: %s: the name of the field or section the advice is about. */
                    __("About %s", "foundhint-local-seo"),
                    about,
                  )
                : __("More information", "foundhint-local-seo")
            }
            className={cn(
              "fhint:inline-flex fhint:flex-none fhint:cursor-pointer fhint:items-center fhint:justify-center fhint:rounded-full fhint:border-0 fhint:bg-transparent fhint:p-0 fhint:text-muted-strong fhint:hover:text-foreground",
              FOCUS,
              className,
            )}
          />
        }
      >
        <InfoIcon aria-hidden="true" className="fhint:size-[15px]" />
      </TooltipTrigger>
      <TooltipContent
        side={side}
        align={align}
        className={cn(
          "fhint:max-w-75 fhint:flex-col fhint:items-start fhint:gap-2 fhint:px-3 fhint:py-2.5 fhint:text-[12.5px] fhint:leading-relaxed",
          contentClassName,
        )}
      >
        {children ??
          paragraphs.filter(Boolean).map((paragraph) => (
            <p key={paragraph} className="fhint:m-0">
              {paragraph}
            </p>
          ))}
      </TooltipContent>
    </Tooltip>
  );
}

export default Hint;
