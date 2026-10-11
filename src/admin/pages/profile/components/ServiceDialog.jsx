import { useId, useState } from "react";
import { __, sprintf } from "@wordpress/i18n";
import { CheckIcon, InfoIcon, LinkIcon, PencilIcon, XIcon } from "lucide-react";
import { cn } from "cn";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { SERVICE_DESCRIPTION_MAX } from "../model";
import { errorText, focus } from "../styles";

const NAME_MAX = 140;

// Code and the sign shown beside it, as the design lists them.
const CURRENCIES = [
  ["USD", "$"],
  ["CAD", "$"],
  ["GBP", "£"],
  ["EUR", "€"],
  ["AUD", "$"],
  ["INR", "₹"],
  ["BDT", "৳"],
  ["AED", "د.إ"],
];

const fieldLabel = "fhint:text-[15px] fhint:font-extrabold";
const optional = "fhint:text-[14px] fhint:font-normal fhint:text-muted-strong";
const counter =
  "fhint:ml-auto fhint:text-[13px] fhint:font-bold fhint:text-muted-foreground";
const control = cn(
  // `max-w-none!`: WordPress caps every select at 25rem.
  "fhint:w-full fhint:max-w-none! fhint:min-w-0 fhint:border fhint:border-input fhint:bg-card fhint:px-4! fhint:py-3! fhint:text-[15px] fhint:text-foreground fhint:placeholder:text-muted-foreground fhint:aria-invalid:border-destructive",
  focus,
);
const pill = cn(
  "fhint:inline-flex fhint:h-11 fhint:cursor-pointer fhint:items-center fhint:gap-2 fhint:rounded-full fhint:px-6 fhint:text-[14.5px] fhint:font-extrabold",
  focus,
);

/**
 * The small "i" beside a label.
 *
 * What it says is also in the page as text tied to the field, so the hint
 * does not depend on hovering — a tooltip alone would never reach somebody
 * on a keyboard or a touch screen.
 */
function Hint({ id, children }) {
  return (
    <>
      <InfoIcon
        aria-hidden="true"
        title={children}
        className="fhint:size-4 fhint:flex-none fhint:text-muted-foreground"
      />
      <span id={id} className="fhint:sr-only">
        {children}
      </span>
    </>
  );
}

/**
 * Add or edit one service.
 *
 * A service is one of two kinds on Google, and the switch at the top chooses
 * which. A **Google service** is one Google already has on its own list for
 * the listing's categories — "Cat grooming" — and is sent as that entry, so
 * Google can match it to searches. A **custom name** is the owner's own
 * words. The name is kept either way, because this site's markup uses it.
 *
 * It edits a copy: nothing reaches the list until "Save service", and
 * nothing reaches the server until the page is saved.
 */
export function ServiceDialog({
  draft,
  isNew,
  googleTypes = [],
  taken = [],
  onClose,
  onSave,
}) {
  const id = useId();
  const [value, setValue] = useState(() => ({
    ...draft,
    currency: draft.currency || "USD",
  }));
  const [mode, setMode] = useState(
    draft.google_item_type === "structured" && draft.google_service_type_id
      ? "google"
      : "custom",
  );
  const [tried, setTried] = useState(false);

  const set = (key) => (event) =>
    setValue((current) => ({ ...current, [key]: event.target.value }));

  // The type this row already uses stays on offer even if Google has since
  // dropped it from the list, so opening the form never loses the choice.
  const offered = googleTypes.filter((type) => !taken.includes(type.id));
  const chosenMissing =
    value.google_service_type_id &&
    !offered.some((type) => type.id === value.google_service_type_id);

  const nameEmpty = !value.name.trim();
  const typeEmpty = mode === "google" && !value.google_service_type_id;
  const tooLong = value.description.length > SERVICE_DESCRIPTION_MAX;
  const shown = value.status === "active";

  const currencies = CURRENCIES.some(([code]) => code === value.currency)
    ? CURRENCIES
    : [[value.currency, ""], ...CURRENCIES];

  const chooseType = (event) => {
    const type = googleTypes.find((item) => item.id === event.target.value);

    setValue((current) => ({
      ...current,
      google_service_type_id: event.target.value,
      // Google shows its own name for one of its services, so the name
      // here starts as that — unless the owner has already typed one.
      name:
        type && (!current.name.trim() || isGoogleName(current.name))
          ? type.label
          : current.name,
    }));
  };

  const isGoogleName = (name) =>
    googleTypes.some((type) => type.label === name.trim());

  const submit = (event) => {
    event.preventDefault();
    setTried(true);

    if (nameEmpty || typeEmpty || tooLong) {
      return;
    }

    const structured = mode === "google";

    onSave({
      ...value,
      name: value.name.trim(),
      // A price needs a currency to mean anything; no price, no currency.
      currency: value.price === "" ? "" : value.currency || "USD",
      google_item_type: structured ? "structured" : "free_form",
      google_service_type_id: structured ? value.google_service_type_id : "",
    });
  };

  const tab = (key, Icon, text) => (
    <button
      type="button"
      role="radio"
      aria-checked={mode === key}
      onClick={() => setMode(key)}
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
    <Dialog open onOpenChange={(open) => (open ? null : onClose())}>
      <DialogContent
        showCloseButton={false}
        className="fhint:flex fhint:max-h-[calc(100vh-4rem)] fhint:flex-col fhint:gap-0 fhint:rounded-none fhint:p-0 fhint:sm:max-w-[600px]"
      >
        <div className="fhint:flex fhint:flex-none fhint:items-center fhint:gap-4 fhint:border-b fhint:border-b-border fhint:px-7 fhint:py-5">
          <DialogTitle className="fhint:m-0 fhint:flex-1 fhint:text-[22px] fhint:leading-tight fhint:font-extrabold fhint:tracking-[-0.01em]">
            {isNew
              ? __("Add service", "foundhint-local-seo")
              : __("Edit service", "foundhint-local-seo")}
          </DialogTitle>
          <DialogDescription className="fhint:sr-only">
            {__(
              "This service is shown on your Google profile and in your website markup.",
              "foundhint-local-seo",
            )}
          </DialogDescription>
          <DialogClose
            className={cn(
              "fhint:grid fhint:size-10 fhint:flex-none fhint:cursor-pointer fhint:place-items-center fhint:rounded-full fhint:border fhint:border-border fhint:bg-card fhint:text-foreground fhint:hover:bg-muted",
              focus,
            )}
          >
            <XIcon aria-hidden="true" className="fhint:size-[18px]" />
            <span className="fhint:sr-only">
              {__("Close", "foundhint-local-seo")}
            </span>
          </DialogClose>
        </div>

        <form
          onSubmit={submit}
          noValidate
          className="fhint:flex fhint:min-h-0 fhint:flex-1 fhint:flex-col"
        >
          <div className="fhint:grid fhint:min-h-0 fhint:flex-1 fhint:gap-6 fhint:overflow-y-auto fhint:px-7 fhint:py-6">
            <div
              role="radiogroup"
              aria-label={__("Kind of service", "foundhint-local-seo")}
              className="fhint:flex fhint:gap-1 fhint:rounded-full fhint:bg-background fhint:p-1"
            >
              {tab(
                "custom",
                PencilIcon,
                __("Custom name", "foundhint-local-seo"),
              )}
              {tab(
                "google",
                LinkIcon,
                __("Google service", "foundhint-local-seo"),
              )}
            </div>

            {mode === "google" ? (
              <div className="fhint:grid fhint:gap-2.5">
                <div className="fhint:flex fhint:items-center fhint:gap-2">
                  <label htmlFor={`${id}-type`} className={fieldLabel}>
                    {__("Google service", "foundhint-local-seo")}
                  </label>
                  <Hint id={`${id}-type-hint`}>
                    {__(
                      "Services Google already knows for your categories. Picking one helps Google match you to searches for it.",
                      "foundhint-local-seo",
                    )}
                  </Hint>
                </div>
                <select
                  id={`${id}-type`}
                  value={value.google_service_type_id}
                  onChange={chooseType}
                  disabled={!googleTypes.length && !chosenMissing}
                  aria-invalid={tried && typeEmpty ? true : undefined}
                  aria-describedby={`${id}-type-hint ${id}-type-note`}
                  className={control}
                >
                  <option value="">
                    {__("Choose a service", "foundhint-local-seo")}
                  </option>
                  {chosenMissing ? (
                    <option value={value.google_service_type_id}>
                      {value.name || value.google_service_type_id}
                    </option>
                  ) : null}
                  {offered.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.label}
                    </option>
                  ))}
                </select>
                <span
                  id={`${id}-type-note`}
                  role={tried && typeEmpty ? "alert" : undefined}
                  className={cn(
                    "fhint:text-[13px]",
                    tried && typeEmpty && googleTypes.length
                      ? errorText
                      : "fhint:text-muted-strong",
                    !(tried && typeEmpty) &&
                      googleTypes.length &&
                      "fhint:sr-only",
                  )}
                >
                  {googleTypes.length
                    ? __(
                        "Choose a service from the list, or switch to Custom name.",
                        "foundhint-local-seo",
                      )
                    : __(
                        "Google has no ready-made services for this listing’s categories, or they have not been read yet. Press Refresh from Google at the top of the page, or use a custom name.",
                        "foundhint-local-seo",
                      )}
                </span>
              </div>
            ) : null}

            <div className="fhint:grid fhint:gap-2.5">
              <div className="fhint:flex fhint:items-center fhint:gap-2">
                <label htmlFor={`${id}-name`} className={fieldLabel}>
                  {__("Service name", "foundhint-local-seo")}
                </label>
                <Hint id={`${id}-name-hint`}>
                  {__(
                    "Use the words customers search for, like “Emergency dentist”.",
                    "foundhint-local-seo",
                  )}
                </Hint>
                <span className={counter}>
                  {value.name.length}/{NAME_MAX}
                </span>
              </div>
              <input
                id={`${id}-name`}
                value={value.name}
                maxLength={NAME_MAX}
                onChange={set("name")}
                aria-invalid={tried && nameEmpty ? true : undefined}
                aria-describedby={`${id}-name-hint`}
                className={control}
              />
              {tried && nameEmpty ? (
                <span role="alert" className={errorText}>
                  {__(
                    "Please add a name for this service.",
                    "foundhint-local-seo",
                  )}
                </span>
              ) : null}
            </div>

            <div className="fhint:grid fhint:gap-2.5">
              <div className="fhint:flex fhint:items-center fhint:gap-2">
                <label htmlFor={`${id}-price`} className={fieldLabel}>
                  {__("Price", "foundhint-local-seo")}
                </label>
                <span className={optional}>
                  {__("Optional", "foundhint-local-seo")}
                </span>
                <Hint id={`${id}-price-hint`}>
                  {__(
                    "Shown next to the service on Google. Leave it empty if the price depends on the visit.",
                    "foundhint-local-seo",
                  )}
                </Hint>
              </div>
              <div className="fhint:flex">
                <select
                  value={value.currency}
                  onChange={set("currency")}
                  aria-label={__("Currency", "foundhint-local-seo")}
                  className={cn(
                    control,
                    "fhint:w-[130px] fhint:flex-none fhint:border-r-0 fhint:bg-muted",
                  )}
                >
                  {currencies.map(([code, sign]) => (
                    <option key={code} value={code}>
                      {`${code} ${sign}`.trim()}
                    </option>
                  ))}
                </select>
                <input
                  id={`${id}-price`}
                  type="number"
                  min="0"
                  step="any"
                  inputMode="decimal"
                  value={value.price}
                  onChange={set("price")}
                  aria-describedby={`${id}-price-hint`}
                  className={control}
                />
              </div>
            </div>

            <div className="fhint:grid fhint:gap-2.5">
              <div className="fhint:flex fhint:items-center fhint:gap-2">
                <label htmlFor={`${id}-description`} className={fieldLabel}>
                  {__("Description", "foundhint-local-seo")}
                </label>
                <span className={optional}>
                  {__("Optional", "foundhint-local-seo")}
                </span>
                <span
                  className={cn(counter, tooLong && "fhint:text-destructive")}
                >
                  {value.description.length}/{SERVICE_DESCRIPTION_MAX}
                </span>
              </div>
              <textarea
                id={`${id}-description`}
                rows={4}
                value={value.description}
                onChange={set("description")}
                placeholder={__(
                  "What this service is, in one or two plain sentences",
                  "foundhint-local-seo",
                )}
                aria-invalid={tooLong ? true : undefined}
                className={cn(control, "fhint:resize-y fhint:leading-[1.5]")}
              />
              {tooLong ? (
                <span role="alert" className={errorText}>
                  {sprintf(
                    /* translators: %d: the most characters allowed. */
                    __(
                      "Google shows %d characters at most. Please shorten it.",
                      "foundhint-local-seo",
                    ),
                    SERVICE_DESCRIPTION_MAX,
                  )}
                </span>
              ) : null}
            </div>

            <div className="fhint:flex fhint:items-center fhint:gap-4 fhint:border-t fhint:border-t-border fhint:pt-6">
              <div className="fhint:min-w-0 fhint:flex-1">
                <span
                  id={`${id}-shown`}
                  className={cn(fieldLabel, "fhint:block")}
                >
                  {__("Show on Google", "foundhint-local-seo")}
                </span>
                <span
                  id={`${id}-shown-hint`}
                  className="fhint:text-[13px] fhint:text-muted-strong"
                >
                  {__(
                    "Turn this off to hide the service for now without deleting it.",
                    "foundhint-local-seo",
                  )}
                </span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={shown}
                aria-labelledby={`${id}-shown`}
                aria-describedby={`${id}-shown-hint`}
                onClick={() =>
                  setValue((current) => ({
                    ...current,
                    status: shown ? "inactive" : "active",
                  }))
                }
                className={cn(
                  "fhint:relative fhint:h-7 fhint:w-[52px] fhint:flex-none fhint:cursor-pointer fhint:rounded-full fhint:border-0 fhint:p-0 fhint:transition-colors",
                  shown ? "fhint:bg-primary" : "fhint:bg-input",
                  focus,
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "fhint:absolute fhint:top-[3px] fhint:size-[22px] fhint:rounded-full fhint:bg-card fhint:transition-[left]",
                    shown ? "fhint:left-[27px]" : "fhint:left-[3px]",
                  )}
                />
              </button>
            </div>
          </div>

          <div className="fhint:flex fhint:flex-none fhint:justify-end fhint:gap-3 fhint:border-t fhint:border-t-border fhint:px-7 fhint:py-5">
            <button
              type="button"
              onClick={onClose}
              className={cn(
                pill,
                "fhint:border fhint:border-input fhint:bg-card fhint:text-foreground fhint:hover:bg-muted",
              )}
            >
              {__("Cancel", "foundhint-local-seo")}
            </button>
            <button
              type="submit"
              className={cn(
                pill,
                "fhint:border-0 fhint:bg-primary fhint:text-primary-foreground fhint:hover:bg-primary/90",
              )}
            >
              <CheckIcon aria-hidden="true" className="fhint:size-4" />
              {__("Save service", "foundhint-local-seo")}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default ServiceDialog;
