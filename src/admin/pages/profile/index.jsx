import RequestError from "@/components/RequestError";
import GoogleRequired from "@/components/GoogleRequired";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocationSelection } from "@/context/SelectedLocation";
import useSelectedLocation from "@/hooks/useSelectedLocation";
import { useGetProfileQuery } from "@/store/api/profileApi";
import { __ } from "@wordpress/i18n";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import ProfileHeader from "./components/ProfileHeader";
import ProfileTabs from "./components/ProfileTabs";
import PublishDialog from "./components/PublishDialog";
import SyncStatus from "./components/SyncStatus";
import useGoogleRead from "./hooks/useGoogleRead";
import useProfileDrafts from "./hooks/useProfileDrafts";
import buildProfileTabs from "./tabs";

/**
 * The business profile: seven sections, one tab each.
 *
 * Every section that is saved has its own Save button, and saving one sends
 * only that section — so a refusal in one never costs the changes made in
 * another. Edits survive a change of tab: a tab with unsaved changes is
 * marked, and its footer says where it stands — changed, saving, saved, or
 * not saved — while a refused field carries its own message.
 *
 * This file only wires the screen together. The edits and their saving live
 * in `useProfileDrafts`, the reads from Google in `useGoogleRead`, and what
 * each tab holds in `tabs.jsx`.
 */
export function Profile() {
  // The location is the one chosen in the bar at the top of every page. A
  // link may name one (`?location=2`); it is taken as the choice and then
  // dropped from the address, so the bar stays in charge.
  const [params, setParams] = useSearchParams();
  const { locationId, ready } = useSelectedLocation();
  const { select, registerGuard } = useLocationSelection();
  const linkedLocation = Math.max(0, Number(params.get("location")) || 0);

  useEffect(() => {
    if (!linkedLocation) {
      return;
    }

    select(linkedLocation);
    setParams(
      (current) => {
        const next = new URLSearchParams(current);

        next.delete("location");

        return next;
      },
      { replace: true },
    );
  }, [linkedLocation, select, setParams]);

  // `currentData`, not `data`: while another location loads, `data` would
  // still be the previous one's, and an edit made in that moment would be
  // saved against the wrong branch.
  const {
    currentData: data,
    error,
    isFetching,
    refetch,
  } = useGetProfileQuery(locationId, {
    skip: !ready || Boolean(linkedLocation),
  });
  const isLoading = !ready || (isFetching && !data);
  const [publishing, setPublishing] = useState(false);

  const sections = data?.sections;
  const meta = data?.meta ?? {};

  const google = meta.google ?? {};
  // With no Google account linked the server sends every section empty and
  // refuses saves; the screen locks its fields to match.
  const locked = google.linked === false;

  const drafts = useProfileDrafts(sections, locationId);
  const { isDirty, isSaving } = drafts;
  const googleRead = useGoogleRead({
    locationId,
    google,
    // No automatic read from Google while there is no Google to read.
    ready: Boolean(data) && !isFetching && !isDirty && !locked,
  });

  // Edits belong to the location they were made on. A switch made in the
  // bar while there are unsaved edits asks first, and discards them if the
  // answer is yes; carrying them across would save one branch's hours onto
  // another.
  const dirtyRef = useRef(false);
  const discardRef = useRef(() => {});

  dirtyRef.current = isDirty;
  discardRef.current = drafts.discardAllSections;

  useEffect(
    () =>
      registerGuard(() => {
        if (!dirtyRef.current) {
          return true;
        }

        if (
          !window.confirm(
            __(
              "You have unsaved changes for this location. Switch and discard them?",
              "foundhint-local-seo",
            ),
          )
        ) {
          return false;
        }

        discardRef.current();

        return true;
      }),
    [registerGuard],
  );

  // Arriving at another location reads its listing from Google once.
  const previousLocation = useRef(locationId);

  useEffect(() => {
    if (previousLocation.current !== locationId) {
      previousLocation.current = locationId;
      googleRead.markLocationSwitch(locationId);
    }
  });

  const header = (
    <ProfileHeader
      meta={data?.meta}
      onPublish={() => setPublishing(true)}
      publishDisabled={locked || isDirty || isSaving}
      publishHint={
        isDirty
          ? __("Save your changes first.", "foundhint-local-seo")
          : undefined
      }
      onRefresh={googleRead.refreshFromGoogle}
      isRefreshing={googleRead.isRefreshing}
      refreshDisabled={locked || isSaving}
    />
  );

  if (isLoading) {
    return (
      <div className="fhint:flex fhint:flex-col fhint:gap-4">
        {header}
        <Skeleton className="fhint:h-9 fhint:w-full" />
        <Skeleton className="fhint:h-[320px] fhint:w-full" />
      </div>
    );
  }

  if (error || !sections) {
    return (
      <div className="fhint:flex fhint:flex-col fhint:gap-4">
        {header}
        <RequestError
          error={error}
          title={__("Your profile could not be loaded", "foundhint-local-seo")}
        />
      </div>
    );
  }

  const tabs = buildProfileTabs({
    getModel: drafts.getModel,
    getChangeHandler: drafts.getChangeHandler,
    errors: drafts.errors,
    sections,
    meta,
    google,
    locationId,
    refreshFromGoogle: googleRead.refreshFromGoogle,
    isRefreshing: googleRead.isRefreshing,
    refetch,
  });

  return (
    <div className="fhint:flex fhint:flex-col fhint:gap-4">
      {header}

      {locked ? (
        <GoogleRequired />
      ) : (
        <SyncStatus
          google={google}
          isBusy={isFetching}
          notice={googleRead.refreshNotice}
        />
      )}

      <ProfileTabs
        tabs={tabs}
        getSectionState={drafts.getSectionState}
        onSave={drafts.saveSection}
        onDiscard={drafts.discardSection}
        disabled={isSaving}
        locked={locked}
        initialTab={params.get("tab") ?? ""}
      />

      {publishing ? (
        <PublishDialog
          locationId={locationId}
          onClose={() => setPublishing(false)}
          onSent={refetch}
        />
      ) : null}
    </div>
  );
}

export default Profile;
