import { __, sprintf } from "@wordpress/i18n";
import { ExternalLinkIcon } from "lucide-react";
import { cn } from "cn";
import { hasPro } from "@/lib/pro";
import { focus, tag, tagTones } from "@/pages/profile/styles";
import PostFailedNote from "./PostFailedNote";
import PostRowActions from "./PostRowActions";
import TypeIcon from "./TypeIcon";
import {
  sourceLabel,
  statusLabel,
  statusTone,
  typeLabel,
  whenText,
} from "../lib/posts";

/**
 * One post in the All posts section, laid out as a review is: its photo or
 * type icon, where it stands, what it says and when, and Edit and Delete on
 * the right. Rows sit straight in the section, split by its hairlines, with
 * no edge of their own.
 *
 * @param {Object}   props
 * @param {Object}   props.post
 * @param {Function} props.onEdit Open the post in the composer.
 */
export function PostRow({ post, onEdit }) {
  const failed = post.status === "failed" || post.status === "rejected";
  const name =
    post.title ||
    post.summary.slice(0, 40) ||
    __("Untitled post", "foundhint-local-seo");

  return (
    <article
      aria-label={sprintf(
        /* translators: 1: post type, 2: start of its text. */
        __("%1$s: %2$s", "foundhint-local-seo"),
        typeLabel(post.topic_type),
        name,
      )}
      className="fhint:flex fhint:gap-3.5 fhint:px-5.5 fhint:py-5"
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

      <div className="fhint:grid fhint:min-w-0 fhint:flex-1 fhint:gap-1.5">
        <div className="fhint:flex fhint:flex-wrap fhint:items-center fhint:gap-1.5">
          <span className={cn(tag, tagTones[statusTone(post.status)])}>
            {statusLabel(post.status)}
          </span>
          <span className={cn(tag, tagTones.quiet)}>
            {typeLabel(post.topic_type)}
          </span>
          {sourceLabel(post.source) ? (
            <span className={cn(tag, tagTones.quiet)}>
              {sourceLabel(post.source)}
            </span>
          ) : null}
        </div>

        {post.title ? (
          <strong className="fhint:truncate fhint:text-base fhint:font-bold fhint:tracking-[-0.01em]">
            {post.title}
          </strong>
        ) : null}
        {post.summary ? (
          <p className="fhint:m-0 fhint:line-clamp-2 fhint:text-sm fhint:leading-relaxed fhint:text-muted-strong">
            {post.summary}
          </p>
        ) : !post.title ? (
          <p className="fhint:m-0 fhint:text-sm fhint:text-muted-strong fhint:italic">
            {post.media_count
              ? __("A photo or video post with no text.", "foundhint-local-seo")
              : __("No text yet.", "foundhint-local-seo")}
          </p>
        ) : null}

        <div className="fhint:flex fhint:flex-wrap fhint:items-center fhint:gap-x-3 fhint:gap-y-1 fhint:text-[12px] fhint:font-semibold fhint:text-muted-strong">
          <span>{whenText(post)}</span>
          {post.status === "scheduled" && !hasPro("posts.schedule") ? (
            <span className="fhint:text-notice-foreground">
              {__("Needs FoundHint Premium to send", "foundhint-local-seo")}
            </span>
          ) : null}
          {post.search_url && post.on_google ? (
            <a
              href={post.search_url}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "fhint:inline-flex fhint:items-center fhint:gap-1 fhint:text-muted-strong! fhint:underline fhint:underline-offset-2",
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

        {failed ? <PostFailedNote post={post} /> : null}
      </div>

      <PostRowActions post={post} name={name} onEdit={onEdit} />
    </article>
  );
}

export default PostRow;
