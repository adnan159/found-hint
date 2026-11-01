import { __, sprintf } from "@wordpress/i18n";
import { muted, panelChip, panelHeader, panelTitle } from "../styles";

/**
 * The heading of a tab's main panel: title, what it describes, and how many
 * of its fields came from Google. The panel points at `id` with
 * `aria-labelledby`.
 *
 * @param {Object} props
 * @param {string} props.id          The title's id.
 * @param {string} props.title
 * @param {string} props.description
 * @param {Object} [props.counter]   `{ from_google, total }`.
 */
export function PanelHeading({ id, title, description, counter }) {
  return (
    <div className={panelHeader}>
      <span className="fhint:min-w-0 fhint:flex-[1_1_260px]">
        <h2 id={id} className={panelTitle}>
          {title}
        </h2>
        <span className={muted}>{description}</span>
      </span>
      {counter ? (
        <span className={panelChip}>
          {sprintf(
            /* translators: 1: fields filled from Google, 2: all fields. */
            __("%1$d of %2$d fields from Google", "foundhint-local-seo"),
            counter.from_google,
            counter.total,
          )}
        </span>
      ) : null}
    </div>
  );
}

export default PanelHeading;
