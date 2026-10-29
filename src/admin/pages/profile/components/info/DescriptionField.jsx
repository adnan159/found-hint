import { useId, useState } from "react";
import { __, _n, sprintf } from "@wordpress/i18n";
import { CircleAlertIcon, HistoryIcon } from "lucide-react";
import Hint from "@/components/Hint";
import { cn } from "cn";
import { DESCRIPTION_MAX, hasLink } from "../../model";
import {
  errorText,
  help,
  input,
  label,
  linkButton,
  quietButton,
} from "../../styles";

function formatWhen(value) {
  if (!value) {
    return "";
  }

  const parsed = new Date(`${String(value).replace(" ", "T")}Z`);

  return Number.isNaN(parsed.getTime())
    ? value
    : parsed.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
}

/**
 * The business description, with its character and word counts, the warning
 * Google's no-links rule earns, and the earlier versions to go back to.
 */
export function DescriptionField({
  value: description,
  onChange,
  error,
  history,
}) {
  const descriptionId = useId();
  const [historyOpen, setHistoryOpen] = useState(false);

  const tooLong = description.length > DESCRIPTION_MAX;
  const linked = hasLink(description);
  const words = description.trim() ? description.trim().split(/\s+/).length : 0;

  return (
    <div className="fhint:grid fhint:gap-[7px]">
      <div className="fhint:flex fhint:flex-wrap fhint:items-center fhint:gap-2">
        <div className="fhint:flex fhint:items-center fhint:gap-1.5">
          <label htmlFor={descriptionId} className={label}>
            {__("Business description", "foundhint-local-seo")}
          </label>
          <Hint
            about={__("Business description", "foundhint-local-seo")}
            text={__(
              "Say what you do and where, in plain words. Please do not add web links, because Google rejects descriptions that have them.",
              "foundhint-local-seo",
            )}
          />
        </div>
        <span className="fhint:ml-auto fhint:flex fhint:flex-wrap fhint:items-center fhint:gap-[7px]">
          {history.length ? (
            <button
              type="button"
              onClick={() => setHistoryOpen((value) => !value)}
              aria-expanded={historyOpen}
              className={cn(
                quietButton,
                "fhint:px-2.5 fhint:py-1.5 fhint:font-bold",
              )}
            >
              <HistoryIcon aria-hidden="true" className="fhint:size-[13px]" />
              {__("History", "foundhint-local-seo")}
            </button>
          ) : null}
          <span
            className={cn(
              "fhint:text-[12.5px] fhint:font-bold",
              tooLong
                ? "fhint:text-destructive"
                : "fhint:text-muted-foreground",
            )}
          >
            {sprintf(
              /* translators: 1: characters typed, 2: the most allowed. */
              __("%1$d / %2$d characters", "foundhint-local-seo"),
              description.length,
              DESCRIPTION_MAX,
            )}
          </span>
          <span className={help}>
            {sprintf(
              /* translators: %d: number of words. */
              _n("%d word", "%d words", words, "foundhint-local-seo"),
              words,
            )}
          </span>
        </span>
      </div>
      <textarea
        id={descriptionId}
        rows={4}
        value={description}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={tooLong || linked || error ? true : undefined}
        aria-describedby={`${descriptionId}-help`}
        className={cn(
          input,
          "fhint:resize-y fhint:text-[13.5px] fhint:leading-[1.55]",
        )}
      />
      <div id={`${descriptionId}-help`} className="fhint:grid fhint:gap-1.5">
        {linked ? (
          <span
            className={cn(
              errorText,
              "fhint:flex fhint:items-start fhint:gap-2",
            )}
          >
            <CircleAlertIcon
              aria-hidden="true"
              className="fhint:mt-px fhint:size-[15px] fhint:flex-none"
            />
            {__(
              "Your description has a web link in it. Google does not allow links here and will reject the update, so please remove it.",
              "foundhint-local-seo",
            )}
          </span>
        ) : null}
        {error && !linked ? (
          <span role="alert" className={errorText}>
            {error}
          </span>
        ) : null}
      </div>
      {historyOpen ? (
        <ul className="fhint:m-0 fhint:list-none fhint:border fhint:border-border fhint:bg-muted fhint:p-0">
          {history.map((version) => (
            <li
              key={version.id}
              className="fhint:m-0 fhint:flex fhint:flex-wrap fhint:items-start fhint:gap-3 fhint:border-b fhint:border-b-[#e6e3e3] fhint:px-3.5 fhint:py-[11px] fhint:last:border-b-0"
            >
              <span className="fhint:w-[110px] fhint:flex-none fhint:text-[12.5px] fhint:font-bold fhint:text-muted-strong">
                {formatWhen(version.created_at)}
              </span>
              <span className="fhint:min-w-[200px] fhint:flex-1 fhint:text-[12.5px] fhint:leading-[1.45] fhint:text-foreground-soft">
                {version.description}
              </span>
              <button
                type="button"
                onClick={() => onChange(version.description)}
                className={linkButton}
              >
                {__("Use this", "foundhint-local-seo")}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export default DescriptionField;
