import { __, sprintf } from "@wordpress/i18n";
import { muted, panelChip, panelHeader, panelTitle } from "../styles";

/** "6 of 9 fields from Google". */
export function Counter({ counter }) {
  return (
    <span className={panelChip}>
      {sprintf(
        /* translators: 1: fields filled from Google, 2: all fields. */
        __("%1$d of %2$d fields from Google", "foundhint-local-seo"),
        counter.from_google,
        counter.total,
      )}
    </span>
  );
}

/**
 * The heading of a panel: title, what it describes, and how many of its
 * fields came from Google. The panel points at `id` with `aria-labelledby`.
 *
 * `srOnly` is for a tab's main panel: the tab button already shows its
 * title and description, so the title is kept for screen readers only and
 * all that shows is the Google counter, if there is one.
 *
 * @param {Object}  props
 * @param {string}  props.id            The title's id.
 * @param {string}  props.title
 * @param {string}  [props.description]
 * @param {Object}  [props.counter]     `{ from_google, total }`.
 * @param {boolean} [props.srOnly]      Show the title to screen readers only.
 */
export function PanelHeading({ id, title, description, counter, srOnly }) {
  if (srOnly) {
    return (
      <>
        <h2 id={id} className="fhint:sr-only">
          {title}
        </h2>
        {counter ? (
          <div className="fhint:flex fhint:justify-end">
            <Counter counter={counter} />
          </div>
        ) : null}
      </>
    );
  }

  return (
    <div className={panelHeader}>
      <span className="fhint:grid fhint:min-w-0 fhint:flex-[1_1_260px] fhint:gap-1">
        <h2 id={id} className={panelTitle}>
          {title}
        </h2>
        {description ? <span className={muted}>{description}</span> : null}
      </span>
      {counter ? <Counter counter={counter} /> : null}
    </div>
  );
}

export default PanelHeading;
