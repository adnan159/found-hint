import { __ } from "@wordpress/i18n";
import { LinkIcon, PencilIcon } from "lucide-react";
import { cn } from "cn";
import { focus } from "../../styles";

/**
 * Which of Google's two kinds of service this is: the owner's own words, or
 * an entry from Google's list. A radio group, so it is announced as a choice
 * of one and works from the keyboard.
 */
export function KindSwitch({ mode, onChange }) {
  const tab = (key, Icon, text) => (
    <button
      type="button"
      role="radio"
      aria-checked={mode === key}
      onClick={() => onChange(key)}
      className={cn(
        "fhint:inline-flex fhint:h-12 fhint:flex-1 fhint:cursor-pointer fhint:items-center fhint:justify-center fhint:gap-2 fhint:rounded-full fhint:border-0 fhint:text-[15px] fhint:font-extrabold",
        mode === key
          ? "fhint:bg-card fhint:text-foreground fhint:shadow-[0_1px_4px_rgba(45,43,43,0.18)]"
          : "fhint:bg-transparent fhint:text-muted-strong",
        focus,
      )}
    >
      <Icon aria-hidden="true" className="fhint:size-4" />
      {text}
    </button>
  );

  return (
    <div
      role="radiogroup"
      aria-label={__("Kind of service", "foundhint-local-seo")}
      className="fhint:flex fhint:gap-1 fhint:rounded-full fhint:bg-background fhint:p-1"
    >
      {tab("custom", PencilIcon, __("Custom name", "foundhint-local-seo"))}
      {tab("google", LinkIcon, __("Google service", "foundhint-local-seo"))}
    </div>
  );
}

export default KindSwitch;
