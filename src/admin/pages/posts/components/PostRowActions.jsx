import { __, sprintf } from "@wordpress/i18n";
import { cn } from "cn";
import { PencilIcon, Trash2Icon } from "lucide-react";
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
import { errorMessage } from "@/lib/errors";
import { iconButton } from "@/pages/reviews/styles";
import { useDeletePostMutation } from "@/store/api/postsApi";
import ScheduledActions from "./ScheduledActions";

/**
 * Edit (Finish for a draft or a failed post, Change for a scheduled one)
 * and Delete, beside a post — after Publish now and Cancel schedule on a
 * scheduled post —
 * as the pencil and bin icon buttons a review's reply has.
 * Delete asks first, and says whether it removes the post from Google or
 * only from here.
 *
 * @param {Object}   props
 * @param {Object}   props.post
 * @param {string}   props.name   What to call the post to a screen reader.
 * @param {Function} props.onEdit Open the post in the composer.
 */
export function PostRowActions({ post, name, onEdit }) {
  const [remove, { isLoading: removing }] = useDeletePostMutation();
  const finish = post.status === "draft" || post.status === "failed";
  const scheduled = post.status === "scheduled";
  const verb = scheduled
    ? __("Change", "foundhint-local-seo")
    : finish
      ? __("Finish", "foundhint-local-seo")
      : __("Edit", "foundhint-local-seo");

  const onDelete = async () => {
    try {
      await remove({ id: post.id }).unwrap();
      toast.success(
        post.on_google
          ? __("The post was deleted from Google.", "foundhint-local-seo")
          : __("The post was deleted.", "foundhint-local-seo"),
      );
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  return (
    <div className="fhint:flex fhint:flex-none fhint:items-start fhint:gap-1.5">
      {scheduled ? <ScheduledActions post={post} name={name} /> : null}
      <button
        type="button"
        onClick={onEdit}
        disabled={removing}
        title={verb}
        className={iconButton}
      >
        <PencilIcon aria-hidden="true" className="fhint:size-3.5" />
        <span className="fhint:sr-only">
          {sprintf(
            scheduled
              ? /* translators: %s: the post's title or opening words. */
                __("Change %s", "foundhint-local-seo")
              : finish
                ? /* translators: %s: the post's title or opening words. */
                  __("Finish %s", "foundhint-local-seo")
                : /* translators: %s: the post's title or opening words. */
                  __("Edit %s", "foundhint-local-seo"),
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
              title={__("Delete", "foundhint-local-seo")}
              className={cn(
                iconButton,
                "fhint:text-destructive fhint:hover:text-destructive",
              )}
            />
          }
        >
          <Trash2Icon aria-hidden="true" className="fhint:size-3.5" />
          <span className="fhint:sr-only">
            {sprintf(
              /* translators: %s: the post's title or opening words. */
              __("Delete %s", "foundhint-local-seo"),
              name,
            )}
          </span>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {__("Delete this post?", "foundhint-local-seo")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {post.on_google
                ? __(
                    "It is removed from your Google profile, and nobody will see it there any more.",
                    "foundhint-local-seo",
                  )
                : __(
                    "It was never on Google, so this only deletes it here.",
                    "foundhint-local-seo",
                  )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {__("Keep post", "foundhint-local-seo")}
            </AlertDialogCancel>
            <AlertDialogAction onClick={onDelete}>
              {__("Delete post", "foundhint-local-seo")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default PostRowActions;
