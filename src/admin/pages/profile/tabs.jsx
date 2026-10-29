import { __, _n, sprintf } from "@wordpress/i18n";
import {
  Building2Icon,
  ClockIcon,
  ImageIcon,
  ListChecksIcon,
  MapPinIcon,
  Share2Icon,
  WrenchIcon,
} from "lucide-react";
import { Link } from "react-router";
import AddressSection from "./components/AddressSection";
import AttributesSection from "./components/AttributesSection";
import HoursSection from "./components/HoursSection";
import InfoSection from "./components/InfoSection";
import PhotosSection from "./components/PhotosSection";
import ServicesSection from "./components/ServicesSection";
import SocialSection, { workingLinks } from "./components/SocialSection";
import { selectedAttributes } from "./model";
import { errorText } from "./styles";

/**
 * The profile's seven tabs, in page order: what each is called, the count
 * shown beside its heading, what its Save button says, and its fields.
 *
 * A tab with no `saveLabel` (photos, which are stored as they are added) has
 * nothing to save. Adding a tab means an entry here and its id in `SECTIONS`
 * in `model.js`.
 *
 * @param {Object}   context
 * @param {Function} context.getModel    The model on screen for a section id.
 * @param {Function} context.getChangeHandler   `getChangeHandler(id)` returns that section's
 *                                      `onChange`.
 * @param {Object}   context.errors     What the last save refused, by section.
 * @param {Object}   context.sections   The server's copy of every section.
 * @param {Object}   context.meta       The profile's `meta`.
 * @param {Object}   context.google     `meta.google`.
 * @param {number}   context.locationId The location on screen.
 * @param {Function} context.refreshFromGoogle    Read the listing from Google again.
 * @param {boolean}  context.isRefreshing Whether that read is under way.
 * @param {Function} context.refetch    Load the profile again.
 * @return {Object[]} One entry per tab.
 */
export function buildProfileTabs({
  getModel,
  getChangeHandler,
  errors,
  sections,
  meta,
  google,
  locationId,
  refreshFromGoogle,
  isRefreshing,
  refetch,
}) {
  // A refusal that names no field still has to be said somewhere.
  const sectionError = (id) =>
    errors[id]?.message && !Object.keys(errors[id].fields ?? {}).length ? (
      <span role="alert" className={errorText}>
        {errors[id].message}
      </span>
    ) : null;

  const week = getModel("hours").week;
  const openDays = week.filter((day) => day.configured && day.open).length;
  const workingLinkCount = workingLinks(getModel("social"));
  const selectedCount = selectedAttributes(getModel("attributes"));
  const serviceCount = getModel("services").length;
  const serviceLimits = sections.services?.limits ?? {};
  const photoCount = sections.media?.count ?? 0;

  const tabs = [
    {
      id: "info",
      icon: Building2Icon,
      label: __("Information", "foundhint-local-seo"),
      saveLabel: __("Save Information", "foundhint-local-seo"),
      content: (
        <>
          {sectionError("info")}
          <InfoSection
            model={getModel("info")}
            onChange={getChangeHandler("info")}
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
              className="fhint:font-extrabold fhint:text-foreground! fhint:underline"
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
      label: __("Address & Location", "foundhint-local-seo"),
      saveLabel: __("Save Address", "foundhint-local-seo"),
      content: (
        <>
          {sectionError("address")}
          <AddressSection
            model={getModel("address")}
            onChange={getChangeHandler("address")}
            errors={errors.address?.fields}
            address={sections.address}
            businessName={sections.info?.name ?? ""}
          />
        </>
      ),
    },
    {
      id: "hours",
      icon: ClockIcon,
      label: __("Business Hours", "foundhint-local-seo"),
      saveLabel: __("Save Hours", "foundhint-local-seo"),
      badge: sprintf(
        /* translators: %d: number of days of the week. */
        _n("%d day open", "%d days open", openDays, "foundhint-local-seo"),
        openDays,
      ),
      content: (
        <>
          {sectionError("hours")}
          <HoursSection
            model={getModel("hours")}
            onChange={getChangeHandler("hours")}
            errors={errors.hours?.fields}
          />
        </>
      ),
    },
    {
      id: "social",
      icon: Share2Icon,
      label: __("Social Links", "foundhint-local-seo"),
      saveLabel: __("Save Links", "foundhint-local-seo"),
      badge: sprintf(
        /* translators: %d: number of links. */
        __("%d in your markup", "foundhint-local-seo"),
        workingLinkCount,
      ),
      content: (
        <>
          {sectionError("social")}
          <SocialSection
            model={getModel("social")}
            onChange={getChangeHandler("social")}
            errors={errors.social?.fields}
            social={sections.social}
          />
        </>
      ),
    },
    {
      id: "attributes",
      icon: ListChecksIcon,
      label: __("Attributes", "foundhint-local-seo"),
      saveLabel: __("Save Attributes", "foundhint-local-seo"),
      badge: sprintf(
        /* translators: %d: number of attributes. */
        __("%d selected", "foundhint-local-seo"),
        selectedCount,
      ),
      content: (
        <>
          {sectionError("attributes")}
          <AttributesSection
            model={getModel("attributes")}
            onChange={getChangeHandler("attributes")}
            attributes={sections.attributes}
            google={google}
            onRefresh={refreshFromGoogle}
            isRefreshing={isRefreshing}
          />
        </>
      ),
    },
    {
      id: "services",
      icon: WrenchIcon,
      label: __("Services", "foundhint-local-seo"),
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
      content: (
        <>
          {sectionError("services")}
          <ServicesSection
            model={getModel("services")}
            onChange={getChangeHandler("services")}
            errors={errors.services?.fields}
            services={sections.services}
          />
        </>
      ),
    },
    {
      id: "media",
      icon: ImageIcon,
      label: __("Photos", "foundhint-local-seo"),
      badge: sprintf(
        /* translators: %d: number of photos. */
        _n("%d photo", "%d photos", photoCount, "foundhint-local-seo"),
        photoCount,
      ),
      badgeTone: "quiet",
      content: (
        <PhotosSection
          media={sections.media}
          google={google}
          locationId={locationId}
          onChanged={refetch}
        />
      ),
    },
  ];

  return tabs;
}

export default buildProfileTabs;
