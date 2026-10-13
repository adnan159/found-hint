import RequestError from "@/components/RequestError";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { errorMessage, fieldErrors } from "@/lib/errors";
import {
  useGetProfileQuery,
  useRefreshFromGoogleMutation,
  useSaveProfileSectionMutation,
} from "@/store/api/profileApi";
import { __, _n, sprintf } from "@wordpress/i18n";
import { cn } from "cn";
import {
  Building2Icon,
  ClockIcon,
  ImageIcon,
  ListChecksIcon,
  MapPinIcon,
  RefreshCwIcon,
  Share2Icon,
  WrenchIcon,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router";
import AddressSection from "./components/AddressSection";
import AttributesSection from "./components/AttributesSection";
import HoursSection from "./components/HoursSection";
import InfoSection from "./components/InfoSection";
import PhotosSection from "./components/PhotosSection";
import ProfileHeader from "./components/ProfileHeader";
import PublishDialog from "./components/PublishDialog";
import Section from "./components/Section";
import ServicesSection from "./components/ServicesSection";
import SocialSection, { workingLinks } from "./components/SocialSection";
import {
  EDITABLE,
  SECTIONS,
  fieldsFor,
  modelsFor,
  same,
  selectedAttributes,
} from "./model";
import { errorText, quietButton } from "./styles";

// How a tab says its section needs attention while another tab is open: a
// dot, with the words behind it for a screen reader.
const MARKS = {
  dirty: {
    tone: "fhint:bg-primary",
    label: () => __("Unsaved changes", "foundhint-local-seo"),
  },
  saving: {
    tone: "fhint:bg-primary",
    label: () => __("Saving…", "foundhint-local-seo"),
  },
  error: {
    tone: "fhint:bg-destructive",
    label: () => __("Not saved", "foundhint-local-seo"),
  },
};

/**
 * "2 hours ago", from a UTC timestamp as the server stores it.
 */
function ago(value) {
  if (!value) {
    return "";
  }

  const then = new Date(`${String(value).replace(" ", "T")}Z`).getTime();

  if (Number.isNaN(then)) {
    return "";
  }

  const minutes = Math.max(0, Math.round((Date.now() - then) / 60000));

  if (minutes < 1) {
    return __("just now", "foundhint-local-seo");
  }

  if (minutes < 60) {
    return sprintf(
      /* translators: %d: number of minutes. */
      _n("%d minute ago", "%d minutes ago", minutes, "foundhint-local-seo"),
      minutes,
    );
  }

  const hours = Math.round(minutes / 60);

  if (hours < 24) {
    return sprintf(
      /* translators: %d: number of hours. */
      _n("%d hour ago", "%d hours ago", hours, "foundhint-local-seo"),
      hours,
    );
  }

  const days = Math.round(hours / 24);

  return sprintf(
    /* translators: %d: number of days. */
    _n("%d day ago", "%d days ago", days, "foundhint-local-seo"),
    days,
  );
}

function syncLine(google) {
  // Nothing to report until Google is connected, so the line is left out.
  if (!google?.connected) {
    return "";
  }

  if (!google.mapped) {
    return __(
      "Google is connected, but no listing has been chosen for this location yet.",
      "foundhint-local-seo",
    );
  }

  const parts = [];

  // Whichever read was most recent: the listing itself, or its attributes
  // and photos. Both are "UTC, as stored", so they compare as text.
  const read = [google.synced_at, google.refreshed_at]
    .filter(Boolean)
    .sort()
    .pop();

  if (read) {
    parts.push(
      sprintf(
        /* translators: %s: a relative time, such as "2 hours ago". */
        __("Last read from Google %s.", "foundhint-local-seo"),
        ago(read),
      ),
    );
  }

  if (google.pushed_at) {
    parts.push(
      sprintf(
        /* translators: %s: a relative time, such as "2 hours ago". */
        __("Last sent to Google %s.", "foundhint-local-seo"),
        ago(google.pushed_at),
      ),
    );
  }

  return parts.length
    ? parts.join(" ")
    : __("Connected to your Google listing.", "foundhint-local-seo");
}

/**
 * The business profile: seven sections, one tab each.
 *
 * Every section that is saved has its own Save button, and saving one sends
 * only that section — so a refusal in one never costs the changes made in
 * another. Edits survive a change of tab: a tab with unsaved changes is
 * marked, and its footer says where it stands — changed, saving, saved, or
 * not saved — while a refused field carries its own message.
 *
 * What the screen edits is `drafts`: only the sections that have been
 * touched. Everything else is read straight from the server's copy, so a
 * save elsewhere (or a refresh from Google) shows up without being asked.
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
  const [saveSection] = useSaveProfileSectionMutation();
  const [refreshFromGoogle, refreshState] = useRefreshFromGoogleMutation();

  const [tab, setTab] = useState(SECTIONS[0]);
  const [drafts, setDrafts] = useState({});
  const [status, setStatus] = useState({});
  const [errors, setErrors] = useState({});
  const [publishing, setPublishing] = useState(false);
  // What the last read from Google came to, said beside the button that
  // asked for it.
  const [notice, setNotice] = useState(null);
  const noticeTimer = useRef(null);

  useEffect(() => () => clearTimeout(noticeTimer.current), []);

  const sections = data?.sections;
  const meta = data?.meta ?? {};
  const google = meta.google ?? {};

  const base = useMemo(() => modelsFor(sections ?? {}), [sections]);

  const model = (id) => drafts[id] ?? base[id];
  const dirty = EDITABLE.filter(
    (id) => id in drafts && !same(drafts[id], base[id]),
  );
  const isDirty = dirty.length > 0;
  const saving = Object.values(status).includes("saving");

  const refresh = async () => {
    setNotice(null);

    try {
      const { meta: answered } = await refreshFromGoogle({
        locationId,
      }).unwrap();
      const failed = answered?.refresh?.failed ?? [];

      clearTimeout(noticeTimer.current);
      setNotice(
        failed.length
          ? {
              tone: "bad",
              text: __(
                "Google answered for only part of your listing. Try again in a moment.",
                "foundhint-local-seo",
              ),
            }
          : {
              tone: "ok",
              text: __("Up to date with Google.", "foundhint-local-seo"),
            },
      );

      if (!failed.length) {
        noticeTimer.current = setTimeout(() => setNotice(null), 4000);
      }
    } catch (failure) {
      setNotice({ tone: "bad", text: errorMessage(failure) });
    }
  };

  // Google is read without being asked in two cases: the first time a
  // mapped listing is opened, and every time the location is switched — so
  // the location just chosen shows what its own listing holds now, not what
  // was read the last time somebody looked. Once each per arrival: `asked`
  // remembers which location the read was for, and is cleared by a switch.
  const asked = useRef(new Set());
  const switched = useRef(null);
  const loaded = Boolean(data) && !isFetching;
  const wantsRead =
    loaded &&
    Boolean(google.mapped) &&
    !isDirty &&
    (google.refreshed_at === null || switched.current === locationId);

  useEffect(() => {
    if (!wantsRead || asked.current.has(locationId)) {
      return;
    }

    asked.current.add(locationId);
    switched.current = null;
    refresh();
    // `refresh` is recreated every render and is left out of the list on
    // purpose; the guard above is what makes this run once.
  }, [wantsRead, locationId]);

  // Leaving with unsaved edits is the one way to lose work here.
  useEffect(() => {
    if (!isDirty) {
      return undefined;
    }

    const warn = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", warn);

    return () => window.removeEventListener("beforeunload", warn);
  }, [isDirty]);

  const change = (id) => (next) => {
    setDrafts((current) => ({ ...current, [id]: next }));
    setStatus((current) => ({ ...current, [id]: undefined }));
  };

  const stateOf = (id) => {
    if (status[id] === "saving" || status[id] === "error") {
      return status[id];
    }

    if (dirty.includes(id)) {
      return "dirty";
    }

    return status[id];
  };

  const without = (id) => (current) => {
    const next = { ...current };

    delete next[id];

    return next;
  };

  const discard = (id) => {
    setDrafts(without(id));
    setErrors(without(id));
    setStatus(without(id));
  };

  const discardAll = () => {
    setDrafts({});
    setErrors({});
    setStatus({});
    setNotice(null);
  };

  // One section, one request: only the tab whose button was pressed is sent.
  const save = async (id) => {
    setStatus((current) => ({ ...current, [id]: "saving" }));

    try {
      await saveSection({
        section: id,
        fields: fieldsFor(id, drafts[id], base[id]),
        locationId,
      }).unwrap();

      setDrafts(without(id));
      setErrors(without(id));
      setStatus((current) => ({ ...current, [id]: "saved" }));
    } catch (failure) {
      setErrors((current) => ({
        ...current,
        [id]: {
          fields: fieldErrors(failure),
          message: errorMessage(failure),
        },
      }));
      setStatus((current) => ({ ...current, [id]: "error" }));
    }
  };

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

    discardAll();
    // Mark the arrival, so the location's listing is read once it has loaded.
    asked.current.delete(id);
    switched.current = id;
    setParams(id ? { location: String(id) } : {});
  };

  const header = (
    <ProfileHeader
      info={sections?.info}
      meta={data?.meta}
      onSwitch={switchLocation}
      onPublish={() => setPublishing(true)}
      publishDisabled={isDirty || saving}
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

  // A refusal that names no field still has to be said somewhere.
  const refusal = (id) =>
    errors[id]?.message && !Object.keys(errors[id].fields ?? {}).length ? (
      <span role="alert" className={errorText}>
        {errors[id].message}
      </span>
    ) : null;

  const week = model("hours").week;
  const openDays = week.filter((day) => day.configured && day.open).length;
  const links = workingLinks(model("social"));
  const ticked = selectedAttributes(model("attributes"));
  const serviceCount = model("services").length;
  const serviceLimits = sections.services?.limits ?? {};
  const photoCount = sections.media?.count ?? 0;

  const tabs = [
    {
      id: "info",
      icon: Building2Icon,
      tab: __("Information", "foundhint-local-seo"),
      saveLabel: __("Save Information", "foundhint-local-seo"),
      body: (
        <>
          {refusal("info")}
          <InfoSection
            model={model("info")}
            onChange={change("info")}
            errors={errors.info?.fields}
            info={sections.info}
            google={google}
            limits={meta.limits}
          />
          <p className="fhint:m-0 fhint:text-[12.5px] fhint:text-muted-strong">
            {__(
              "Legal name, business type, email, logo, price range and founding date are used only in your website markup.",
              "foundhint-local-seo",
            )}{" "}
            <Link
              to="/business/details"
              className="fhint:font-extrabold fhint:text-foreground fhint:underline"
            >
              {__("Edit markup details", "foundhint-local-seo")}
            </Link>
          </p>
        </>
      ),
    },
    {
      id: "address",
      icon: MapPinIcon,
      tab: __("Address & Location", "foundhint-local-seo"),
      saveLabel: __("Save Address", "foundhint-local-seo"),
      body: (
        <>
          {refusal("address")}
          <AddressSection
            model={model("address")}
            onChange={change("address")}
            errors={errors.address?.fields}
            address={sections.address}
          />
        </>
      ),
    },
    {
      id: "hours",
      icon: ClockIcon,
      tab: __("Business Hours", "foundhint-local-seo"),
      saveLabel: __("Save Hours", "foundhint-local-seo"),
      badge: sprintf(
        /* translators: %d: number of days of the week. */
        _n("%d day open", "%d days open", openDays, "foundhint-local-seo"),
        openDays,
      ),
      body: (
        <>
          {refusal("hours")}
          <HoursSection
            model={model("hours")}
            onChange={change("hours")}
            errors={errors.hours?.fields}
          />
        </>
      ),
    },
    {
      id: "social",
      icon: Share2Icon,
      tab: __("Social Links", "foundhint-local-seo"),
      saveLabel: __("Save Links", "foundhint-local-seo"),
      badge: sprintf(
        /* translators: %d: number of links. */
        __("%d in your markup", "foundhint-local-seo"),
        links,
      ),
      body: (
        <>
          {refusal("social")}
          <SocialSection
            model={model("social")}
            onChange={change("social")}
            errors={errors.social?.fields}
            social={sections.social}
          />
        </>
      ),
    },
    {
      id: "attributes",
      icon: ListChecksIcon,
      tab: __("Attributes", "foundhint-local-seo"),
      saveLabel: __("Save Attributes", "foundhint-local-seo"),
      badge: sprintf(
        /* translators: %d: number of attributes. */
        __("%d selected", "foundhint-local-seo"),
        ticked,
      ),
      body: (
        <>
          {refusal("attributes")}
          <AttributesSection
            model={model("attributes")}
            onChange={change("attributes")}
            attributes={sections.attributes}
            google={google}
            onRefresh={refresh}
            refreshing={refreshState.isLoading}
          />
        </>
      ),
    },
    {
      id: "services",
      icon: WrenchIcon,
      tab: __("Services", "foundhint-local-seo"),
      saveLabel: __("Save Services", "foundhint-local-seo"),
      badge:
        serviceLimits.unlimited || !serviceLimits.limit
          ? sprintf(
              /* translators: %d: number of services. */
              _n(
                "%d service",
                "%d services",
                serviceCount,
                "foundhint-local-seo",
              ),
              serviceCount,
            )
          : sprintf(
              /* translators: 1: services added, 2: services the plan includes. */
              __("%1$d of %2$d used", "foundhint-local-seo"),
              serviceCount,
              serviceLimits.limit,
            ),
      body: (
        <>
          {refusal("services")}
          <ServicesSection
            model={model("services")}
            onChange={change("services")}
            errors={errors.services?.fields}
            services={sections.services}
          />
        </>
      ),
    },
    {
      id: "media",
      icon: ImageIcon,
      tab: __("Photos", "foundhint-local-seo"),
      badge: sprintf(
        /* translators: %d: number of photos. */
        _n("%d photo", "%d photos", photoCount, "foundhint-local-seo"),
        photoCount,
      ),
      badgeTone: "quiet",
      body: (
        <PhotosSection
          media={sections.media}
          google={google}
          locationId={locationId}
          onChanged={refetch}
        />
      ),
    },
  ];

  return (
    <div className="fhint:flex fhint:flex-col fhint:gap-4">
      {header}

      <div
        aria-busy={isFetching}
        hidden={!syncLine(google)}
        className="fhint:grid fhint:gap-1 fhint:text-[13.5px] fhint:text-muted-strong"
      >
        <p className="fhint:m-0 fhint:flex fhint:flex-wrap fhint:items-center fhint:gap-x-3 fhint:gap-y-1 fhint:text-[13px]">
          <span>{syncLine(google)}</span>
          {google.mapped ? (
            <button
              type="button"
              onClick={refresh}
              disabled={refreshState.isLoading || saving}
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
                  refreshState.isLoading && "fhint:animate-spin",
                )}
              />
              {refreshState.isLoading
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

      <Tabs value={tab} onValueChange={setTab} className="fhint:gap-4">
        <TabsList
          variant="line"
          aria-label={__("Profile sections", "foundhint-local-seo")}
          className="fhint:h-auto! fhint:w-full fhint:flex-nowrap fhint:justify-start fhint:gap-1 fhint:overflow-x-auto fhint:overflow-y-hidden fhint:p-0 fhint:pb-[5px] fhint:shadow-[inset_0_-2px_0_var(--border)]"
        >
          {tabs.map(({ id, icon: Icon, tab: name }) => (
            <TabsTrigger
              key={id}
              value={id}
              className="fhint:flex-none fhint:cursor-pointer fhint:rounded-none fhint:px-2.5 fhint:py-2 fhint:text-[13px] fhint:font-bold"
            >
              <Icon aria-hidden="true" />
              {name}
              {MARKS[stateOf(id)] ? (
                <span
                  className={cn(
                    "fhint:size-2 fhint:flex-none fhint:rounded-full",
                    MARKS[stateOf(id)].tone,
                  )}
                >
                  <span className="fhint:sr-only">
                    {MARKS[stateOf(id)].label()}
                  </span>
                </span>
              ) : null}
            </TabsTrigger>
          ))}
        </TabsList>

        {tabs.map(({ id, icon, tab: name, body, ...extra }) => (
          // Kept mounted, so a tab's own working state — photos waiting to
          // upload, an open dialog — is still there on the way back.
          <TabsContent key={id} value={id} keepMounted>
            <Section
              id={id}
              icon={icon}
              title={name}
              state={stateOf(id)}
              onSave={EDITABLE.includes(id) ? () => save(id) : undefined}
              onDiscard={() => discard(id)}
              disabled={saving}
              {...extra}
            >
              {body}
            </Section>
          </TabsContent>
        ))}
      </Tabs>

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
