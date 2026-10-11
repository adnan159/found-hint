import { useEffect, useMemo, useRef, useState } from "react";
import { __, _n, sprintf } from "@wordpress/i18n";
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
import { Link, useSearchParams } from "react-router";
import { cn } from "cn";
import { Skeleton } from "@/components/ui/skeleton";
import RequestError from "@/components/RequestError";
import { errorMessage, fieldErrors } from "@/lib/errors";
import {
  useGetProfileQuery,
  useRefreshFromGoogleMutation,
  useSaveProfileSectionMutation,
} from "@/store/api/profileApi";
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
import { errorText, primaryButton, quietButton } from "./styles";

const ALL_OPEN = Object.fromEntries(SECTIONS.map((id) => [id, true]));

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
  if (!google?.connected) {
    return __(
      "Connect Google to keep your listing and your website saying the same thing.",
      "foundhint-local-seo",
    );
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
 * The business profile: seven sections on one screen.
 *
 * No section has a Save button of its own. Edits collect across the whole
 * page and one bar at the bottom saves them, one section per request, so a
 * refusal in one section never costs the changes made in another. Each
 * section's header says where it stands — changed, saving, saved, or not
 * saved — and a refused field carries its own message.
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

  const [open, setOpen] = useState(ALL_OPEN);
  const [drafts, setDrafts] = useState({});
  const [status, setStatus] = useState({});
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  // What the last save came to. Said in the bar itself rather than in a
  // toast: a toast lands on top of the very buttons it is talking about.
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
    setNotice(null);
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

  const discard = () => {
    setDrafts({});
    setErrors({});
    setStatus({});
    setNotice(null);
  };

  const save = async () => {
    setSaving(true);

    let failed = 0;
    let firstFailure = null;

    // One at a time and in page order: every section is its own request, and
    // a refusal stops only the section it belongs to.
    for (const id of dirty) {
      setStatus((current) => ({ ...current, [id]: "saving" }));

      try {
        await saveSection({
          section: id,
          fields: fieldsFor(id, drafts[id], base[id]),
          locationId,
        }).unwrap();

        setDrafts((current) => {
          const next = { ...current };

          delete next[id];

          return next;
        });
        setErrors((current) => ({ ...current, [id]: undefined }));
        setStatus((current) => ({ ...current, [id]: "saved" }));
      } catch (failure) {
        failed += 1;
        firstFailure = firstFailure ?? id;

        setErrors((current) => ({
          ...current,
          [id]: {
            fields: fieldErrors(failure),
            message: errorMessage(failure),
          },
        }));
        setStatus((current) => ({ ...current, [id]: "error" }));
        setOpen((current) => ({ ...current, [id]: true }));
      }
    }

    setSaving(false);

    clearTimeout(noticeTimer.current);

    if (failed) {
      setNotice({
        tone: "bad",
        text: sprintf(
          /* translators: %d: number of sections. */
          _n(
            "%d section was not saved. Check the highlighted fields.",
            "%d sections were not saved. Check the highlighted fields.",
            failed,
            "foundhint-local-seo",
          ),
          failed,
        ),
      });

      document
        .getElementById(`profile-${firstFailure}`)
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      setNotice({ tone: "ok", text: __("Saved.", "foundhint-local-seo") });
      noticeTimer.current = setTimeout(() => setNotice(null), 4000);
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

    discard();
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
        {SECTIONS.map((id) => (
          <Skeleton key={id} className="fhint:h-[60px] fhint:w-full" />
        ))}
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

  const section = (id, icon, title, extra = {}) => ({
    id,
    icon,
    title,
    state: stateOf(id),
    open: open[id],
    onToggle: () => setOpen((current) => ({ ...current, [id]: !current[id] })),
    ...extra,
  });

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

  return (
    <div className="fhint:flex fhint:flex-col fhint:gap-4">
      {header}

      <div
        aria-busy={isFetching}
        className="fhint:grid fhint:gap-1 fhint:text-[13.5px] fhint:text-muted-strong"
      >
        <p className="fhint:m-0 fhint:max-w-[76ch]">
          {__(
            "Your business name, address, hours, links, attributes, services and photos, all in one place. FoundHint uses these details for your website markup and your location pages.",
            "foundhint-local-seo",
          )}
        </p>
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
        </p>
      </div>

      <Section
        {...section(
          "info",
          Building2Icon,
          __("Business Information", "foundhint-local-seo"),
        )}
      >
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
      </Section>

      <Section
        {...section(
          "address",
          MapPinIcon,
          __("Address and Location", "foundhint-local-seo"),
        )}
      >
        {refusal("address")}
        <AddressSection
          model={model("address")}
          onChange={change("address")}
          errors={errors.address?.fields}
          address={sections.address}
        />
      </Section>

      <Section
        {...section(
          "hours",
          ClockIcon,
          __("Business Hours", "foundhint-local-seo"),
          {
            badge: sprintf(
              /* translators: %d: number of days of the week. */
              _n(
                "%d day open",
                "%d days open",
                openDays,
                "foundhint-local-seo",
              ),
              openDays,
            ),
          },
        )}
      >
        {refusal("hours")}
        <HoursSection
          model={model("hours")}
          onChange={change("hours")}
          errors={errors.hours?.fields}
        />
      </Section>

      <Section
        {...section(
          "social",
          Share2Icon,
          __("Social Links and Listings", "foundhint-local-seo"),
          {
            badge: sprintf(
              /* translators: %d: number of links. */
              __("%d in your markup", "foundhint-local-seo"),
              links,
            ),
          },
        )}
      >
        {refusal("social")}
        <SocialSection
          model={model("social")}
          onChange={change("social")}
          errors={errors.social?.fields}
          social={sections.social}
        />
      </Section>

      <Section
        {...section(
          "attributes",
          ListChecksIcon,
          __("Attributes", "foundhint-local-seo"),
          {
            badge: sprintf(
              /* translators: %d: number of attributes. */
              __("%d selected", "foundhint-local-seo"),
              ticked,
            ),
          },
        )}
      >
        {refusal("attributes")}
        <AttributesSection
          model={model("attributes")}
          onChange={change("attributes")}
          attributes={sections.attributes}
          google={google}
          onRefresh={refresh}
          refreshing={refreshState.isLoading}
        />
      </Section>

      <Section
        {...section(
          "services",
          WrenchIcon,
          __("Services", "foundhint-local-seo"),
          {
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
          },
        )}
      >
        {refusal("services")}
        <ServicesSection
          model={model("services")}
          onChange={change("services")}
          errors={errors.services?.fields}
          services={sections.services}
        />
      </Section>

      <Section
        {...section("media", ImageIcon, __("Photos", "foundhint-local-seo"), {
          badge: sprintf(
            /* translators: %d: number of photos. */
            _n("%d photo", "%d photos", photoCount, "foundhint-local-seo"),
            photoCount,
          ),
          badgeTone: "quiet",
        })}
      >
        <PhotosSection
          media={sections.media}
          google={google}
          locationId={locationId}
          onChanged={refetch}
        />
      </Section>

      {isDirty || saving || notice ? (
        <div
          role="region"
          aria-label={__("Save changes", "foundhint-local-seo")}
          className="fhint:sticky fhint:bottom-0 fhint:z-10 fhint:flex fhint:flex-wrap fhint:items-center fhint:gap-3 fhint:border-2 fhint:border-divider fhint:bg-card fhint:px-[22px] fhint:py-3.5 fhint:shadow-[0_-6px_18px_rgba(45,43,43,0.10)]"
        >
          <span
            aria-live="polite"
            className={cn(
              "fhint:min-w-0 fhint:flex-1 fhint:text-[13px] fhint:font-bold",
              !saving && notice?.tone === "ok" && "fhint:text-success",
              !saving && notice?.tone === "bad" && "fhint:text-destructive",
            )}
          >
            {saving
              ? __("Saving…", "foundhint-local-seo")
              : (notice?.text ??
                sprintf(
                  /* translators: %d: number of sections. */
                  _n(
                    "Unsaved changes in %d section.",
                    "Unsaved changes in %d sections.",
                    dirty.length,
                    "foundhint-local-seo",
                  ),
                  dirty.length,
                ))}
          </span>
          {isDirty || saving ? (
            <>
              <button
                type="button"
                onClick={discard}
                disabled={saving}
                className={cn(
                  quietButton,
                  "fhint:px-4 fhint:py-[9px] fhint:text-[13px]",
                )}
              >
                {__("Discard", "foundhint-local-seo")}
              </button>
              <button
                type="button"
                onClick={save}
                disabled={saving}
                className={cn(
                  primaryButton,
                  "fhint:px-4 fhint:py-[9px] fhint:text-[13px]",
                )}
              >
                {__("Save changes", "foundhint-local-seo")}
              </button>
            </>
          ) : null}
        </div>
      ) : null}

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
