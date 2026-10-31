/**
 * Advice shown under a field while it is written — never a block on
 * saving. The server keeps the hard rules (length, link format).
 */

/** The length Google shows in full and that reads as a summary (QA D8). */
export const DESCRIPTION_RANGE = [150, 300];

// Words too common to count as a repeated phrase.
const STOP = new Set(
  "the and for with your you our are that this from their into can its has have will was were more than them they these those also all any each other about over under".split(
    " ",
  ),
);

/**
 * The two-word phrase used most often, when it is used three times or more —
 * "local SEO" three times reads as keyword stuffing (QA D8).
 *
 * @param {string} text Description.
 * @return {{phrase: string, count: number}|null} The phrase, or null.
 */
export function repeatedPhrase(text) {
  const words = String(text ?? "")
    .toLowerCase()
    .match(/[\p{L}\p{N}]+/gu);

  if (!words) {
    return null;
  }

  const counts = new Map();

  for (let i = 0; i < words.length - 1; i++) {
    const [a, b] = [words[i], words[i + 1]];

    if (a.length < 3 || b.length < 3 || STOP.has(a) || STOP.has(b)) {
      continue;
    }

    const phrase = `${a} ${b}`;

    counts.set(phrase, (counts.get(phrase) ?? 0) + 1);
  }

  let best = null;

  counts.forEach((count, phrase) => {
    if (count >= 3 && (!best || count > best.count)) {
      best = { phrase, count };
    }
  });

  return best;
}

/**
 * Where a description stands against the 150–300 guide.
 *
 * @param {string} text Description.
 * @return {"empty"|"short"|"good"|"long"} Its state.
 */
export function descriptionLength(text) {
  const length = String(text ?? "").trim().length;

  if (!length) {
    return "empty";
  }

  if (length < DESCRIPTION_RANGE[0]) {
    return "short";
  }

  return length > DESCRIPTION_RANGE[1] ? "long" : "good";
}

/** Profile sites, by the host their links live on. */
export const PLATFORMS = [
  ["Facebook", ["facebook.com", "fb.com"]],
  ["X", ["x.com", "twitter.com"]],
  ["LinkedIn", ["linkedin.com"]],
  ["YouTube", ["youtube.com", "youtu.be"]],
  ["Instagram", ["instagram.com"]],
  ["TikTok", ["tiktok.com"]],
  ["GitHub", ["github.com"]],
  ["WordPress.org", ["wordpress.org"]],
  ["Pinterest", ["pinterest.com"]],
  ["Yelp", ["yelp.com"]],
];

/** Suggested when missing: the ones most businesses have (QA D7). */
const SUGGESTED = ["Facebook", "X", "LinkedIn", "YouTube", "Instagram"];

function platformOf(url) {
  let host = "";

  try {
    host = new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }

  const found = PLATFORMS.find(([, hosts]) =>
    hosts.some((item) => host === item || host.endsWith(`.${item}`)),
  );

  return found ? found[0] : null;
}

/**
 * Which profile sites the links cover, and which common ones are missing.
 *
 * @param {string} lines One link per line.
 * @return {{found: string[], missing: string[]}} Platform names.
 */
export function profileCoverage(lines) {
  const found = [];

  String(lines ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .forEach((url) => {
      const name = platformOf(url);

      if (name && !found.includes(name)) {
        found.push(name);
      }
    });

  return {
    found,
    missing: SUGGESTED.filter((name) => !found.includes(name)),
  };
}
