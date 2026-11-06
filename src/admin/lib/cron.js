import { _n, sprintf } from "@wordpress/i18n";
import { proInfo } from "./pro";

/**
 * Whether WordPress is running FoundHint Premium's background jobs, from
 * the page's bootstrap data (`pro.cron`, Premium's `CronHealth`).
 *
 * @param {string} job auto_reply | posts.
 * @return {{late: boolean, since: number|null, disabled: boolean, cronUrl: string}}
 */
export function cronJob(job) {
  const cron = proInfo()?.cron;
  const state = cron?.jobs?.[job];

  return {
    late: Boolean(state?.late),
    // Last heard from — or, if never, when it was first due.
    since: state?.last_run ?? state?.next_run ?? null,
    disabled: Boolean(cron?.disabled),
    cronUrl: cron?.cron_url ?? "",
  };
}

/**
 * How long ago a unix time was, in words: "40 minutes", "3 hours", "2 days".
 *
 * @param {number} since Unix seconds.
 * @param {number} now   Unix seconds.
 * @return {string}
 */
export function howLong(since, now = Date.now() / 1000) {
  const minutes = Math.max(1, Math.round((now - since) / 60));

  if (minutes < 120) {
    /* translators: %d: minutes. */
    return sprintf(
      _n("%d minute", "%d minutes", minutes, "foundhint-local-seo"),
      minutes,
    );
  }

  const hours = Math.round(minutes / 60);

  if (hours < 48) {
    /* translators: %d: hours. */
    return sprintf(
      _n("%d hour", "%d hours", hours, "foundhint-local-seo"),
      hours,
    );
  }

  const days = Math.round(hours / 24);

  /* translators: %d: days. */
  return sprintf(_n("%d day", "%d days", days, "foundhint-local-seo"), days);
}

/**
 * The server cron line for this site: every five minutes, quietly.
 *
 * @param {string} cronUrl The site's wp-cron.php.
 * @return {string}
 */
export function cronLine(cronUrl) {
  return `*/5 * * * * curl -s "${cronUrl}?doing_wp_cron" >/dev/null 2>&1`;
}
