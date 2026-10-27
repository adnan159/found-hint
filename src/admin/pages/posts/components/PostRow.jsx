import { __, sprintf } from "@wordpress/i18n";
import { ExternalLinkIcon, RotateCwIcon } from "lucide-react";
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
import { focus, quietButton, tag, tagTones } from "@/pages/profile/styles";
import {
  useDeletePostMutation,
  usePublishPostMutation,
} from "@/store/api/postsApi";
import TypeIcon from "./TypeIcon";
import {
  sourceLabel,
  statusLabel,
  statusTone,
  typeLabel,
  whenText,
} from "../lib/posts";

const action = cn(
  "fhint:cursor-pointer fhint:border-0 fhint:bg-transparent fhint:p-0 fhint:text-[12.5px] fhint:font-extrabold fhint:underline fhint:underline-offset-2 fhint:disabled:cursor-not-allowed fhint:disabled:text-muted-foreground",
  focus,
);

/**
 * One post in the list: what it is, where it stands, and what can be done.
 */
export function PostRow({ post, onEdit }) {
  const [retry, { isLoading: retrying }] = usePublishPostMutation();
  const [remove, { isLoading: removing }] = useDeletePostMutation();
  const failed = post.status === "failed" || post.status === "rejected";
  const finish = post.status === "draft" || post.status === "failed";
  const name =
    post.title ||
    post.summary.slice(0, 40) ||
    __("Untitled post", "foundhint-local-seo");

  const onRetry = async () => {
    try {
      await retry({ id: post.id }).unwrap();
      toast.success(
        __("Your post was published on Google.", "foundhint-local-seo"),
      );
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

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
    <article
      aria-label={sprintf(
        /* translators: 1: post type, 2: start of its text. */
        __("%1$s: %2$s", "foundhint-local-seo"),
        typeLabel(post.topic_type),
        name,
      )}
      className="fhint:flex fhint:gap-3.5 fhint:border-b fhint:border-b-border fhint:bg-card fhint:px-4 fhint:py-3.5 fhint:last:border-b-0"
    >
      {post.media_url ? (
        <img
          src={post.media_url}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          className="fhint:size-11 fhint:flex-none fhint:object-cover"
        />
      ) : (
        <TypeIcon type={post.topic_type} className="fhint:size-11" />
      )}

      <div className="fhint:grid fhint:min-w-0 fhint:flex-1 fhint:gap-1">
        <div className="fhint:flex fhint:flex-wrap fhint:items-center fhint:gap-1.5">
          <span className={cn(tag, tagTones[statusTone(post.status)])}>
            {statusLabel(post.status)}
          </span>
          <span
            className={cn(
              tag,
              "fhint:border fhint:border-border fhint:bg-card fhint:text-muted-strong",
            )}
          >
            {typeLabel(post.topic_type)}
          </span>
          {sourceLabel(post.source) ? (
            <span className={cn(tag, tagTones.quiet)}>
              {sourceLabel(post.source)}
            </span>
          ) : null}
        </div>

        {post.title ? (
          <strong className="fhint:truncate fhint:text-[14px]">
            {post.title}
          </strong>
        ) : null}
        {post.summary ? (
          <p className="fhint:m-0 fhint:line-clamp-1 fhint:text-[13px] fhint:text-muted-strong">
            {post.summary}
          </p>
        ) : !post.title ? (
          <p className="fhint:m-0 fhint:text-[13px] fhint:text-muted-strong fhint:italic">
            {post.media_count
              ? __("A photo or video post with no text.", "foundhint-local-seo")
              : __("No text yet.", "foundhint-local-seo")}
          </p>
        ) : null}

        <div className="fhint:flex fhint:flex-wrap fhint:items-center fhint:gap-x-3 fhint:gap-y-1 fhint:text-[12px] fhint:font-semibold">
          <span>{whenText(post)}</span>
          {post.search_url && post.on_google ? (
            <a
              href={post.search_url}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "fhint:inline-flex fhint:items-center fhint:gap-1 fhint:text-muted-strong fhint:underline fhint:underline-offset-2",
                focus,
              )}
            >
              {__("View on Google", "foundhint-local-seo")}
              <ExternalLinkIcon aria-hidden="true" className="fhint:size-3" />
              <span className="fhint:sr-only">
                {__("(opens in a new tab)", "foundhint-local-seo")}
              </span>
            </a>
          ) : null}
        </div>

        {failed ? (
          <div
            role="alert"
            className="fhint:mt-1 fhint:flex fhint:flex-wrap fhint:items-center fhint:gap-3 fhint:border fhint:border-[#f1c9c1] fhint:bg-[#FBE9E6] fhint:px-3 fhint:py-2 fhint:text-[12.5px] fhint:text-destructive"
          >
            <span className="fhint:min-w-0 fhint:flex-1">
              {post.status === "rejected"
                ? __(
                    "Google rejected this post after checking it.",
                    "foundhint-local-seo",
                  )
                : __(
                    "Google did not take this post. It is saved here, so you can try again.",
                    "foundhint-local-seo",
                  )}
              {post.error ? ` ${post.error}` : ""}
            </span>
            {post.status === "failed" ? (
              <button
                type="button"
                onClick={onRetry}
                disabled={retrying}
                className={cn(quietButton, "fhint:bg-card")}
              >
                <RotateCwIcon
                  aria-hidden="true"
                  className={cn(
                    "fhint:size-3.5",
                    retrying && "fhint:animate-spin",
                  )}
                />
                {retrying
                  ? __("Trying…", "foundhint-local-seo")
                  : __("Retry", "foundhint-local-seo")}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="fhint:flex fhint:flex-none fhint:items-start fhint:gap-3">
        <button
          type="button"
          onClick={onEdit}
          disabled={removing}
          className={action}
        >
          {finish
            ? __("Finish", "foundhint-local-seo")
            : __("Edit", "foundhint-local-seo")}
          <span className="fhint:sr-only">{` ${name}`}</span>
        </button>
        <AlertDialog>
          <AlertDialogTrigger
            render={
              <button
                type="button"
                disabled={removing}
                className={cn(action, "fhint:text-destructive")}
              />
            }
          >
            {__("Delete", "foundhint-local-seo")}
            <span className="fhint:sr-only">{` ${name}`}</span>
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
    </article>
  );
}

export default PostRow;
