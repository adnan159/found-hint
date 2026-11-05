import { useState } from "react";
import { __, sprintf } from "@wordpress/i18n";
import {
  CheckIcon,
  MessageSquareIcon,
  PencilIcon,
  Trash2Icon,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "cn";
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
import { errorMessage } from "@/lib/errors";
import { tag, tagTones } from "@/pages/profile/styles";
import { iconButton, panelTitle, primaryAction } from "../styles";
import { useDeleteReviewReplyMutation } from "@/store/api/reviewsApi";
import { formatDate, initialsOf } from "../lib/replies";
import ReviewPhotos from "./ReviewPhotos";
import Stars from "./Stars";
import AutoLabel from "./autoreply/AutoLabel";

/**
 * The reviewer's photo from Google, or their initials when there is none
 * or it will not load. Google's image host refuses some requests that carry
 * a referrer, so none is sent.
 */
function Avatar({ review }) {
  const [failed, setFailed] = useState(false);
  const photo = review.is_anonymous ? "" : review.reviewer_photo;

  return (
    <span
      aria-hidden="true"
      className="fhint:grid fhint:size-9 fhint:flex-none fhint:place-items-center fhint:overflow-hidden fhint:rounded-full fhint:bg-foreground fhint:text-[12px] fhint:font-extrabold fhint:text-background"
    >
      {photo && !failed ? (
        <img
          src={photo}
          alt=""
          width={36}
          height={36}
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          className="fhint:size-full fhint:object-cover"
        />
      ) : (
        initialsOf(review)
      )}
    </span>
  );
}

/**
 * One review: who left it, the stars and the date, where it stands, what
 * they wrote, and the owner's reply with the ways to change it.
 */
export function ReviewCard({ review, onReply, auto = false }) {
  const [remove, { isLoading: removing }] = useDeleteReviewReplyMutation();
  const name =
    review.is_anonymous || !review.reviewer_name
      ? __("Anonymous", "foundhint-local-seo")
      : review.reviewer_name;
  const removed = review.status === "removed";
  const replied = Boolean(review.reply_comment);

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

  return (
    <article
      aria-label={sprintf(
        /* translators: %s: the reviewer's name. */
        __("Review from %s", "foundhint-local-seo"),
        name,
      )}
      className={cn(
        "fhint:grid fhint:gap-3 fhint:px-[22px] fhint:py-5",
        removed && "fhint:bg-muted/40",
      )}
    >
      <div className="fhint:flex fhint:items-start fhint:gap-3">
        <Avatar review={review} />
        <div className="fhint:grid fhint:min-w-0 fhint:flex-1 fhint:gap-0.5">
          <strong className={cn(panelTitle, "fhint:truncate")}>{name}</strong>
          <Stars value={review.star_rating} />
          <span className="fhint:text-[12px] fhint:text-muted-strong">
            {formatDate(review.reviewed_at)}
          </span>
        </div>
        <div className="fhint:flex fhint:flex-wrap fhint:justify-end fhint:gap-1.5">
          {review.status === "edited" ? (
            <span className={cn(tag, tagTones.accent)}>
              {__("Edited", "foundhint-local-seo")}
            </span>
          ) : null}
          {removed ? (
            <span className={cn(tag, tagTones.bad)}>
              {__("Removed by reviewer", "foundhint-local-seo")}
            </span>
          ) : replied ? (
            <span
              className={cn(
                tag,
                tagTones.ok,
                "fhint:inline-flex fhint:items-center fhint:gap-1",
              )}
            >
              <CheckIcon aria-hidden="true" className="fhint:size-3" />
              {__("Replied", "foundhint-local-seo")}
            </span>
          ) : (
            <span className={cn(tag, tagTones.quiet)}>
              {__("Not replied", "foundhint-local-seo")}
            </span>
          )}
        </div>
      </div>

      <div className="fhint:grid fhint:gap-3 fhint:pl-12">
        {review.comment ? (
          <p className="fhint:m-0 fhint:text-sm fhint:leading-relaxed fhint:whitespace-pre-line">
            {review.comment}
          </p>
        ) : (
          <p className="fhint:m-0 fhint:text-sm fhint:text-muted-strong fhint:italic">
            {__("Left a star rating without a comment.", "foundhint-local-seo")}
          </p>
        )}

        <ReviewPhotos photos={review.photos} name={name} />

        {replied ? (
          <div className="fhint:grid fhint:gap-1.5 fhint:bg-[#faf6f4] fhint:px-3.5 fhint:py-3">
            <div className="fhint:flex fhint:items-center fhint:gap-2">
              <strong className="fhint:text-sm">
                {__("Your reply", "foundhint-local-seo")}
              </strong>
              {review.replied_at ? (
                <span className="fhint:text-[12px] fhint:text-muted-strong">
                  {formatDate(review.replied_at)}
                </span>
              ) : null}
              {auto ? <AutoLabel /> : null}
              {removed ? null : (
                <span className="fhint:ml-auto fhint:flex fhint:gap-1.5">
                  <button
                    type="button"
                    onClick={onReply}
                    disabled={removing}
                    className={iconButton}
                  >
                    <PencilIcon aria-hidden="true" className="fhint:size-3.5" />
                    <span className="fhint:sr-only">
                      {sprintf(
                        /* translators: %s: the reviewer's name. */
                        __("Edit your reply to %s", "foundhint-local-seo"),
                        name,
                      )}
                    </span>
                  </button>
                  <AlertDialog>
                    <AlertDialogTrigger
                      render={
                        <button
                          type="button"
                          disabled={removing}
                          className={cn(
                            iconButton,
                            "fhint:text-destructive fhint:hover:text-destructive",
                          )}
                        />
                      }
                    >
                      <Trash2Icon
                        aria-hidden="true"
                        className="fhint:size-3.5"
                      />
                      <span className="fhint:sr-only">
                        {sprintf(
                          /* translators: %s: the reviewer's name. */
                          __("Delete your reply to %s", "foundhint-local-seo"),
                          name,
                        )}
                      </span>
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
                </span>
              )}
            </div>
            <p className="fhint:m-0 fhint:text-sm fhint:leading-relaxed fhint:whitespace-pre-line">
              {review.reply_comment}
            </p>
          </div>
        ) : null}

        {removed ? (
          <p className="fhint:m-0 fhint:text-sm fhint:text-muted-strong">
            {__(
              "The reviewer removed this review from Google, so it can no longer be replied to. It is not counted in your rating.",
              "foundhint-local-seo",
            )}
          </p>
        ) : replied ? null : (
          <div className="fhint:flex fhint:flex-wrap fhint:gap-2">
            <button type="button" onClick={onReply} className={primaryAction}>
              <MessageSquareIcon
                aria-hidden="true"
                className="fhint:size-3.5"
              />
              {__("Reply", "foundhint-local-seo")}
            </button>
          </div>
        )}
      </div>
    </article>
  );
}

export default ReviewCard;
