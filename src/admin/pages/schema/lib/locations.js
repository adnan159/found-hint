import { __, _n, sprintf } from "@wordpress/i18n";

/** A profile's role, in words, and its tag tone (design: ROLE). */
export const ROLES = {
  main: [() => __("Main", "foundhint-local-seo"), "main"],
  branch: [() => __("Branch", "foundhint-local-seo"), "branch"],
  separate: [() => __("Separate", "foundhint-local-seo"), "separate"],
};

/** Output status, in words, and its tone (design: STATUS). */
export const STATUSES = {
  live: [() => __("Live", "foundhint-local-seo"), "ok"],
  main: [() => __("Live", "foundhint-local-seo"), "ok"],
  paused: [() => __("Paused", "foundhint-local-seo"), "quiet"],
  nopage: [() => __("Needs a page", "foundhint-local-seo"), "warn"],
  blocked: [() => __("Blocked", "foundhint-local-seo"), "bad"],
  separate: [() => __("Not on this site", "foundhint-local-seo"), "quiet"],
};

/**
 * The design's pills: rounded, 11.5px bold, its own colours by tone. Words
 * carry the meaning; colour only repeats it.
 */
export const BADGE =
  "fhint:inline-flex fhint:items-center fhint:gap-1.5 fhint:rounded-full fhint:px-2.5 fhint:py-[3px] fhint:text-[11.5px] fhint:leading-[1.35] fhint:font-bold fhint:whitespace-nowrap";

export const TONES = {
  ok: "fhint:bg-[#E8F3ED] fhint:text-[#157F4B]",
  warn: "fhint:bg-[#FBF0DE] fhint:text-[#8a5a00]",
  bad: "fhint:bg-[#FBE9E6] fhint:text-[#C02718]",
  quiet: "fhint:bg-[#f3f2f2] fhint:text-[#625e5e]",
  main: "fhint:bg-[#201e1d] fhint:text-white",
  branch: "fhint:bg-[#E7EFF6] fhint:text-[#2A5D8F]",
  separate: "fhint:bg-[#FBF0DE] fhint:text-[#8a5a00]",
};

/** The dot inside an output pill, in the pill's text colour. */
export const DOTS = {
  ok: "fhint:bg-[#157F4B]",
  warn: "fhint:bg-[#8a5a00]",
  bad: "fhint:bg-[#C02718]",
  quiet: "fhint:bg-[#625e5e]",
};

const FIELD_NAMES = () => ({
  name: __("name", "foundhint-local-seo"),
  street_address: __("street address", "foundhint-local-seo"),
  locality: __("city", "foundhint-local-seo"),
  country: __("country", "foundhint-local-seo"),
});

/**
 * One issue, as `{ short, title, text }` (design: pWarns).
 *
 * @param {Object} issue `{ level, code, … }` from the server.
 * @return {{short: string, title: string, text: string}} Its words.
 */
export function issueText(issue) {
  const names = (issue.names ?? []).join(", ");

  switch (issue.code) {
    case "no_page":
      return {
        short: __("No page assigned", "foundhint-local-seo"),
        title: __("No page assigned.", "foundhint-local-seo"),
        text: __(
          "This branch can't publish until it has its own page.",
          "foundhint-local-seo",
        ),
      };
    case "page_unpublished":
      return {
        short: __("Page not published", "foundhint-local-seo"),
        title: __("Its page isn't published.", "foundhint-local-seo"),
        text: __(
          "Publish the page, or choose another, so this branch can publish.",
          "foundhint-local-seo",
        ),
      };
    case "page_shared":
      return {
        short: __("Shares a page", "foundhint-local-seo"),
        title: __("Two locations on one page.", "foundhint-local-seo"),
        text: sprintf(
          /* translators: %s: other branches. */
          __(
            "%s also uses this page. Give each location its own page.",
            "foundhint-local-seo",
          ),
          names,
        ),
      };
    case "missing":
      return {
        short: __("Missing details", "foundhint-local-seo"),
        title: __("Missing details.", "foundhint-local-seo"),
        text: sprintf(
          /* translators: %s: missing fields. */
          __("Google needs its %s.", "foundhint-local-seo"),
          (issue.fields ?? [])
            .map((key) => FIELD_NAMES()[key] ?? key)
            .join(", "),
        ),
      };
    case "other_domain":
      return {
        short: __("Other domain", "foundhint-local-seo"),
        title: __("Website on another domain.", "foundhint-local-seo"),
        text: sprintf(
          /* translators: %s: a domain. */
          __(
            "Its Google profile links to %s. Check this really is one of your branches.",
            "foundhint-local-seo",
          ),
          issue.domain,
        ),
      };
    case "duplicate_phone":
      return {
        short: __("Duplicate phone", "foundhint-local-seo"),
        title: __("Duplicate phone number.", "foundhint-local-seo"),
        text: sprintf(
          /* translators: 1: other branches, 2: phone number. */
          __(
            "%1$s uses %2$s too. Give each location its own number if you can.",
            "foundhint-local-seo",
          ),
          names,
          issue.phone,
        ),
      };
    case "duplicate_address":
      return {
        short: __("Duplicate address", "foundhint-local-seo"),
        title: __("Duplicate address.", "foundhint-local-seo"),
        text: sprintf(
          /* translators: %s: other branches. */
          __("Same street address as %s.", "foundhint-local-seo"),
          names,
        ),
      };
    case "missing_geo":
      return {
        short: __("Missing geo", "foundhint-local-seo"),
        title: __("Missing map pin.", "foundhint-local-seo"),
        text: __(
          "Add the pin on Google so this location shows in the right place.",
          "foundhint-local-seo",
        ),
      };
    case "missing_hours":
      return {
        short: __("Missing hours", "foundhint-local-seo"),
        title: __("Missing opening hours.", "foundhint-local-seo"),
        text: __(
          "Add hours on Google and they show up here.",
          "foundhint-local-seo",
        ),
      };
    default:
      return { short: issue.code, title: issue.code, text: "" };
  }
}

/** The tone of a set of issues: the worst one's. */
export function issuesTone(issues) {
  if (issues.some((issue) => issue.level === "block")) {
    return "bad";
  }

  return issues.some((issue) => issue.level === "warn") ? "warn" : "ok";
}

/** "2 Google profiles · 1 main · 1 branch · 1 separate". */
export function rosterSummary(roster) {
  return [
    sprintf(
      /* translators: %d: Google profiles. */
      _n(
        "%d Google profile",
        "%d Google profiles",
        roster.profiles,
        "foundhint-local-seo",
      ),
      roster.profiles,
    ),
    sprintf(
      /* translators: %d: main businesses (0 or 1). */
      __("%d main", "foundhint-local-seo"),
      roster.main,
    ),
    sprintf(
      /* translators: %d: branches. */
      _n("%d branch", "%d branches", roster.branches, "foundhint-local-seo"),
      roster.branches,
    ),
    roster.separate
      ? sprintf(
          /* translators: %d: separate businesses. */
          __("%d separate", "foundhint-local-seo"),
          roster.separate,
        )
      : null,
  ]
    .filter(Boolean)
    .join(" · ");
}
