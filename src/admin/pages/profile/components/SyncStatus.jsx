import { __ } from "@wordpress/i18n";
import { cn } from "cn";
import { RefreshCwIcon } from "lucide-react";
import { googleSyncText } from "../lib/sync";
import { quietButton } from "../styles";

/**
 * The line under the header that says when Google was last read and sent
 * to, with the button that reads it again and what that read came to.
 *
 * Nothing is drawn until Google is connected: there is nothing to report.
 */
export function SyncStatus({
  google,
  isBusy,
  notice,
  isRefreshing,
  disabled,
  onRefresh,
}) {
  const syncText = googleSyncText(google);

  return (
    <div
      aria-busy={isBusy}
      hidden={!syncText}
      className="fhint:grid fhint:gap-1 fhint:text-[13.5px] fhint:text-muted-strong"
    >
      <p className="fhint:m-0 fhint:flex fhint:flex-wrap fhint:items-center fhint:gap-x-3 fhint:gap-y-1 fhint:text-[13px]">
        <span>{syncText}</span>
        {google.mapped ? (
          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing || disabled}
            title={__(
              "Reads your attributes and photos from Google. Nothing on Google is changed.",
              "foundhint-local-seo",
            )}
            className={quietButton}
          >
            <RefreshCwIcon
              aria-hidden="true"
              className={cn(
                "fhint:size-3.5",
                isRefreshing && "fhint:animate-spin",
              )}
            />
            {isRefreshing
              ? __("Reading Google…", "foundhint-local-seo")
              : __("Refresh from Google", "foundhint-local-seo")}
          </button>
        ) : null}
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
