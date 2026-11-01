import { useEffect, useRef } from "react";
import { __, sprintf } from "@wordpress/i18n";
import { cn } from "cn";
import { RefreshCwIcon } from "lucide-react";
import Hint from "@/components/Hint";
import { pillButton } from "@/components/location-bar/styles";

/**
 * A screen's title row, drawn as the Business Profile's
 * (`pages/profile/components/header/TitleBar`): "FoundHint / <screen>" over
 * the title, an info hint beside it, and the screen's buttons on the right.
 * Reviews and Posts & Scheduling use it.
 *
 * The bar runs edge to edge under the business bar, cancelling `main`'s
 * padding. Whichever row is on top carries the rule that meets the
 * sidebar's: once the business bar above has loaded (`ready`) it does, and
 * this row takes the lighter one.
 *
 * Focus moves to the title on mount: a hash route change does not move it,
 * so this is how the screen is announced.
 *
 * @param {Object}                    props
 * @param {string}                    props.title   The screen's name.
 * @param {string}                    props.hint    What the screen is for.
 * @param {boolean}                   props.ready   Whether the business bar has loaded.
 * @param {import('react').ReactNode} [props.actions] Buttons on the right.
 */
export function ScreenTitleBar({ title, hint, ready, actions }) {
  const headingRef = useRef(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <header className="fhint:-mx-4 fhint:-mt-6 fhint:flex fhint:flex-col">
      <div
        className={cn(
          "fhint:box-border fhint:flex fhint:min-h-17 fhint:flex-wrap fhint:items-center fhint:gap-x-4 fhint:gap-y-3 fhint:border-b fhint:px-4 fhint:py-2.5",
          ready ? "fhint:border-b-border" : "fhint:border-b-divider",
        )}
      >
        <div className="fhint:min-w-45 fhint:flex-1">
          <p className="fhint:m-0 fhint:text-[12.5px] fhint:font-semibold fhint:text-muted-strong">
            {sprintf(
              /* translators: %s: the screen's name. */
              __("FoundHint / %s", "foundhint-local-seo"),
              title,
            )}
          </p>
          <div className="fhint:flex fhint:items-center fhint:gap-1.5">
            <h1
              ref={headingRef}
              tabIndex={-1}
              className="fhint:m-0 fhint:p-0 fhint:font-heading fhint:text-[21px] fhint:leading-tight fhint:font-extrabold fhint:tracking-[-0.02em] fhint:outline-none"
            >
              {title}
            </h1>
            {hint ? (
              <Hint about={title} side="bottom" align="start" text={hint} />
            ) : null}
          </div>
        </div>

        {actions ? (
          <div className="fhint:flex fhint:flex-wrap fhint:items-center fhint:gap-2">
            {actions}
          </div>
        ) : null}
      </div>
    </header>
  );
}

/**
 * The "Sync …" pill a title bar carries: reads from Google, changes
 * nothing there, and spins while it runs.
 *
 * @param {Object}   props
 * @param {Function} props.onClick
 * @param {boolean}  props.syncing
 * @param {string}   props.label     "Sync reviews", "Sync posts".
 * @param {string}   props.busyLabel Said while it runs.
 * @param {string}   props.title     The tooltip: what it reads.
 */
export function SyncButton({ onClick, syncing, label, busyLabel, title }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={syncing}
      title={title}
      className={pillButton}
    >
      <RefreshCwIcon
        aria-hidden="true"
        className={cn("fhint:size-3.5", syncing && "fhint:animate-spin")}
      />
      {syncing ? busyLabel : label}
    </button>
  );
}

export default ScreenTitleBar;
