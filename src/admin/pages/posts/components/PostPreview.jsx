import { __, sprintf } from "@wordpress/i18n";
import { ArrowRightIcon } from "lucide-react";
import { TYPE_STYLE } from "./TypeIcon";
import { buttonLabel, formatWhen } from "../lib/posts";

/**
 * The post roughly as Google shows it on the listing, updated as the owner
 * types. A guide, not a promise: Google crops and wraps in its own way.
 *
 * @param {Object} props
 * @param {Object} props.post         The post being written.
 * @param {string} props.businessName The listing's name.
 */
export function PostPreview({ post, businessName }) {
  const { Icon, tile } = TYPE_STYLE[post.topic_type] ?? TYPE_STYLE.update;
  const dated = post.topic_type !== "update";
  const isEvent = post.topic_type === "event";
  const kind = {
    update: __("What's new", "foundhint-local-seo"),
    event: __("Event", "foundhint-local-seo"),
    offer: __("Offer", "foundhint-local-seo"),
  }[post.topic_type];
  const button =
    post.topic_type === "offer"
      ? __("View offer", "foundhint-local-seo")
      : buttonLabel(post.cta_type);
  const starts = formatWhen(post.starts_at, isEvent);
  const ends = formatWhen(post.ends_at, isEvent);

  return (
    <div className="fhint:overflow-hidden fhint:border fhint:border-border fhint:bg-card">
      {post.media_url ? (
        <img
          src={post.media_url}
          alt=""
          referrerPolicy="no-referrer"
          className="fhint:block fhint:h-44 fhint:w-full fhint:object-cover"
        />
      ) : (
        <div
          aria-hidden="true"
          className={`fhint:flex fhint:h-32 fhint:items-end fhint:p-4 ${tile}`}
        >
          <Icon className="fhint:size-7" />
        </div>
      )}

      <div className="fhint:grid fhint:gap-2 fhint:p-4">
        <div className="fhint:flex fhint:items-center fhint:gap-2.5">
          <span
            aria-hidden="true"
            className="fhint:grid fhint:size-8 fhint:flex-none fhint:place-items-center fhint:bg-primary fhint:text-[14px] fhint:font-extrabold fhint:text-primary-foreground"
          >
            {(businessName || "?").trim().charAt(0).toUpperCase()}
          </span>
          <span className="fhint:grid fhint:min-w-0">
            <strong className="fhint:truncate fhint:text-[13.5px]">
              {businessName}
            </strong>
            <span className="fhint:text-[12px] fhint:text-muted-strong">
              {sprintf(
                /* translators: %s: "What's new", "Event" or "Offer". */
                __("Just now · %s", "foundhint-local-seo"),
                kind,
              )}
            </span>
          </span>
        </div>

        {dated && post.title ? (
          <strong className="fhint:text-[14px] fhint:leading-snug">
            {post.title}
          </strong>
        ) : null}

        {dated && (starts || ends) ? (
          <span className="fhint:text-[12.5px] fhint:font-bold">
            {post.topic_type === "offer"
              ? sprintf(
                  /* translators: 1: start date, 2: end date. */
                  __("Valid %1$s to %2$s", "foundhint-local-seo"),
                  starts,
                  ends,
                )
              : sprintf(
                  /* translators: 1: start, 2: end. */
                  __("%1$s to %2$s", "foundhint-local-seo"),
                  starts,
                  ends,
                )}
          </span>
        ) : null}

        <p className="fhint:m-0 fhint:text-[13px] fhint:leading-relaxed fhint:break-words fhint:whitespace-pre-line fhint:text-muted-strong">
          {post.summary ||
            __(
              "Start typing and your post will appear here.",
              "foundhint-local-seo",
            )}
        </p>

        {post.topic_type === "offer" && post.coupon_code ? (
          <span className="fhint:justify-self-start fhint:border fhint:border-dashed fhint:border-[#b9b2af] fhint:px-2.5 fhint:py-1 fhint:text-[12px] fhint:font-extrabold fhint:tracking-[0.06em]">
            {post.coupon_code}
          </span>
        ) : null}

        {button ? (
          <span className="fhint:inline-flex fhint:items-center fhint:gap-1 fhint:text-[13px] fhint:font-extrabold fhint:text-primary">
            {button}
            <ArrowRightIcon aria-hidden="true" className="fhint:size-3.5" />
          </span>
        ) : null}
      </div>
    </div>
  );
}

export default PostPreview;
