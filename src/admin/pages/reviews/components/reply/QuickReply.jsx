import { __ } from "@wordpress/i18n";
import { cn } from "cn";
import { focus, label } from "@/pages/profile/styles";
import { builtInReply } from "../../lib/replies";

// A rounded pill that fills the reply when pressed.
const pill = cn(
  "fhint:inline-flex fhint:cursor-pointer fhint:items-center fhint:rounded-full fhint:border fhint:border-input fhint:bg-card fhint:px-3.5 fhint:py-1.5 fhint:text-sm fhint:font-bold fhint:text-foreground fhint:hover:bg-muted",
  focus,
);

/**
 * The reply dialog's built-in reply. Pressing it fills the reply with this
 * review's details, ready to edit before it is published.
 *
 * @param {Object}   props
 * @param {Object}   props.review  The review.
 * @param {Object}   props.context From `replyContextFor()`.
 * @param {Function} props.onPick  Receives the filled reply.
 */
export function QuickReply({ review, context, onPick }) {
  return (
    <div className="fhint:grid fhint:gap-2">
      <span className={label}>{__("Quick reply", "foundhint-local-seo")}</span>
      <div className="fhint:flex fhint:flex-wrap fhint:items-center fhint:gap-2">
        <button
          type="button"
          onClick={() => onPick(builtInReply(review, context))}
          className={pill}
        >
          {__("Built-in reply", "foundhint-local-seo")}
        </button>
      </div>
    </div>
  );
}

export default QuickReply;
