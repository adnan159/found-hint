import { useId, useState } from "react";
import { __ } from "@wordpress/i18n";
import { cn } from "cn";
import { help, label, primaryButton } from "@/pages/profile/styles";
import { dialogButton, dialogSmallInput } from "../styles";
import ReviewsDialog from "./ReviewsDialog";
import BrandCheckbox from "@/components/BrandCheckbox";
import SoonTag from "./SoonTag";

const CHOICES = () => [
  { value: "ai", label: __("AI reply", "foundhint-local-seo") },
  { value: "builtin", label: __("Built-in reply", "foundhint-local-seo") },
  { value: "templates", label: __("My templates", "foundhint-local-seo") },
  { value: "none", label: __("Don't reply", "foundhint-local-seo") },
];

const DEFAULTS = {
  5: ["ai", "builtin"],
  4: ["ai", "builtin"],
  3: ["templates", "builtin"],
  2: ["none", "none"],
  1: ["none", "none"],
};

function Segmented({ value, options, onChange, name }) {
  return (
    <div
      role="radiogroup"
      aria-label={name}
      className="fhint:inline-flex fhint:border fhint:border-border fhint:bg-muted fhint:p-0.5"
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            "fhint:cursor-pointer fhint:border-0 fhint:px-3 fhint:py-1.5 fhint:text-[12.5px] fhint:font-bold",
            value === option.value
              ? "fhint:bg-card fhint:text-foreground fhint:shadow-sm"
              : "fhint:bg-transparent fhint:text-muted-strong",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

/**
 * The auto-reply settings, as a preview: every choice can be looked at and
 * changed here, but nothing is saved — auto-reply is coming in FoundHint
 * Pro — and the footer says so rather than letting Save fail.
 */
export function AutoReplySetup({ onClose }) {
  const id = useId();
  const [which, setWhich] = useState("new");
  const [style, setStyle] = useState("foundhint");
  const [rules, setRules] = useState(DEFAULTS);
  const choices = CHOICES();

  const setRule = (rating, column) => (event) =>
    setRules((current) => {
      const next = [...current[rating]];
      next[column] = event.target.value;
      return { ...current, [rating]: next };
    });

  return (
    <ReviewsDialog
      title={__("Set up auto-reply", "foundhint-local-seo")}
      description={__(
        "A preview of the auto-reply settings, which are coming in FoundHint Pro.",
        "foundhint-local-seo",
      )}
      onClose={onClose}
      width="fhint:sm:max-w-[640px]"
      note={
        <span className="fhint:flex fhint:items-center fhint:gap-2">
          <SoonTag />
          {__("Auto-reply is coming in FoundHint Pro.", "foundhint-local-seo")}
        </span>
      }
      footer={
        <>
          <button type="button" onClick={onClose} className={dialogButton}>
            {__("Cancel", "foundhint-local-seo")}
          </button>
          <button type="button" disabled className={primaryButton}>
            {__("Save", "foundhint-local-seo")}
          </button>
        </>
      }
    >
      <div className="fhint:flex fhint:items-center fhint:gap-3 fhint:border fhint:border-border fhint:bg-muted/50 fhint:px-4 fhint:py-3">
        <span className="fhint:grid fhint:flex-1">
          <strong className="fhint:text-[14px]">
            {__("Auto-reply", "foundhint-local-seo")}
          </strong>
          <span className={help}>
            {__("Off. Nothing is sent automatically.", "foundhint-local-seo")}
          </span>
        </span>
        <span
          role="switch"
          aria-checked="false"
          aria-disabled="true"
          aria-label={__("Auto-reply (coming soon)", "foundhint-local-seo")}
          className="fhint:relative fhint:inline-block fhint:h-5 fhint:w-9 fhint:bg-border"
        >
          <span className="fhint:absolute fhint:top-0.5 fhint:left-0.5 fhint:size-4 fhint:bg-card" />
        </span>
      </div>

      <div className="fhint:grid fhint:gap-2">
        <span className={label}>
          {__("Which reviews", "foundhint-local-seo")}
        </span>
        <Segmented
          name={__("Which reviews", "foundhint-local-seo")}
          value={which}
          onChange={setWhich}
          options={[
            {
              value: "new",
              label: __("New reviews only", "foundhint-local-seo"),
            },
            {
              value: "unanswered",
              label: __("New and unanswered", "foundhint-local-seo"),
            },
          ]}
        />
        <span className={help}>
          {which === "new"
            ? __("Older reviews are left as they are.", "foundhint-local-seo")
            : __(
                "Reviews still waiting on a reply are answered too.",
                "foundhint-local-seo",
              )}
        </span>
      </div>

      <div className="fhint:grid fhint:gap-2">
        <span id={`${id}-how`} className={label}>
          {__("How to reply", "foundhint-local-seo")}
        </span>
        <table
          aria-labelledby={`${id}-how`}
          className="fhint:w-full fhint:border-collapse fhint:border fhint:border-border fhint:text-[12.5px]"
        >
          <thead className="fhint:bg-muted/60">
            <tr>
              <th scope="col" className="fhint:px-3 fhint:py-2 fhint:text-left">
                {__("Rating", "foundhint-local-seo")}
              </th>
              <th scope="col" className="fhint:px-3 fhint:py-2 fhint:text-left">
                {__("With a comment", "foundhint-local-seo")}
              </th>
              <th scope="col" className="fhint:px-3 fhint:py-2 fhint:text-left">
                {__("Stars only", "foundhint-local-seo")}
              </th>
            </tr>
          </thead>
          <tbody>
            {[5, 4, 3, 2, 1].map((rating) => (
              <tr key={rating} className="fhint:border-t fhint:border-border">
                <th
                  scope="row"
                  className="fhint:px-3 fhint:py-2 fhint:text-left fhint:font-extrabold"
                >
                  <span aria-hidden="true" className="fhint:text-[#C27A1B]">
                    ★{" "}
                  </span>
                  {rating}
                </th>
                {[0, 1].map((column) => (
                  <td key={column} className="fhint:px-3 fhint:py-1.5">
                    <select
                      value={rules[rating][column]}
                      onChange={setRule(rating, column)}
                      aria-label={`${rating} ★ — ${column ? __("Stars only", "foundhint-local-seo") : __("With a comment", "foundhint-local-seo")}`}
                      className={cn(
                        dialogSmallInput,
                        "fhint:w-full fhint:pr-7!",
                      )}
                    >
                      {choices.map((choice) => (
                        <option key={choice.value} value={choice.value}>
                          {choice.label}
                        </option>
                      ))}
                    </select>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <span className={help}>
          {__(
            "We suggest replying to 1 and 2 star reviews yourself. Unhappy customers notice a personal reply.",
            "foundhint-local-seo",
          )}
        </span>
      </div>

      <div className="fhint:grid fhint:gap-2 fhint:border fhint:border-border fhint:px-4 fhint:py-3">
        <span className="fhint:flex fhint:flex-wrap fhint:items-center fhint:gap-2">
          <span className={label}>
            {__("AI writing style", "foundhint-local-seo")}
          </span>
          <SoonTag />
        </span>
        <Segmented
          name={__("AI writing style", "foundhint-local-seo")}
          value={style}
          onChange={setStyle}
          options={[
            {
              value: "foundhint",
              label: __("FoundHint style", "foundhint-local-seo"),
            },
            {
              value: "own",
              label: __("My own instructions", "foundhint-local-seo"),
            },
          ]}
        />
        <span className={help}>
          {style === "foundhint"
            ? __(
                "Writes about what each customer actually said, and changes style so replies never sound the same.",
                "foundhint-local-seo",
              )
            : __(
                "Tell the AI how you like to reply — your tone, what to mention, what to avoid.",
                "foundhint-local-seo",
              )}
        </span>
        <label className="fhint:flex fhint:items-center fhint:gap-2 fhint:text-[12.5px] fhint:items-center">
          <BrandCheckbox defaultChecked />
          {__(
            "If AI replies run out, use a template instead of pausing",
            "foundhint-local-seo",
          )}
        </label>
      </div>
    </ReviewsDialog>
  );
}

export default AutoReplySetup;
