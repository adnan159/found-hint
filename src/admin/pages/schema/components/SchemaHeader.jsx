import { __, sprintf } from "@wordpress/i18n";
import { RefreshCwIcon, SparklesIcon } from "lucide-react";
import { useDispatch } from "react-redux";
import { toast } from "sonner";
import { cn } from "cn";
import { errorMessage } from "@/lib/errors";
import { upgradeUrl } from "@/lib/pro";
import { focus } from "@/pages/profile/styles";
import { useRefreshFromGoogleMutation } from "@/store/api/profileApi";
import { schemaManagerApi } from "@/store/api/schemaManagerApi";
import { relative } from "../lib/schema";

const button = cn(
  "fhint:inline-flex fhint:cursor-pointer fhint:items-center fhint:gap-2 fhint:border fhint:border-[#bab6b6] fhint:bg-card fhint:px-3 fhint:py-2 fhint:text-[13px] fhint:font-bold fhint:text-[#201e1d] fhint:no-underline fhint:disabled:cursor-wait",
  focus,
);

/**
 * The line above the tabs: when the business data last came from Google,
 * and Refresh from Google (the Business Profile's own refresh — schema
 * never calls Google itself). Without Pro: the upgrade prompt instead.
 */
export function SchemaHeader({ locked, syncedAt, locationId = 0 }) {
  const [refresh, { isLoading }] = useRefreshFromGoogleMutation();
  const dispatch = useDispatch();

  if (locked) {
    return (
      <div className="fhint:flex fhint:flex-wrap fhint:items-center fhint:gap-3 fhint:border fhint:border-notice-border fhint:bg-notice fhint:px-4 fhint:py-3 fhint:text-notice-foreground">
        <SparklesIcon
          aria-hidden="true"
          className="fhint:size-4 fhint:flex-none fhint:text-primary"
        />
        <span className="fhint:min-w-0 fhint:flex-[1_1_320px] fhint:text-[13px] fhint:leading-normal">
          <strong>
            {__(
              "The Schema Manager is part of FoundHint Pro.",
              "foundhint-local-seo",
            )}
          </strong>{" "}
          {__(
            "Below is the markup your site prints today. Pro lets you edit it, add locations, services and your website's structure, and choose where each prints.",
            "foundhint-local-seo",
          )}
        </span>
        <a
          href={upgradeUrl()}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            button,
            "fhint:border-0 fhint:bg-[#FF6B35] fhint:text-white!",
          )}
        >
          {__("Upgrade to Pro", "foundhint-local-seo")}
          <span className="fhint:sr-only">
            {__("(opens in a new tab)", "foundhint-local-seo")}
          </span>
        </a>
      </div>
    );
  }

  const onRefresh = async () => {
    try {
      // The location on screen: the main one, or the branch being edited.
      await refresh({ locationId }).unwrap();
      // Un-edited fields follow Google: read the tab again.
      dispatch(schemaManagerApi.util.invalidateTags(["SchemaManager"]));
      toast.success(
        __("Read your Business Profile from Google.", "foundhint-local-seo"),
      );
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  return (
    <div className="fhint:flex fhint:flex-wrap fhint:items-center fhint:justify-end fhint:gap-3.5">
      {syncedAt ? (
        <span className="fhint:text-[12.5px] fhint:text-[#625e5e]">
          {sprintf(
            /* translators: %s: e.g. "2 hours ago". */
            __("Synced from Google %s", "foundhint-local-seo"),
            relative(syncedAt),
          )}
        </span>
      ) : null}
      <button
        type="button"
        onClick={onRefresh}
        disabled={isLoading}
        className={button}
      >
        <RefreshCwIcon
          aria-hidden="true"
          className={cn("fhint:size-3.5", isLoading && "fhint:animate-spin")}
        />
        {isLoading
          ? __("Refreshing…", "foundhint-local-seo")
          : __("Refresh from Google", "foundhint-local-seo")}
      </button>
    </div>
  );
}

export default SchemaHeader;
