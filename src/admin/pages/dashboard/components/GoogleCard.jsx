import { __ } from "@wordpress/i18n";
import { CheckIcon, MapPinIcon, TriangleAlertIcon } from "lucide-react";
import { Link } from "react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import GoogleSignInButton from "@/components/GoogleSignInButton";
import RequestError from "@/components/RequestError";
import useGoogleConnect from "@/hooks/useGoogleConnect";
import {
  useGetGoogleProfilesQuery,
  useSyncGoogleProfilesMutation,
} from "@/store/api/googleApi";

/**
 * Whether the Google Business Profile is connected, on the dashboard.
 *
 * The prototype's card, measured: a 13px/800 uppercase title, a green
 * "Connected" line with the facts beneath it in a 120px label column, and,
 * when there is nothing connected, a dashed panel with a pin, the pitch and
 * one button.
 *
 * **Every fact here is one this plugin actually holds.** The prototype also
 * shows "3 fields differ from Google"; that comparison lives in the audit,
 * which this card does not read, and inventing a number here would be
 * indistinguishable from a real one.
 */
function Fact({ label, children }) {
  return (
    <div className="fhint:flex fhint:gap-2.5">
      <span className="fhint:w-[120px] fhint:shrink-0 fhint:text-muted-foreground">
        {label}
      </span>
      <strong className="fhint:min-w-0 fhint:font-bold fhint:break-words">
        {children}
      </strong>
    </div>
  );
}

function formatWhen(value) {
  if (!value) {
    return "";
  }

  const parsed = new Date(`${value.replace(" ", "T")}Z`);

  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString();
}

export function GoogleCard() {
  const { connect, isConnecting, error, connected, needsReconnect, google } =
    useGoogleConnect();
  const { data: overview } = useGetGoogleProfilesQuery();
  const [sync, { isLoading: isSyncing, error: syncError }] =
    useSyncGoogleProfilesMutation();

  const profiles = overview?.google_locations ?? [];
  const linked = (overview?.locations ?? []).filter(
    (location) => location.mapped_to,
  ).length;

  const onSync = async () => {
    try {
      await sync().unwrap();
      toast.success(__("Read your Google profiles.", "found-hint"));
    } catch {
      // Shown inline: Google's refusals are specific enough to read.
    }
  };

  return (
    <section
      aria-labelledby="fhint-google-card-title"
      className="fhint:flex fhint:flex-col fhint:border fhint:border-border fhint:bg-card fhint:p-[22px]"
    >
      <h2
        id="fhint-google-card-title"
        className="fhint:m-0 fhint:mb-3.5 fhint:font-heading fhint:text-[13px] fhint:font-extrabold fhint:tracking-[0.1em] fhint:uppercase"
      >
        {__("Google Business Profile", "found-hint")}
      </h2>

      <RequestError error={error ?? syncError} />

      {connected || needsReconnect ? (
        <div className="fhint:flex fhint:flex-1 fhint:flex-col">
          {connected ? (
            <div className="fhint:flex fhint:items-center fhint:gap-2 fhint:text-[15px] fhint:font-extrabold fhint:text-success">
              <CheckIcon aria-hidden="true" className="fhint:size-[17px]" />
              {__("Connected", "found-hint")}
            </div>
          ) : (
            <div className="fhint:flex fhint:items-center fhint:gap-2 fhint:text-[15px] fhint:font-extrabold fhint:text-band-fair">
              <TriangleAlertIcon
                aria-hidden="true"
                className="fhint:size-[17px]"
              />
              {__("Needs reconnecting", "found-hint")}
            </div>
          )}

          <div className="fhint:my-3.5 fhint:mb-4.5 fhint:grid fhint:gap-[9px] fhint:text-[13px]">
            {/* The address is the one fact that proves *which* account is
                connected, which is the question this card answers. */}
            <Fact label={__("Google account", "found-hint")}>
              {google?.account_email || __("Unknown", "found-hint")}
            </Fact>
            <Fact label={__("Profiles read", "found-hint")}>
              {profiles.length}
            </Fact>
            <Fact label={__("Locations linked", "found-hint")}>{linked}</Fact>
            <Fact label={__("Last read", "found-hint")}>
              {overview?.synced_at
                ? formatWhen(overview.synced_at)
                : __("Never", "found-hint")}
            </Fact>
          </div>

          <div className="fhint:mt-auto fhint:flex fhint:flex-wrap fhint:gap-2">
            {needsReconnect ? (
              <GoogleSignInButton
                onClick={connect}
                disabled={isConnecting}
                isBusy={isConnecting}
                label={__("Reconnect with Google", "found-hint")}
              />
            ) : (
              <Button
                type="button"
                onClick={onSync}
                disabled={isSyncing}
                className="fhint:h-auto fhint:px-[15px] fhint:py-2.5 fhint:text-[13.5px] fhint:font-extrabold"
              >
                {isSyncing ? <Spinner data-icon="inline-start" /> : null}
                {__("Read from Google", "found-hint")}
              </Button>
            )}
            <Button
              variant="outline"
              render={<Link to="/google" />}
              className="fhint:h-auto fhint:px-[15px] fhint:py-2.5 fhint:text-[13.5px] fhint:font-bold"
            >
              {__("Manage", "found-hint")}
            </Button>
          </div>
        </div>
      ) : (
        <div className="fhint:flex fhint:flex-1 fhint:flex-col">
          <div className="fhint:flex fhint:flex-1 fhint:flex-col fhint:justify-center fhint:border fhint:border-dashed fhint:border-input fhint:p-5">
            <MapPinIcon
              aria-hidden="true"
              strokeWidth={1.6}
              className="fhint:mb-3 fhint:size-[26px] fhint:text-sidebar-chevron"
            />
            <strong className="fhint:mb-1.5 fhint:block fhint:font-heading fhint:text-[16px] fhint:font-extrabold">
              {__("Connect your Google Business Profile", "found-hint")}
            </strong>
            <p className="fhint:mb-4 fhint:text-[13px] fhint:leading-[1.5] fhint:text-muted-strong">
              {__(
                "See how Google shows your business right now, spot details that do not match your website, and reply to reviews from here.",
                "found-hint",
              )}
            </p>
            <GoogleSignInButton
              onClick={connect}
              disabled={isConnecting}
              isBusy={isConnecting}
              className="fhint:self-start"
            />
          </div>
        </div>
      )}
    </section>
  );
}

export default GoogleCard;
