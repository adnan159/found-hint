import { __ } from "@wordpress/i18n";
import { FileIcon, ZapIcon } from "lucide-react";
import { help, label } from "@/pages/profile/styles";
import { choice } from "../../styles";

function note(when) {
  if (when === "draft") {
    return __(
      "Saved here only. Nothing goes to Google until you finish it.",
      "foundhint-local-seo",
    );
  }

  return __(
    "Goes live when you press Publish. Google can take a few minutes to show it.",
    "foundhint-local-seo",
  );
}

/**
 * Now or Draft: publish to Google when saved, or keep it on this site.
 *
 * @param {Object}   props
 * @param {string}   props.when     `now` or `draft`.
 * @param {Function} props.onChange Picks one.
 */
export function WhenToPublish({ when, onChange }) {
  const options = [
    ["now", ZapIcon, __("Now", "foundhint-local-seo")],
    ["draft", FileIcon, __("Draft", "foundhint-local-seo")],
  ];

  return (
    <div className="fhint:grid fhint:gap-2">
      <span className={label}>
        {__("When to publish", "foundhint-local-seo")}
      </span>
      <div
        role="radiogroup"
        aria-label={__("When to publish", "foundhint-local-seo")}
        className="fhint:flex fhint:flex-wrap fhint:gap-2"
      >
        {options.map(([value, Icon, text]) => {
          const on = when === value;

          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => onChange(value)}
              className={choice(on)}
            >
              <Icon aria-hidden="true" className="fhint:size-3.5" />
              {text}
            </button>
          );
        })}
      </div>
      <span className={help} aria-live="polite">
        {note(when)}
      </span>
    </div>
  );
}

export default WhenToPublish;
