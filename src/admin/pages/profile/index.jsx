import RequestError from "@/components/RequestError";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetProfileQuery } from "@/store/api/profileApi";
import { __ } from "@wordpress/i18n";
import { useState } from "react";
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
  // Which location is on screen lives in the address, so a reload or a
  // shared link opens the same branch. No value means the primary one.
  const [params, setParams] = useSearchParams();
  const locationId = Math.max(0, Number(params.get("location")) || 0);

  // `currentData`, not `data`: while another location loads, `data` would
  // still be the previous one's, and an edit made in that moment would be
  // saved against the wrong branch.
  const {
    currentData: data,
    error,
    isFetching,
    refetch,
  } = useGetProfileQuery(locationId);
  const isLoading = isFetching && !data;
  const [publishing, setPublishing] = useState(false);

  const sections = data?.sections;
  const meta = data?.meta ?? {};
  const google = meta.google ?? {};

  const drafts = useProfileDrafts(sections, locationId);
  const { isDirty, isSaving } = drafts;
  const googleRead = useGoogleRead({
    locationId,
    google,
    ready: Boolean(data) && !isFetching && !isDirty,
  });

  const switchLocation = (id) => {
    if (id === (meta.location?.id ?? 0)) {
      return;
    }

    // Edits belong to the location they were made on. Carrying them across
    // would save one branch's hours onto another.
    if (
      isDirty &&
      !window.confirm(
        __(
          "You have unsaved changes for this location. Switch and discard them?",
          "foundhint-local-seo",
        ),
      )
    ) {
      return;
    }

    drafts.discardAllSections();
    googleRead.markLocationSwitch(id);
    setParams(id ? { location: String(id) } : {});
  };

  const header = (
    <ProfileHeader
      info={sections?.info}
      meta={data?.meta}
      onSwitch={switchLocation}
      onPublish={() => setPublishing(true)}
      publishDisabled={isDirty || isSaving}
      publishHint={
        isDirty
          ? __("Save your changes first.", "foundhint-local-seo")
          : undefined
      }
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

      <SyncStatus
        google={google}
        isBusy={isFetching}
        notice={googleRead.refreshNotice}
        isRefreshing={googleRead.isRefreshing}
        disabled={isSaving}
        onRefresh={googleRead.refreshFromGoogle}
      />

      <ProfileTabs
        tabs={tabs}
        getSectionState={drafts.getSectionState}
        onSave={drafts.saveSection}
        onDiscard={drafts.discardSection}
        disabled={isSaving}
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
