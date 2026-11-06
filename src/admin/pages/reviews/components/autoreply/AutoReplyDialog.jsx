import { __, sprintf } from "@wordpress/i18n";
import { cn } from "cn";
import { Switch } from "@/components/ui/switch";
import { errorText, help } from "@/pages/profile/styles";
import { dialogButton, primaryAction } from "../../styles";
import ReviewsDialog from "../ReviewsDialog";
import RulesGrid from "./RulesGrid";
import ScopePicker from "./ScopePicker";
import { changeCell } from "../../lib/autoReply";

/**
 * "Set up auto-reply" (design): the switch, which reviews, and how to reply
 * to each rating and kind. Nothing changes until Save.
 *
 * @param {Object}   props
 * @param {Object}   props.draft      `{ on, scope, rules, picks }` being edited.
 * @param {Function} props.setDraft   Receives the changed draft.
 * @param {number}   props.unanswered Reviews with no reply yet.
 * @param {Function} props.templatesFor `(rating, kind)` → templates there.
 * @param {Object}   props.errors     Server messages by field.
 * @param {string}   props.problem    A message not tied to one field.
 * @param {boolean}  props.saving     Saving.
 * @param {Function} props.onAdd      `(rating, kind)`: write a template.
 * @param {Function} props.onSave     Save the draft.
 * @param {Function} props.onClose    Close without saving.
 */
export function AutoReplyDialog({
  draft,
  setDraft,
  unanswered,
  templatesFor,
  errors,
  problem,
  saving,
  onAdd,
  onSave,
  onClose,
}) {
  const replying = [1, 2, 3, 4, 5].reduce(
    (sum, rating) =>
      sum +
      ["comment", "stars"].filter(
        (kind) => draft.rules[rating][kind] === "template",
      ).length,
    0,
  );

  return (
    <ReviewsDialog
      title={__("Set up auto-reply", "foundhint-local-seo")}
      onClose={onClose}
      width="fhint:sm:max-w-180"
      note={
        draft.on
          ? sprintf(
              /* translators: %d: kinds of review, out of 10, that get a reply. */
              __(
                "%d of 10 review kinds get a reply · checked every 10 minutes",
                "foundhint-local-seo",
              ),
              replying,
            )
          : __("Auto-reply is off", "foundhint-local-seo")
      }
      footer={
        <>
          <button type="button" onClick={onClose} className={dialogButton}>
            {__("Cancel", "foundhint-local-seo")}
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={onSave}
            className={primaryAction}
          >
            {saving
              ? __("Saving…", "foundhint-local-seo")
              : __("Save", "foundhint-local-seo")}
          </button>
        </>
      }
    >
      <div className="fhint:flex fhint:items-center fhint:gap-3 fhint:bg-[#faf9f9] fhint:px-4 fhint:py-3">
        <span className="fhint:grid fhint:flex-1 fhint:gap-0.5">
          <strong className="fhint:text-sm">
            {__("Auto-reply", "foundhint-local-seo")}
          </strong>
          <span className={cn(help, "fhint:text-[12.5px]")}>
            {draft.on
              ? __(
                  "On. FoundHint replies to reviews using the choices below.",
                  "foundhint-local-seo",
                )
              : __(
                  "Off. Nothing is sent automatically. Your choices are kept.",
                  "foundhint-local-seo",
                )}
          </span>
        </span>
        <Switch
          checked={draft.on}
          onCheckedChange={(on) => setDraft({ ...draft, on })}
          aria-label={__("Auto-reply", "foundhint-local-seo")}
        />
      </div>

      {problem ? (
        <p role="alert" className={cn(errorText, "fhint:m-0")}>
          {problem}
        </p>
      ) : null}

      <ScopePicker
        scope={draft.scope}
        unanswered={unanswered}
        onChange={(scope) => setDraft({ ...draft, scope })}
      />

      <RulesGrid
        rules={draft.rules}
        picks={draft.picks}
        templatesFor={templatesFor}
        errors={errors}
        onAdd={onAdd}
        onChange={(rating, kind, change) =>
          setDraft(
            changeCell(draft, rating, kind, change, templatesFor(rating, kind)),
          )
        }
      />
    </ReviewsDialog>
  );
}

export default AutoReplyDialog;
