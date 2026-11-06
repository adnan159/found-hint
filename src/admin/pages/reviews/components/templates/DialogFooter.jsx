import { __ } from "@wordpress/i18n";
import { cn } from "cn";
import { dialogButton, primaryAction } from "../../styles";

/**
 * The template editor's buttons: Delete (asks once: "Yes, delete it"),
 * Cancel and Save — Save disabled, and saying why, without Premium.
 *
 * @param {Object}   props
 * @param {boolean}  props.editable   Premium serves templates.
 * @param {boolean}  props.canDelete  An existing template, with Premium.
 * @param {boolean}  props.saving     A save or delete is running.
 * @param {boolean}  props.confirming Delete was pressed once.
 * @param {Function} props.onDelete   Delete, or ask to confirm.
 * @param {Function} props.onSave     Save.
 * @param {Function} props.onClose    Close.
 */
export function DialogFooter({
  editable,
  canDelete,
  saving,
  confirming,
  onDelete,
  onSave,
  onClose,
}) {
  return (
    <>
      {canDelete ? (
        <button
          type="button"
          disabled={saving}
          onClick={onDelete}
          className={cn(dialogButton, "fhint:mr-auto fhint:text-destructive")}
        >
          {confirming
            ? __("Yes, delete it", "foundhint-local-seo")
            : __("Delete template", "foundhint-local-seo")}
        </button>
      ) : null}
      <button type="button" onClick={onClose} className={dialogButton}>
        {__("Cancel", "foundhint-local-seo")}
      </button>
      <button
        type="button"
        disabled={!editable || saving}
        onClick={onSave}
        title={
          editable
            ? undefined
            : __(
                "Saving templates is part of FoundHint Premium.",
                "foundhint-local-seo",
              )
        }
        className={primaryAction}
      >
        {saving
          ? __("Saving…", "foundhint-local-seo")
          : __("Save template", "foundhint-local-seo")}
      </button>
    </>
  );
}

export default DialogFooter;
