import { useId, useState } from "react";
import { __ } from "@wordpress/i18n";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { label } from "@/pages/profile/styles";
import { dialogButton, dialogInput, primaryAction } from "@/pages/posts/styles";

/**
 * With more than one Google listing, which one the post goes on. (On the
 * Posts screen the location bar decides; the editor has none.)
 */
export function ChooseListing({ listings, onChoose, onClose }) {
  const id = useId();
  const [value, setValue] = useState(listings[0]?.location_name ?? "");

  return (
    <Dialog open onOpenChange={(open) => (open ? null : onClose())}>
      <DialogContent className="fhint:grid fhint:max-w-md fhint:gap-4 fhint:rounded-none fhint:p-6">
        <DialogTitle className="fhint:m-0 fhint:text-lg fhint:font-extrabold">
          {__("Which location is this post for?", "foundhint-local-seo")}
        </DialogTitle>
        <DialogDescription className="fhint:m-0 fhint:text-sm">
          {__(
            "The post goes on that location's Google Business Profile.",
            "foundhint-local-seo",
          )}
        </DialogDescription>
        <div className="fhint:grid fhint:gap-1.5">
          <label htmlFor={id} className={label}>
            {__("Location", "foundhint-local-seo")}
          </label>
          <select
            id={id}
            value={value}
            onChange={(event) => setValue(event.target.value)}
            className={dialogInput}
          >
            {listings.map((item) => (
              <option key={item.location_name} value={item.location_name}>
                {item.title}
              </option>
            ))}
          </select>
        </div>
        <div className="fhint:flex fhint:justify-end fhint:gap-2">
          <button type="button" onClick={onClose} className={dialogButton}>
            {__("Cancel", "foundhint-local-seo")}
          </button>
          <button
            type="button"
            onClick={() => onChoose(value)}
            className={primaryAction}
          >
            {__("Continue", "foundhint-local-seo")}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ChooseListing;
