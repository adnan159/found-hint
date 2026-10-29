import { cn } from "cn";
import { googleSyncText } from "../lib/sync";

/**
 * The line under the header that says when Google was last read and sent
 * to, and what the last Refresh from Google (in the title bar) came to.
 *
 * Nothing is drawn until Google is connected: there is nothing to report.
 */
export function SyncStatus({ google, isBusy, notice }) {
  const syncText = googleSyncText(google);

  return (
    <div
      aria-busy={isBusy}
      hidden={!syncText}
      className="fhint:grid fhint:gap-1 fhint:text-[13.5px] fhint:text-muted-strong"
    >
      <p className="fhint:m-0 fhint:flex fhint:flex-wrap fhint:items-center fhint:gap-x-3 fhint:gap-y-1 fhint:text-[13px]">
        <span>{syncText}</span>
        <span
          aria-live="polite"
          className={cn(
            "fhint:font-bold",
            notice?.tone === "ok" && "fhint:text-success",
            notice?.tone === "bad" && "fhint:text-destructive",
          )}
        >
          {notice?.text ?? ""}
        </span>
      </p>
    </div>
  );
}

export default SyncStatus;
