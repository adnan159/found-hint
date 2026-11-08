import { useId, useState } from "react";
import { __, sprintf } from "@wordpress/i18n";
import { toast } from "sonner";
import { errorMessage, fieldErrors } from "@/lib/errors";
import { dialogButton, primaryAction } from "../styles";
import { useSaveReviewReplyMutation } from "@/store/api/reviewsApi";
import { MAX_BYTES, bytes, firstNameOf } from "../lib/replies";
import ReviewsDialog from "./ReviewsDialog";
import QuickTemplates from "./reply/QuickTemplates";
import ReplyField from "./reply/ReplyField";
import ReviewQuote from "./reply/ReviewQuote";
import useTemplates from "../hooks/useTemplates";

/**
 * Writing, or rewriting, the reply to one review.
 *
 * What is typed here goes to Google and is public as soon as Google takes
 * it, so the footer says so and nothing is sent until "Publish reply". The
 * reply shown on the card afterwards is what Google accepted.
 *
 * Quick templates for the review's star rating come first: pressing one
 * fills the reply with this review's details — the reviewer's first name,
 * the location and its city — ready to edit before it is published.
 */
export function ReplyDialog({ review, context, onClose }) {
  // The review's own listing's templates, whatever the bar shows.
  const { templates } = useTemplates(review.location_name);
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
      width="fhint:sm:max-w-[680px]"
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
            className={primaryAction}
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
      <ReviewQuote review={review} rating={rating} />

      <QuickTemplates
        review={review}
        context={context}
        templates={forRating}
        rating={rating}
        onPick={(text) => {
          reset();
          setDraft(text);
        }}
      />

      <form
        id={`${id}-form`}
        onSubmit={publish}
        className="fhint:grid fhint:gap-1.5"
      >
        <ReplyField
          id={id}
          draft={draft}
          used={used}
          tooLong={tooLong}
          fieldError={fieldError}
          requestError={requestError}
          onChange={(text) => {
            reset();
            setDraft(text);
          }}
        />
      </form>
    </ReviewsDialog>
  );
}

export default ReplyDialog;
