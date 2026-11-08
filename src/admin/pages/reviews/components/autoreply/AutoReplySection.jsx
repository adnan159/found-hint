import { useState } from "react";
import { __ } from "@wordpress/i18n";
import { toast } from "sonner";
import CronWarning from "@/components/cron/CronWarning";
import { errorMessage, fieldErrors } from "@/lib/errors";
import TemplateDialog from "../TemplateDialog";
import AutoReplyBand from "./AutoReplyBand";
import AutoReplyDialog from "./AutoReplyDialog";
import { KINDS, RATINGS, changeCell, needsPick } from "../../lib/autoReply";

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
  const templatesFor = (rating, kind) =>
    templates.templates.filter((t) => t.rating === rating && t.kind === kind);
  const countFor = (rating, kind) => templatesFor(rating, kind).length;

  const open = () => {
    const { on, scope, daily_limit, rules, picks } = autoReply.state;

    setError(null);
    setDraft({ on, scope, daily_limit, rules, picks });
  };

  const save = async () => {
    const missing = RATINGS.some((rating) =>
      KINDS.some(([kind]) =>
        needsPick(draft, rating, kind, templatesFor(rating, kind)),
      ),
    );

    if (missing) {
      setError({
        message: __(
          "Some ratings are set to My templates without a template chosen. Choose one, add one, or pick another option.",
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
      {autoReply.available ? <CronWarning job="auto_reply" /> : null}

      {draft && adding ? (
        <TemplateDialog
          template={null}
          rating={adding.rating}
          kind={adding.kind}
          countFor={countFor}
          editable={templates.editable}
          saving={templates.saving}
          onSave={async (template) => {
            const saved = await templates.save(template);

            // The new template is the one this cell sends.
            if (
              saved?.id &&
              saved.rating === adding.rating &&
              saved.kind === adding.kind
            ) {
              setDraft((current) =>
                changeCell(
                  current,
                  adding.rating,
                  adding.kind,
                  { pick: saved.id },
                  [],
                ),
              );
            }

            return saved;
          }}
          onRemove={templates.remove}
          onClose={() => setAdding(null)}
        />
      ) : null}

      {draft && !adding ? (
        <AutoReplyDialog
          draft={draft}
          setDraft={setDraft}
          unanswered={autoReply.state?.unanswered ?? 0}
          olderToday={autoReply.state?.older_today ?? 0}
          templatesFor={templatesFor}
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
