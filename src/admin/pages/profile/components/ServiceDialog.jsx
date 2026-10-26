import { useId, useState } from "react";
import { __ } from "@wordpress/i18n";
import { CheckIcon, XIcon } from "lucide-react";
import { cn } from "cn";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { SERVICE_DESCRIPTION_MAX } from "../model";
import { focus } from "../styles";
import GoogleTypeField from "./services/GoogleTypeField";
import KindSwitch from "./services/KindSwitch";
import NameField from "./services/NameField";
import PriceField from "./services/PriceField";
import ServiceDescriptionField from "./services/ServiceDescriptionField";
import ShownSwitch from "./services/ShownSwitch";
import { pillButton } from "./services/styles";

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
            <KindSwitch mode={mode} onChange={setMode} />

            {mode === "google" ? (
              <GoogleTypeField
                id={id}
                value={value}
                googleTypes={googleTypes}
                offered={offered}
                chosenMissing={chosenMissing}
                invalid={tried && typeEmpty}
                onChange={chooseType}
              />
            ) : null}

            <NameField
              id={id}
              value={value.name}
              invalid={tried && nameEmpty}
              onChange={set("name")}
            />

            <PriceField
              id={id}
              price={value.price}
              currency={value.currency}
              onPrice={set("price")}
              onCurrency={set("currency")}
            />

            <ServiceDescriptionField
              id={id}
              value={value.description}
              onChange={set("description")}
            />

            <ShownSwitch
              id={id}
              shown={shown}
              onToggle={() =>
                setValue((current) => ({
                  ...current,
                  status: shown ? "inactive" : "active",
                }))
              }
            />
          </div>

          <div className="fhint:flex fhint:flex-none fhint:justify-end fhint:gap-3 fhint:border-t fhint:border-t-border fhint:px-7 fhint:py-5">
            <button
              type="button"
              onClick={onClose}
              className={cn(
                pillButton,
                "fhint:border fhint:border-input fhint:bg-card fhint:text-foreground fhint:hover:bg-muted",
              )}
            >
              {__("Cancel", "foundhint-local-seo")}
            </button>
            <button
              type="submit"
              className={cn(
                pillButton,
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
