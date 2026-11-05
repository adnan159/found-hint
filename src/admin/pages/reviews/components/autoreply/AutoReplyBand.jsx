import { __ } from "@wordpress/i18n";
import { Settings2Icon, ZapIcon } from "lucide-react";
import { cn } from "cn";
import { Switch } from "@/components/ui/switch";
import { activateUrl, licenseInactive, upgradeUrl } from "@/lib/pro";
import { focus, help } from "@/pages/profile/styles";
import { primaryAction } from "../../styles";

const pill =
  "fhint:inline-flex fhint:items-center fhint:rounded-full fhint:px-2 fhint:py-0.5 fhint:text-[11.5px] fhint:font-bold";

/**
 * The auto-reply band across the top of Reviews (design): whether it is
 * active, what it does, how many replies it has sent, Set up, and the
 * switch — which saves at once. Without FoundHint Premium it says what
 * auto-reply does and links to Premium.
 *
 * @param {Object}   props
 * @param {Object}   props.autoReply From `useAutoReply()`.
 * @param {Function} props.onSetUp   Open the setup dialog.
 */
export function AutoReplyBand({ autoReply, onSetUp }) {
  const { available, state, toggle, saving } = autoReply;
  const on = Boolean(state?.on);
  const inactive = licenseInactive() && activateUrl();

  return (
    <section
      aria-label={__("Auto-reply", "foundhint-local-seo")}
      className="fhint:flex fhint:flex-wrap fhint:items-center fhint:gap-4 fhint:border fhint:border-border fhint:bg-card fhint:px-5 fhint:py-4"
    >
      <span
        aria-hidden="true"
        className="fhint:grid fhint:size-9 fhint:shrink-0 fhint:place-items-center fhint:bg-[#FFF1EB] fhint:text-[#D8521F]"
      >
        <ZapIcon className="fhint:size-4.5" />
      </span>

      <span className="fhint:grid fhint:min-w-0 fhint:flex-[1_1_320px] fhint:gap-0.5">
        <span className="fhint:flex fhint:items-center fhint:gap-2">
          <strong className="fhint:text-[15px]">
            {__("Auto-reply", "foundhint-local-seo")}
          </strong>
          {available ? (
            <span
              className={cn(
                pill,
                on
                  ? "fhint:bg-[#157F4B] fhint:text-white"
                  : "fhint:bg-[#FBF0DE] fhint:text-[#201e1d]",
              )}
            >
              {on
                ? __("Active", "foundhint-local-seo")
                : __("Paused", "foundhint-local-seo")}
            </span>
          ) : (
            <span
              className={cn(pill, "fhint:bg-[#FFF1EB] fhint:text-[#D8521F]")}
            >
              {__("Premium", "foundhint-local-seo")}
            </span>
          )}
        </span>
        <span className={cn(help, "fhint:text-[13px]")}>
          {on
            ? __(
                "FoundHint is replying to new reviews using your choices for each star rating.",
                "foundhint-local-seo",
              )
            : __(
                "Choose a template or a built-in reply for each star rating, then switch it on.",
                "foundhint-local-seo",
              )}
        </span>
      </span>

      {available ? (
        <>
          <span className="fhint:grid fhint:text-center">
            <strong className="fhint:text-lg">{state?.sent ?? 0}</strong>
            <span className="fhint:text-[11.5px] fhint:text-muted-strong">
              {__("Auto-replies sent", "foundhint-local-seo")}
            </span>
          </span>
          <button
            type="button"
            onClick={onSetUp}
            disabled={!state}
            className={cn(
              "fhint:inline-flex fhint:cursor-pointer fhint:items-center fhint:gap-2 fhint:border fhint:border-input fhint:bg-card fhint:px-3.5 fhint:py-2 fhint:text-[13px] fhint:font-bold fhint:hover:bg-muted fhint:disabled:opacity-60",
              focus,
            )}
          >
            <Settings2Icon aria-hidden="true" className="fhint:size-3.5" />
            {__("Set up", "foundhint-local-seo")}
          </button>
          <span className="fhint:flex fhint:items-center fhint:gap-2 fhint:text-[12px] fhint:font-bold fhint:text-muted-strong">
            {on
              ? __("ON", "foundhint-local-seo")
              : __("OFF", "foundhint-local-seo")}
            <Switch
              checked={on}
              disabled={!state || saving}
              onCheckedChange={toggle}
              aria-label={__("Auto-reply", "foundhint-local-seo")}
            />
          </span>
        </>
      ) : (
        <a
          href={inactive ? activateUrl() : upgradeUrl()}
          target={inactive ? undefined : "_blank"}
          rel={inactive ? undefined : "noopener noreferrer"}
          className={primaryAction}
        >
          {inactive
            ? __("Activate licence", "foundhint-local-seo")
            : __("Unlock with Premium", "foundhint-local-seo")}
        </a>
      )}
    </section>
  );
}

export default AutoReplyBand;
