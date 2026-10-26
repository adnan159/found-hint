import { useId, useState } from "react";
import { __, _n, sprintf } from "@wordpress/i18n";
import { SparklesIcon } from "lucide-react";
import { toast } from "sonner";
import { cn } from "cn";
import { errorMessage, fieldErrors } from "@/lib/errors";
import { errorText, help, label, primaryButton } from "@/pages/profile/styles";
import { dialogButton, dialogInput } from "../styles";
import { useSaveReviewReplyMutation } from "@/store/api/reviewsApi";
import { MAX_BYTES, builtInReply, bytes, firstNameOf } from "../lib/replies";
import ReviewsDialog from "./ReviewsDialog";
import SoonTag from "./SoonTag";
import Stars from "./Stars";

/**
 * Writing, or rewriting, the reply to one review.
 *
 * What is typed here goes to Google and is public as soon as Google takes
 * it, so the footer says so and nothing is sent until "Publish reply". The
 * reply shown on the card afterwards is what Google accepted.
 *
 * Quick templates for the review's star rating come first. The built-in
 * reply works now; the owner's own templates are FoundHint Pro, and AI
 * replies are coming soon — both drawn, neither pretending to work.
 */
export function ReplyDialog({ review, context, templates, onClose }) {
  const id = useId();
  const editing = Boolean(review.reply_comment);
  const [draft, setDraft] = useState(review.reply_comment ?? "");
  const [save, { isLoading: saving, error, reset }] =
    useSaveReviewReplyMutation();

  const used = bytes(draft);
  const tooLong = used > MAX_BYTES;
  const fieldError =
    fieldErrors(error).comment ??
    (tooLong
      ? __(
          "That reply is too long for Google. Shorten it and try again.",
          "foundhint-local-seo",
        )
      : "");
  const requestError =
    error && !fieldErrors(error).comment ? errorMessage(error) : "";
  const name = firstNameOf(review);
  const rating = Number(review.star_rating) || 0;
  const forRating = templates.filter((template) => template.rating === rating);

  const publish = async (event) => {
    event?.preventDefault();

    try {
      await save({ reviewId: review.review_id, comment: draft }).unwrap();
      toast.success(
        editing
          ? __("Your reply was updated on Google.", "foundhint-local-seo")
          : __("Your reply was posted on Google.", "foundhint-local-seo"),
      );
      onClose();
    } catch {
      // Shown in the dialog, where the owner is looking.
    }
  };

  return (
    <ReviewsDialog
      title={
        name
          ? sprintf(
              /* translators: %s: the reviewer's first name. */
              __("Reply to %s", "foundhint-local-seo"),
              name,
            )
          : __("Reply to this review", "foundhint-local-seo")
      }
      description={__(
        "Write a reply. It is posted on your Google profile when you press Publish reply.",
        "foundhint-local-seo",
      )}
      onClose={onClose}
      note={__(
        "Publishing posts this reply on your Google profile.",
        "foundhint-local-seo",
      )}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className={dialogButton}
          >
            {__("Cancel", "foundhint-local-seo")}
          </button>
          <button
            type="submit"
            form={`${id}-form`}
            disabled={saving || !draft.trim() || tooLong}
            className={primaryButton}
          >
            {saving
              ? __("Publishing…", "foundhint-local-seo")
              : editing
                ? __("Update reply", "foundhint-local-seo")
                : __("Publish reply", "foundhint-local-seo")}
          </button>
        </>
      }
    >
      <blockquote className="fhint:m-0 fhint:grid fhint:gap-1.5 fhint:border fhint:border-border fhint:bg-[#faf6f4] fhint:px-3.5 fhint:py-3">
        <span className="fhint:flex fhint:flex-wrap fhint:items-center fhint:gap-2 fhint:text-[13px]">
          <strong>
            {review.is_anonymous || !review.reviewer_name
              ? __("Anonymous", "foundhint-local-seo")
              : review.reviewer_name}
          </strong>
          <Stars value={rating} />
        </span>
        <span className="fhint:text-[13px] fhint:leading-relaxed">
          {review.comment ||
            __("Left a star rating without a comment.", "foundhint-local-seo")}
        </span>
      </blockquote>

      <div className="fhint:grid fhint:gap-2">
        <span className={label}>
          {rating
            ? sprintf(
                /* translators: %d: a star rating from 1 to 5. */
                _n(
                  "Quick templates for %d-star reviews",
                  "Quick templates for %d-star reviews",
                  rating,
                  "foundhint-local-seo",
                ),
                rating,
              )
            : __("Quick templates", "foundhint-local-seo")}
        </span>
        <div className="fhint:flex fhint:flex-wrap fhint:items-center fhint:gap-2">
          {forRating.map((template) => (
            <button
              key={template.id}
              type="button"
              disabled
              title={__(
                "Your own templates are part of FoundHint Pro.",
                "foundhint-local-seo",
              )}
              className={cn(dialogButton, "fhint:font-bold")}
            >
              {template.name}
            </button>
          ))}
          {forRating.length ? <SoonTag kind="pro" /> : null}
          <button
            type="button"
            onClick={() => {
              reset();
              setDraft(builtInReply(review, context));
            }}
            className={cn(dialogButton, "fhint:font-bold")}
          >
            {__("Built-in reply", "foundhint-local-seo")}
          </button>
        </div>
      </div>

      <form
        id={`${id}-form`}
        onSubmit={publish}
        className="fhint:grid fhint:gap-1.5"
      >
        <span className="fhint:flex fhint:items-center fhint:gap-2">
          <label htmlFor={id} className={label}>
            {__("Your reply", "foundhint-local-seo")}
          </label>
          <span
            className={cn(
              "fhint:ml-auto fhint:text-[12px] fhint:font-semibold",
              tooLong ? "fhint:text-destructive" : "fhint:text-muted-strong",
            )}
          >
            {sprintf(
              /* translators: 1: bytes used, 2: the most Google allows. */
              __("%1$s / %2$s", "foundhint-local-seo"),
              used.toLocaleString(),
              MAX_BYTES.toLocaleString(),
            )}
          </span>
        </span>
        <textarea
          id={id}
          value={draft}
          rows={6}
          autoFocus
          onChange={(event) => {
            reset();
            setDraft(event.target.value);
          }}
          aria-invalid={fieldError ? true : undefined}
          aria-describedby={fieldError ? `${id}-error` : undefined}
          placeholder={__(
            "Write a short, personal reply. Use their first name and mention something they said.",
            "foundhint-local-seo",
          )}
          className={cn(dialogInput, "fhint:resize-y")}
        />
        {fieldError ? (
          <span id={`${id}-error`} role="alert" className={errorText}>
            {fieldError}
          </span>
        ) : null}
        {requestError ? (
          <span role="alert" className={errorText}>
            {requestError}
          </span>
        ) : null}
      </form>

      <div className="fhint:flex fhint:flex-wrap fhint:items-center fhint:gap-3">
        <button
          type="button"
          disabled
          className={dialogButton}
          aria-describedby={`${id}-ai`}
        >
          <SparklesIcon aria-hidden="true" className="fhint:size-3.5" />
          {__("AI suggestion", "foundhint-local-seo")}
        </button>
        <span
          id={`${id}-ai`}
          className={cn(help, "fhint:flex fhint:items-center fhint:gap-2")}
        >
          <SoonTag />
          {__(
            "AI replies are coming in FoundHint Pro. Nothing is sent until you press Publish.",
            "foundhint-local-seo",
          )}
        </span>
      </div>
    </ReviewsDialog>
  );
}

export default ReplyDialog;
