import { __ } from "@wordpress/i18n";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import GoogleSignInButton from "@/components/GoogleSignInButton";
import RequestError from "@/components/RequestError";
import useGoogleConnect from "@/hooks/useGoogleConnect";

/**
 * Shown above a screen whose fields are locked because no Google account is
 * linked. The business details belong to a Google Business Profile, so they
 * stay empty and read-only until one is — and the way out is right here.
 */
export function GoogleRequired() {
  const { connect, isConnecting, error } = useGoogleConnect();

  return (
    <Alert>
      <AlertTitle>
        {__("Connect Google to see your details", "foundhint-local-seo")}
      </AlertTitle>
      <AlertDescription className="fhint:flex fhint:flex-col fhint:items-start fhint:gap-3">
        <span>
          {__(
            "Your business details come from your Google Business Profile. Connect it to show them here and edit them — until then every field stays empty and locked.",
            "foundhint-local-seo",
          )}
        </span>
        <RequestError
          error={error}
          title={__(
            "Could not start the Google sign-in",
            "foundhint-local-seo",
          )}
        />
        <GoogleSignInButton
          onClick={connect}
          disabled={isConnecting}
          isBusy={isConnecting}
        />
      </AlertDescription>
    </Alert>
  );
}

/**
 * Whether a Google account is linked, from the connection the app already
 * reads. "Needs reconnect" counts as linked, as it does on the server.
 *
 * @param {Object} google `GET /google` data.
 * @return {boolean|null} null while it is still loading.
 */
export function isGoogleLinked(google) {
  if (!google) {
    return null;
  }

  return google.status === "connected" || google.status === "needs_reconnect";
}

export default GoogleRequired;
