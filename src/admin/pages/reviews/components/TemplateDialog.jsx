import { useState } from "react";
import { __, sprintf } from "@wordpress/i18n";
import { toast } from "sonner";
import { cn } from "cn";
import { errorMessage, fieldErrors } from "@/lib/errors";
import { errorText } from "@/pages/profile/styles";
import { TEMPLATE_LIMIT } from "../lib/templates";
import ReviewsDialog from "./ReviewsDialog";
import SoonTag from "./SoonTag";
import TemplateFields from "./templates/TemplateFields";
import DialogFooter from "./templates/DialogFooter";

/**
 * Adding or editing a reply template.
 *
 * With FoundHint Premium (`editable`) it saves and deletes; without it the
 * form works as a preview and the button says saving is Premium instead of
 * pretending to store anything.
 *
 * @param {Object}   props
 * @param {Object}   props.template The template to edit, or null for a new one.
 * @param {number}   props.rating   A new template's starting rating.
 * @param {string}   props.kind     A new template's starting kind.
 * @param {Function} props.countFor `(rating, kind)` → templates already there.
 * @param {boolean}  props.editable Premium serves templates.
 * @param {boolean}  props.saving   A save or delete is running.
 * @param {Function} props.onSave   Resolves with the template, or throws.
 * @param {Function} props.onRemove Resolves when removed, or throws.
 * @param {Function} props.onClose  Close the dialog.
 */
export function TemplateDialog({
  template,
  rating,
  kind,
  countFor,
  editable,
  saving,
  onSave,
  onRemove,
  onClose,
}) {
  const [form, setForm] = useState({
    rating: template?.rating ?? rating ?? 5,
    kind: template?.kind ?? kind ?? "comment",
    name: template?.name ?? "",
    text: template?.text ?? "",
  });
  const [error, setError] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const errors = fieldErrors(error);
  // A template already in this rating and kind does not take a new place.
  const stays =
    template && template.rating === form.rating && template.kind === form.kind;
  const used = countFor(form.rating, form.kind) - (stays ? 1 : 0);

  const save = async () => {
    try {
      await onSave({ ...(template ? { id: template.id } : {}), ...form });
      toast.success(__("Template saved.", "foundhint-local-seo"));
      onClose();
    } catch (caught) {
      setError(caught);
    }
  };

  const remove = async () => {
    try {
      await onRemove(template.id);
      toast.success(__("Template deleted.", "foundhint-local-seo"));
      onClose();
    } catch (caught) {
      setError(caught);
      setConfirming(false);
    }
  };

  return (
    <ReviewsDialog
      title={
        template
          ? __("Edit template", "foundhint-local-seo")
          : __("New reply template", "foundhint-local-seo")
      }
      description={
        editable
          ? __("Shared by all your locations.", "foundhint-local-seo")
          : __(
              "Reply templates are part of FoundHint Premium.",
              "foundhint-local-seo",
            )
      }
      onClose={onClose}
      width="fhint:sm:max-w-170"
      note={sprintf(
        /* translators: 1: templates used, 2: the most allowed, 3: a star rating. */
        __("%1$d of %2$d used for %3$d-star reviews", "foundhint-local-seo"),
        used,
        TEMPLATE_LIMIT,
        Number(form.rating),
      )}
      footer={
        <DialogFooter
          editable={editable}
          canDelete={editable && Boolean(template)}
          saving={saving}
          confirming={confirming}
          onDelete={confirming ? remove : () => setConfirming(true)}
          onSave={save}
          onClose={onClose}
        />
      }
    >
      {editable ? null : (
        <p className="fhint:m-0 fhint:flex fhint:items-center fhint:gap-2 fhint:text-sm fhint:text-muted-strong">
          <SoonTag kind="pro" />
          {__(
            "Saving your own templates comes with FoundHint Premium.",
            "foundhint-local-seo",
          )}
        </p>
      )}
      {error && !Object.keys(errors).length ? (
        <p role="alert" className={cn(errorText, "fhint:m-0")}>
          {errorMessage(error)}
        </p>
      ) : null}
      <TemplateFields form={form} setForm={setForm} errors={errors} />
    </ReviewsDialog>
  );
}

export default TemplateDialog;
