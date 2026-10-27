import { __, _n, sprintf } from "@wordpress/i18n";

/** Google's limits, as the server checks them (PostValidator). */
export const SUMMARY_MAX = 1500;
export const TITLE_MAX = 58;

export const TYPES = ["update", "event", "offer"];

export function typeLabel(type) {
  return {
    update: __("Update", "foundhint-local-seo"),
    event: __("Event", "foundhint-local-seo"),
    offer: __("Offer", "foundhint-local-seo"),
  }[type];
}

export function typeHint(type) {
  return {
    update: __("News or announcement", "foundhint-local-seo"),
    event: __("Happening on a date", "foundhint-local-seo"),
    offer: __("Discount or deal", "foundhint-local-seo"),
  }[type];
}

/** The buttons Google offers on an update or event, in Google's order. */
export function buttonOptions() {
  return [
    { value: "", label: __("None", "foundhint-local-seo") },
    { value: "learn_more", label: __("Learn more", "foundhint-local-seo") },
    { value: "order", label: __("Order online", "foundhint-local-seo") },
    { value: "book", label: __("Book", "foundhint-local-seo") },
    { value: "sign_up", label: __("Sign up", "foundhint-local-seo") },
    { value: "shop", label: __("Buy", "foundhint-local-seo") },
    { value: "call", label: __("Call now", "foundhint-local-seo") },
  ];
}

export function buttonLabel(value) {
  return buttonOptions().find((option) => option.value === value)?.label;
}

export function statusLabel(status) {
  return {
    live: __("Live", "foundhint-local-seo"),
    processing: __("Checking", "foundhint-local-seo"),
    rejected: __("Rejected", "foundhint-local-seo"),
    failed: __("Failed", "foundhint-local-seo"),
    draft: __("Draft", "foundhint-local-seo"),
    scheduled: __("Scheduled", "foundhint-local-seo"),
  }[status];
}

/** Tag tone per status — always beside the word, never instead of it. */
export function statusTone(status) {
  return (
    {
      live: "ok",
      processing: "accent",
      rejected: "bad",
      failed: "bad",
      draft: "quiet",
      scheduled: "accent",
    }[status] ?? "quiet"
  );
}

export function sourceLabel(source) {
  return {
    review: __("From a review", "foundhint-local-seo"),
    ai: __("Written with AI", "foundhint-local-seo"),
    csv: __("From CSV", "foundhint-local-seo"),
    blog: __("Source: Website blog", "foundhint-local-seo"),
  }[source];
}

/**
 * "3d ago" from a UTC 'Y-m-d H:i:s'.
 *
 * @param {string} utc Stored time.
 * @return {string}
 */
export function ago(utc) {
  if (!utc) {
    return "";
  }

  const then = Date.parse(`${utc.replace(" ", "T")}Z`);

  if (Number.isNaN(then)) {
    return "";
  }

  const minutes = Math.max(0, Math.round((Date.now() - then) / 60000));

  if (minutes < 1) {
    return __("just now", "foundhint-local-seo");
  }

  if (minutes < 60) {
    /* translators: %d: minutes. Short, as in "5m ago". */
    return sprintf(__("%dm ago", "foundhint-local-seo"), minutes);
  }

  const hours = Math.round(minutes / 60);

  if (hours < 24) {
    /* translators: %d: hours. Short, as in "3h ago". */
    return sprintf(__("%dh ago", "foundhint-local-seo"), hours);
  }

  /* translators: %d: days. Short, as in "3d ago". */
  return sprintf(__("%dd ago", "foundhint-local-seo"), Math.round(hours / 24));
}

/** "Posted 3d ago", "Draft, last edited 2d ago", … for a post row. */
export function whenText(post) {
  if (post.status === "draft") {
    return sprintf(
      /* translators: %s: e.g. "2d ago". */
      __("Draft, last edited %s", "foundhint-local-seo"),
      ago(post.updated_at),
    );
  }

  if (post.status === "failed") {
    return sprintf(
      /* translators: %s: e.g. "2d ago". */
      __("Not sent, last tried %s", "foundhint-local-seo"),
      ago(post.updated_at),
    );
  }

  return sprintf(
    /* translators: %s: e.g. "2d ago". */
    __("Posted %s", "foundhint-local-seo"),
    ago(post.published_at || post.updated_at),
  );
}

/** A business-local 'Y-m-d H:i:s' as a readable date (and time). */
export function formatWhen(value, withTime) {
  if (!value) {
    return "";
  }

  // Stored values use a space; what a date input hands back uses a "T".
  const [date, time = "00:00:00"] = value.replace("T", " ").split(" ");
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  const at = new Date(y, m - 1, d, hh || 0, mm || 0);

  if (Number.isNaN(at.getTime())) {
    return "";
  }

  return at.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    ...(withTime ? { hour: "numeric", minute: "2-digit" } : {}),
  });
}

/** 'Y-m-d H:i:s' → the value a datetime-local / date input takes. */
export function toInput(value, withTime) {
  if (!value) {
    return "";
  }

  return withTime ? value.slice(0, 16).replace(" ", "T") : value.slice(0, 10);
}

/** An empty post of a type, the way the composer starts. */
export function blankPost(type = "update") {
  return {
    topic_type: type,
    title: "",
    summary: "",
    cta_type: type === "offer" ? "" : "learn_more",
    cta_url: "",
    starts_at: "",
    ends_at: "",
    coupon_code: "",
    redeem_url: "",
    terms: "",
    media_url: "",
    attachment_id: 0,
    source: "manual",
    source_ref: "",
  };
}

/** A 5-star review as the text of an update thanking its author. */
export function reviewPost(review) {
  const first = (review.reviewer_name || "").trim().split(/\s+/)[0];
  const thanks = first
    ? sprintf(
        /* translators: %s: the reviewer's first name. */
        __("Thank you, %s, for the kind words!", "foundhint-local-seo"),
        first,
      )
    : __("Thank you for the kind words!", "foundhint-local-seo");

  return {
    ...blankPost("update"),
    summary: `“${review.comment.trim()}” ${thanks}`,
    source: "review",
    source_ref: review.review_id,
  };
}

/** "Showing 1 to 10 of 28 posts". */
export function showingText(from, to, total) {
  return sprintf(
    /* translators: 1: first shown, 2: last shown, 3: total. */
    _n(
      "Showing %1$d to %2$d of %3$d post",
      "Showing %1$d to %2$d of %3$d posts",
      total,
      "foundhint-local-seo",
    ),
    from,
    to,
    total,
  );
}
