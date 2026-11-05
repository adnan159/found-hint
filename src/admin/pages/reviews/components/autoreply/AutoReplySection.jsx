import { useState } from "react";
import { __ } from "@wordpress/i18n";
import { toast } from "sonner";
import { errorMessage, fieldErrors } from "@/lib/errors";
import TemplateDialog from "../TemplateDialog";
import AutoReplyBand from "./AutoReplyBand";
import AutoReplyDialog from "./AutoReplyDialog";

/**
 * Auto-reply on the Reviews screen: the band, and — from Set up — the setup
 * dialog, or the template editor opened from its "Add one" (one dialog at a
 * time; the setup's unsaved choices are kept while a template is written).
 *
 * @param {Object} props
 * @param {Object} props.autoReply From `useAutoReply()`.
 * @param {Object} props.templates From `useTemplates()`.
 */
export function AutoReplySection({ autoReply, templates }) {
  const [draft, setDraft] = useState(null);
  const [adding, setAdding] = useState(null);
  const [error, setError] = useState(null);
  const countFor = (rating, kind) =>
    templates.templates.filter((t) => t.rating === rating && t.kind === kind)
      .length;

  const open = () => {
    const { on, scope, rules } = autoReply.state;

    setError(null);
    setDraft({ on, scope, rules });
  };

  const save = async () => {
    const empty = [1, 2, 3, 4, 5].some((rating) =>
      ["comment", "stars"].some(
        (kind) =>
          draft.rules[rating][kind] === "template" && !countFor(rating, kind),
      ),
    );

    if (empty) {
      setError({
        message: __(
          "Some ratings are set to My templates but have none. Add one or pick another option.",
          "foundhint-local-seo",
        ),
      });
      return;
    }

    try {
      const saved = await autoReply.save(draft);

      toast.success(
        saved?.on
          ? __("Auto-reply saved and switched on.", "foundhint-local-seo")
          : __("Saved. Auto-reply is still off.", "foundhint-local-seo"),
      );
      setDraft(null);
    } catch (caught) {
      setError(caught);
    }
  };

  const errors = error?.message ? {} : fieldErrors(error);
  const problem =
    error?.message ??
    (error && !Object.keys(errors).length ? errorMessage(error) : "");

  return (
    <>
      <AutoReplyBand autoReply={autoReply} onSetUp={open} />

      {draft && adding ? (
        <TemplateDialog
          template={null}
          rating={adding.rating}
          kind={adding.kind}
          countFor={countFor}
          editable={templates.editable}
          saving={templates.saving}
          onSave={templates.save}
          onRemove={templates.remove}
          onClose={() => setAdding(null)}
        />
      ) : null}

      {draft && !adding ? (
        <AutoReplyDialog
          draft={draft}
          setDraft={setDraft}
          unanswered={autoReply.state?.unanswered ?? 0}
          countFor={countFor}
          errors={errors}
          problem={problem}
          saving={autoReply.saving}
          onAdd={(rating, kind) => setAdding({ rating, kind })}
          onSave={save}
          onClose={() => setDraft(null)}
        />
      ) : null}
    </>
  );
}

export default AutoReplySection;
