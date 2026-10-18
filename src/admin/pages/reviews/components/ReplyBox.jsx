import { useEffect, useId, useRef, useState } from "react";
import { __, sprintf } from "@wordpress/i18n";
import { PencilIcon, ReplyIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { errorMessage, fieldErrors } from "@/lib/errors";
import {
  useDeleteReviewReplyMutation,
  useSaveReviewReplyMutation,
} from "@/store/api/reviewsApi";

// Google's limit, which it counts in bytes of UTF-8 rather than letters.
const MAX_BYTES = 4096;

const encoder = new TextEncoder();

function bytes(text) {
  return encoder.encode(text).length;
}

/**
 * The owner's reply to one review: write it, edit it, or remove it.
 *
 * Everything here goes to Google and is public as soon as Google takes it,
 * so the buttons say so, and removing asks first. The reply shown is only
 * ever what Google accepted — the server stores it after Google says yes.
 */
export function ReplyBox({ review, formatWhen }) {
  const id = useId();
  const textareaRef = useRef(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [save, { isLoading: saving, error: saveError, reset: resetSave }] =
    useSaveReviewReplyMutation();
  const [remove, { isLoading: removing }] = useDeleteReviewReplyMutation();

  const hasReply = Boolean(review.reply_comment);
  const used = bytes(draft);
  const left = MAX_BYTES - used;
  const fieldError =
    fieldErrors(saveError).comment ??
    (left < 0
      ? __(
          "That reply is too long for Google. Shorten it and try again.",
          "foundhint-local-seo",
        )
      : "");
  const requestError =
    saveError && !fieldErrors(saveError).comment ? errorMessage(saveError) : "";

  useEffect(() => {
    if (editing) {
      textareaRef.current?.focus();
    }
  }, [editing]);

  const open = () => {
    resetSave();
    setDraft(review.reply_comment ?? "");
    setEditing(true);
  };

  const close = () => {
    resetSave();
    setEditing(false);
  };

  const onSubmit = async (event) => {
    event.preventDefault();

    try {
      await save({ reviewId: review.review_id, comment: draft }).unwrap();
      setEditing(false);
      toast.success(
        hasReply
          ? __("Your reply was updated on Google.", "foundhint-local-seo")
          : __("Your reply was posted on Google.", "foundhint-local-seo"),
      );
    } catch {
      // Shown under the textarea, where the owner is looking.
    }
  };

  const onDelete = async () => {
    try {
      await remove({ reviewId: review.review_id }).unwrap();
      toast.success(
        __("Your reply was removed from Google.", "foundhint-local-seo"),
      );
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  if (editing) {
    return (
      <form
        onSubmit={onSubmit}
        className="fhint:mt-3 fhint:grid fhint:gap-2 fhint:border-l-2 fhint:border-primary fhint:pl-3"
      >
        <Field data-invalid={fieldError ? true : undefined}>
          <label htmlFor={id} className="fhint:text-[13px] fhint:font-bold">
            {hasReply
              ? __("Edit your reply", "foundhint-local-seo")
              : __("Your reply", "foundhint-local-seo")}
          </label>
          <Textarea
            id={id}
            ref={textareaRef}
            value={draft}
            className="fhint:min-h-24"
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                close();
              }
            }}
            aria-invalid={fieldError ? true : undefined}
            aria-describedby={`${id}-help`}
            placeholder={__(
              "Thank them, answer what they raised, and keep it short.",
              "foundhint-local-seo",
            )}
          />
          <FieldDescription id={`${id}-help`}>
            {sprintf(
              /* translators: %d: how much more can be written before Google's limit. */
              __(
                "Shown publicly on Google under this review. %d left.",
                "foundhint-local-seo",
              ),
              Math.max(0, left),
            )}
          </FieldDescription>
          {fieldError ? <FieldError>{fieldError}</FieldError> : null}
        </Field>

        {requestError ? (
          <p role="alert" className="fhint:text-[13px] fhint:text-destructive">
            {requestError}
          </p>
        ) : null}

        <div className="fhint:flex fhint:flex-wrap fhint:gap-2">
          <Button
            type="submit"
            size="sm"
            disabled={saving || !draft.trim() || left < 0}
          >
            {saving ? <Spinner data-icon="inline-start" /> : null}
            {hasReply
              ? __("Update on Google", "foundhint-local-seo")
              : __("Post on Google", "foundhint-local-seo")}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={close}
            disabled={saving}
          >
            {__("Cancel", "foundhint-local-seo")}
          </Button>
        </div>
      </form>
    );
  }

  if (!hasReply) {
    return (
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="fhint:mt-3"
        onClick={open}
      >
        <ReplyIcon data-icon="inline-start" />
        {__("Reply", "foundhint-local-seo")}
      </Button>
    );
  }

  return (
    <div className="fhint:mt-3 fhint:border-l-2 fhint:border-border fhint:pl-3">
      <p className="fhint:text-[13px] fhint:font-bold">
        {__("Your reply", "foundhint-local-seo")}
        {review.replied_at ? ` · ${formatWhen(review.replied_at)}` : ""}
      </p>
      <p className="fhint:mt-1 fhint:whitespace-pre-line fhint:text-sm">
        {review.reply_comment}
      </p>
      <div className="fhint:mt-2 fhint:flex fhint:flex-wrap fhint:gap-1">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={open}
          disabled={removing}
        >
          <PencilIcon data-icon="inline-start" />
          {__("Edit", "foundhint-local-seo")}
        </Button>
        <AlertDialog>
          <AlertDialogTrigger
            render={<Button type="button" size="sm" variant="ghost" />}
            disabled={removing}
          >
            {removing ? (
              <Spinner data-icon="inline-start" />
            ) : (
              <Trash2Icon data-icon="inline-start" />
            )}
            {__("Delete", "foundhint-local-seo")}
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {__("Delete your reply?", "foundhint-local-seo")}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {__(
                  "It is removed from Google, so nobody will see it under this review any more. The review itself stays.",
                  "foundhint-local-seo",
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>
                {__("Keep reply", "foundhint-local-seo")}
              </AlertDialogCancel>
              <AlertDialogAction onClick={onDelete}>
                {__("Delete reply", "foundhint-local-seo")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

export default ReplyBox;
