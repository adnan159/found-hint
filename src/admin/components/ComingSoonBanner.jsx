import { __ } from "@wordpress/i18n";
import { SparklesIcon } from "lucide-react";

/**
 * A heads-up that a fuller version of a screen is on its way.
 *
 * In the notice colours, like `NoticeBar`, and for the same reason: news is
 * not a problem, so it is not an Alert. A plain note rather than a live
 * region — it is there when the page opens and never changes, so there is
 * nothing to announce. The "Coming soon" tag says it in words beside the
 * icon, so nothing rests on colour, and is dark on white: at that size,
 * white on the accent orange falls short of readable contrast.
 *
 * @param {Object} props
 * @param {string} props.title       e.g. "Advanced dashboard coming soon!"
 * @param {string} props.description What is coming, in a sentence.
 */
export function ComingSoonBanner({ title, description }) {
  return (
    <aside
      aria-label={title}
      className="fhint:flex fhint:items-start fhint:gap-3.5 fhint:rounded-[12px] fhint:border fhint:border-notice-border fhint:bg-notice fhint:px-4 fhint:py-3.5 fhint:text-notice-foreground"
    >
      <span
        aria-hidden="true"
        className="fhint:grid fhint:size-9 fhint:flex-none fhint:place-items-center fhint:rounded-[8px] fhint:bg-primary/15 fhint:text-primary"
      >
        <SparklesIcon className="fhint:size-[18px]" />
      </span>
      <div className="fhint:grid fhint:min-w-0 fhint:flex-1 fhint:gap-0.5">
        <div className="fhint:flex fhint:flex-wrap fhint:items-center fhint:gap-2">
          <strong className="fhint:text-[14.5px] fhint:font-extrabold">
            {title}
          </strong>
          <span className="fhint:rounded-full fhint:border fhint:border-notice-border fhint:bg-card fhint:px-2 fhint:py-0.5 fhint:text-[10.5px] fhint:font-extrabold fhint:tracking-[0.08em] fhint:text-notice-foreground fhint:uppercase">
            {__("Coming soon", "foundhint-local-seo")}
          </span>
        </div>
        <p className="fhint:m-0 fhint:text-[13px] fhint:leading-relaxed">
          {description}
        </p>
      </div>
    </aside>
  );
}

export default ComingSoonBanner;
