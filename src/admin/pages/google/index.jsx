import { useEffect, useRef, useState } from "react";
import { __, sprintf } from "@wordpress/i18n";
import { CheckIcon, CopyIcon, ExternalLinkIcon } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import NoticeBar from "@/components/NoticeBar";
import GoogleSignInButton from "@/components/GoogleSignInButton";
import PageHeader from "@/components/PageHeader";
import RequestError from "@/components/RequestError";
import SectionCard from "@/components/SectionCard";
import {
  useDisconnectGoogleMutation,
  useGetGoogleProfilesQuery,
  useGetGoogleQuery,
  useSaveGoogleCredentialsMutation,
  useStartGoogleConnectMutation,
} from "@/store/api/googleApi";
import BusinessProfiles from "./components/BusinessProfiles";
import LocationMapping from "./components/LocationMapping";

/**
 * The Google Business Profile connection.
 *
 * Two steps, shown in order, because the second cannot be done before the
 * first: register an OAuth client in Google Cloud, then sign in with it.
 * The screen never displays a secret — the server has no route that returns
 * one, so there is nothing here to accidentally render.
 */
const GOOGLE_CONSOLE_URL = "https://console.cloud.google.com/apis/credentials";

function StatusLine({ state }) {
  const connected = state.status === "connected";
  const needsReconnect = state.status === "needs_reconnect";

  if (connected || needsReconnect) {
    return (
      <div className="fhint:flex fhint:flex-wrap fhint:items-center fhint:gap-2">
        <span
          className={
            connected
              ? "fhint:inline-flex fhint:items-center fhint:gap-1.5 fhint:bg-success fhint:px-2 fhint:py-1 fhint:text-[11px] fhint:font-extrabold fhint:tracking-[0.1em] fhint:text-success-foreground fhint:uppercase"
              : "fhint:inline-flex fhint:items-center fhint:gap-1.5 fhint:bg-notice fhint:px-2 fhint:py-1 fhint:text-[11px] fhint:font-extrabold fhint:tracking-[0.1em] fhint:text-notice-foreground fhint:uppercase"
          }
        >
          {connected ? (
            <CheckIcon aria-hidden="true" data-icon="inline-start" />
          ) : null}
          {connected
            ? __("Connected", "found-hint")
            : __("Needs reconnecting", "found-hint")}
        </span>
        {state.account_email ? (
          <span className="fhint:text-[13px] fhint:text-muted-strong">
            {sprintf(
              /* translators: %s: the Google account email address. */
              __("as %s", "found-hint"),
              state.account_email,
            )}
          </span>
        ) : null}
      </div>
    );
  }

  return (
    <span className="fhint:inline-flex fhint:items-center fhint:bg-muted fhint:px-2 fhint:py-1 fhint:text-[11px] fhint:font-extrabold fhint:tracking-[0.1em] fhint:text-muted-strong fhint:uppercase">
      {__("Not connected", "found-hint")}
    </span>
  );
}

function RedirectUri({ value }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can be refused; the value is selectable on screen,
      // so there is nothing to recover from.
      toast.error(
        __("Could not copy. Select the address instead.", "found-hint"),
      );
    }
  };

  return (
    <div className="fhint:flex fhint:flex-wrap fhint:items-center fhint:gap-2">
      <code className="fhint:min-w-0 fhint:flex-1 fhint:overflow-x-auto fhint:border fhint:border-border fhint:bg-muted fhint:px-3 fhint:py-2 fhint:text-[12.5px] fhint:whitespace-nowrap">
        {value}
      </code>
      <Button type="button" variant="outline" onClick={copy}>
        {copied ? (
          <CheckIcon data-icon="inline-start" />
        ) : (
          <CopyIcon data-icon="inline-start" />
        )}
        {copied ? __("Copied", "found-hint") : __("Copy", "found-hint")}
      </Button>
    </div>
  );
}

export default function GooglePage() {
  // Refetched on every mount rather than served from cache. The connection
  // state is read one-shot on the server — a failure notice is handed over
  // once and deleted — so a cached copy would replay a failure that was
  // dealt with long ago every time the screen was reopened.
  const {
    data: state,
    isLoading,
    fulfilledTimeStamp,
  } = useGetGoogleQuery(undefined, {
    refetchOnMountOrArgChange: true,
  });
  const [
    saveCredentials,
    { isLoading: isSavingCredentials, error: saveError },
  ] = useSaveGoogleCredentialsMutation();
  const [startConnect, { isLoading: isConnecting, error: connectError }] =
    useStartGoogleConnectMutation();
  const [disconnect, { isLoading: isDisconnecting }] =
    useDisconnectGoogleMutation();
  const { data: overview } = useGetGoogleProfilesQuery();

  const [form, setForm] = useState({ client_id: "", client_secret: "" });

  // Held locally once seen, so the refetch that follows does not pull the
  // message out from under the person reading it.
  //
  // Only ever taken from a read that finished *after this screen opened*.
  // On a remount RTK Query serves the cached state before it refetches, and
  // that cached copy still carries a notice the server has already handed
  // over and deleted — trusting it replays a failure the operator dealt
  // with a visit ago. Comparing against mount time is what separates "the
  // server just told us" from "this was in the cache", which no flag on the
  // query can express: the cached render is not loading, not fetching and
  // not stale as far as the hook is concerned.
  const openedAt = useRef(Date.now());
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    if (state?.notice && fulfilledTimeStamp >= openedAt.current) {
      setNotice(state.notice);
    }
  }, [state, fulfilledTimeStamp]);

  if (isLoading || !state) {
    return (
      <>
        <PageHeader title={__("Google Business Profile", "found-hint")} />
        <Skeleton className="fhint:h-[60vh] fhint:w-full" />
      </>
    );
  }

  const connected =
    state.status === "connected" || state.status === "needs_reconnect";

  const onSaveCredentials = async (event) => {
    event.preventDefault();

    try {
      await saveCredentials({
        client_id: form.client_id.trim(),
        client_secret: form.client_secret.trim(),
      }).unwrap();

      // The secret is write-only and is never sent back, so the field is
      // cleared rather than left holding a value the server may not have.
      setForm({ client_id: "", client_secret: "" });
      toast.success(__("Google client saved.", "found-hint"));
    } catch {
      // Shown inline by RequestError.
    }
  };

  const onConnect = async () => {
    // Without a stored Google client there is nowhere to send anyone. The
    // field that fixes that is on this same screen, so the button points at
    // it — elsewhere the shared hook navigates here for the same reason. A
    // button that is simply dead reads as a broken one.
    if (!state.configured) {
      const field = document.getElementById("google-client-id");

      field?.scrollIntoView({ block: "center", behavior: "smooth" });
      field?.focus({ preventScroll: true });

      return;
    }

    try {
      const result = await startConnect().unwrap();

      if (result?.authorize_url) {
        // A full navigation, not a popup: this is Google's own sign-in page
        // and it must be unmistakably Google's, in the address bar the
        // person already trusts.
        window.location.assign(result.authorize_url);
      }
    } catch {
      // Shown inline by RequestError.
    }
  };

  const onDisconnect = async () => {
    try {
      const result = await disconnect().unwrap();

      toast.success(
        result && false === result.revoked
          ? __(
              "Disconnected here. Google did not confirm, so check your Google account's connected apps.",
              "found-hint",
            )
          : __("Disconnected from Google.", "found-hint"),
      );
    } catch {
      toast.error(__("Could not disconnect.", "found-hint"));
    }
  };

  return (
    <>
      <PageHeader
        title={__("Google Business Profile", "found-hint")}
        description={__(
          "Connect the Google account that manages your business, so FoundHint can see how Google shows you today.",
          "found-hint",
        )}
        actions={<StatusLine state={state} />}
      />

      <RequestError error={saveError ?? connectError} />

      {notice ? (
        <Alert variant="destructive" role="alert">
          <AlertTitle>{__("That did not work", "found-hint")}</AlertTitle>
          <AlertDescription>{notice.message}</AlertDescription>
        </Alert>
      ) : null}

      {state.status === "needs_reconnect" ? (
        <NoticeBar>
          {__(
            "This connection is missing permission to manage your business profile. Connect again and accept all the requested permissions.",
            "found-hint",
          )}
        </NoticeBar>
      ) : null}

      <SectionCard
        id="google-client"
        title={__("Google client", "found-hint")}
        description={__(
          "FoundHint uses your own Google Cloud project, so your data and your quota stay yours.",
          "found-hint",
        )}
      >
        <FieldGroup>
          <Field>
            <FieldLabel>{__("Redirect URI", "found-hint")}</FieldLabel>
            <RedirectUri value={state.redirect_uri} />
            <FieldDescription>
              {__(
                "Add this to your OAuth client in Google Cloud under Authorised redirect URIs, exactly as shown. A mismatch here is the usual reason a first connection fails.",
                "found-hint",
              )}
            </FieldDescription>
          </Field>

          <Field>
            <FieldLabel htmlFor="google-client-id">
              {__("Client ID", "found-hint")}
            </FieldLabel>
            <Input
              id="google-client-id"
              value={form.client_id}
              autoComplete="off"
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  client_id: event.target.value,
                }))
              }
              placeholder={
                state.client_id_hint ||
                "1234567890-abc.apps.googleusercontent.com"
              }
            />
            <FieldDescription>
              {state.client_id_hint
                ? sprintf(
                    /* translators: %s: the start of the stored client id. */
                    __("Currently %s — leave blank to keep it.", "found-hint"),
                    state.client_id_hint,
                  )
                : __("From your OAuth client in Google Cloud.", "found-hint")}
            </FieldDescription>
          </Field>

          <Field>
            <FieldLabel htmlFor="google-client-secret">
              {__("Client secret", "found-hint")}
            </FieldLabel>
            <Input
              id="google-client-secret"
              type="password"
              autoComplete="new-password"
              value={form.client_secret}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  client_secret: event.target.value,
                }))
              }
            />
            <FieldDescription>
              {state.configured
                ? __(
                    "A secret is stored. It is never shown again — leave this blank to keep it, or paste a new one to replace it.",
                    "found-hint",
                  )
                : __(
                    "Stored on your site and never shown again once saved.",
                    "found-hint",
                  )}
            </FieldDescription>
          </Field>
        </FieldGroup>

        <div className="fhint:mt-5 fhint:flex fhint:flex-wrap fhint:items-center fhint:gap-2.5">
          <Button
            type="button"
            onClick={onSaveCredentials}
            disabled={isSavingCredentials}
          >
            {isSavingCredentials ? <Spinner data-icon="inline-start" /> : null}
            {__("Save client", "found-hint")}
          </Button>
          <Button
            variant="outline"
            render={
              <a
                href={GOOGLE_CONSOLE_URL}
                target="_blank"
                rel="noreferrer noopener"
              />
            }
          >
            <ExternalLinkIcon data-icon="inline-start" />
            {__("Open Google Cloud credentials", "found-hint")}
          </Button>
        </div>
      </SectionCard>

      <SectionCard
        id="google-connection"
        title={__("Connection", "found-hint")}
        description={__(
          "Sign in with the Google account that manages your business.",
          "found-hint",
        )}
      >
        {/* The prototype's trust line, kept word for word: it is the
            sentence that answers the question people actually have when a
            plugin asks them to sign in to Google. */}
        <p className="fhint:max-w-[76ch] fhint:text-[13.5px] fhint:text-muted-strong">
          {__(
            "You sign in on Google's own page. FoundHint never sees your password, and nothing on your profile changes without your confirmation.",
            "found-hint",
          )}
        </p>

        {connected ? (
          <dl className="fhint:mt-5 fhint:flex fhint:flex-col fhint:gap-2 fhint:text-[13px]">
            <div className="fhint:flex fhint:gap-2">
              <dt className="fhint:font-bold">{__("Account", "found-hint")}</dt>
              <dd className="fhint:text-muted-strong">
                {state.account_email || __("Unknown", "found-hint")}
              </dd>
            </div>
            <div className="fhint:flex fhint:gap-2">
              <dt className="fhint:font-bold">
                {__("Permissions", "found-hint")}
              </dt>
              <dd className="fhint:text-muted-strong">
                {state.can_manage_profile
                  ? __("Can manage your business profile", "found-hint")
                  : __("Cannot manage your business profile", "found-hint")}
              </dd>
            </div>
          </dl>
        ) : null}

        <div className="fhint:mt-5 fhint:flex fhint:flex-wrap fhint:items-center fhint:gap-2.5">
          <GoogleSignInButton
            onClick={onConnect}
            disabled={isConnecting}
            isBusy={isConnecting}
            describedBy={
              state.configured ? undefined : "fhint-google-needs-client"
            }
            label={
              connected
                ? __("Reconnect with Google", "found-hint")
                : __("Continue with Google", "found-hint")
            }
          />

          {connected ? (
            <AlertDialog>
              <AlertDialogTrigger
                render={<Button variant="outline" disabled={isDisconnecting} />}
              >
                {__("Disconnect", "found-hint")}
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    {__("Disconnect from Google?", "found-hint")}
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    {__(
                      "FoundHint will stop reading your Google Business Profile. Nothing on your Google profile changes, and your business details here are untouched. You can connect again at any time.",
                      "found-hint",
                    )}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>
                    {__("Keep connected", "found-hint")}
                  </AlertDialogCancel>
                  <AlertDialogAction onClick={onDisconnect}>
                    {__("Disconnect", "found-hint")}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : null}
        </div>

        {!state.configured ? (
          <p
            id="fhint-google-needs-client"
            className="fhint:mt-4 fhint:text-[13px] fhint:text-muted-strong"
          >
            {__(
              "Add your Google client ID and secret above first — this button will take you to them.",
              "found-hint",
            )}
          </p>
        ) : null}
      </SectionCard>

      <BusinessProfiles overview={overview} isConnected={connected} />
      <LocationMapping overview={overview} isConnected={connected} />
    </>
  );
}
