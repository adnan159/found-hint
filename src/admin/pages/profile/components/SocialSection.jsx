import { useState } from "react";
import { __, _n, sprintf } from "@wordpress/i18n";
import { cn } from "cn";
import { linkState } from "../model";
import { help, label, linkButton } from "../styles";
import BookingCards from "./social/BookingCards";
import LinkCard from "./social/LinkCard";
import { NETWORKS, ORDER } from "./social/networks";

const GRID =
  "fhint:grid fhint:grid-cols-1 fhint:gap-3 fhint:md:grid-cols-2 fhint:xl:grid-cols-3";

/**
 * Links to the business elsewhere.
 *
 * Three groups: the networks Google shows, the booking and messaging links
 * (also Google's — the Book and Chat buttons), then the directories Google
 * does not show. The design also lists ordering links and some twenty more
 * directories; nothing stores those yet, so they are not drawn: a field
 * that is typed into and then forgotten on save is the worst kind of
 * missing feature.
 */
export function SocialSection({ model, onChange, errors, social }) {
  const [showJson, setShowJson] = useState(false);
  const profiles = model.profiles ?? {};

  const networks = [
    ...ORDER.filter((network) => network in profiles),
    ...Object.keys(profiles).filter((network) => !ORDER.includes(network)),
  ];
  const onGoogle = networks.filter(
    (network) => NETWORKS[network]?.google !== false,
  );
  const elsewhere = networks.filter(
    (network) => NETWORKS[network]?.google === false,
  );

  const sameAs = networks
    .map((network) => String(profiles[network] ?? "").trim())
    .filter((url) => linkState(url) === "ok");

  const card = (network) => (
    <LinkCard
      key={network}
      network={network}
      value={profiles[network] ?? ""}
      error={errors?.[`social_profiles.${network}`]}
      onChange={(value) =>
        onChange({ ...model, profiles: { ...profiles, [network]: value } })
      }
    />
  );

  return (
    <>
      <div className="fhint:grid fhint:gap-3">
        <div>
          <h3 className={cn(label, "fhint:m-0 fhint:text-sm")}>
            {__("Shown on your Google profile", "foundhint-local-seo")}
          </h3>
          <p className={cn(help, "fhint:m-0")}>
            {__(
              "Customers see these links on your listing in Search and Maps.",
              "foundhint-local-seo",
            )}
          </p>
        </div>
        <div className={GRID}>{onGoogle.map(card)}</div>
      </div>

      <div className="fhint:grid fhint:gap-3 fhint:border-t fhint:border-t-border fhint:pt-[18px]">
        <div>
          <h3 className={cn(label, "fhint:m-0 fhint:text-sm")}>
            {__("Booking and messaging", "foundhint-local-seo")}
          </h3>
          <p className={cn(help, "fhint:m-0")}>
            {__(
              "How customers book or reach you. Google shows these as the Book and Chat buttons on your listing.",
              "foundhint-local-seo",
            )}
          </p>
        </div>
        <div className={GRID}>
          <BookingCards
            model={model.booking ?? {}}
            onChange={(booking) => onChange({ ...model, booking })}
            errors={errors}
            offered={social?.booking_offered}
            country={social?.country ?? ""}
          />
        </div>
      </div>

      {elsewhere.length ? (
        <div className="fhint:grid fhint:gap-3 fhint:border-t fhint:border-t-border fhint:pt-[18px]">
          <div>
            <h3 className={cn(label, "fhint:m-0 fhint:text-sm")}>
              {__("Directories and review sites", "foundhint-local-seo")}
            </h3>
            <p className={cn(help, "fhint:m-0")}>
              {__(
                "Other places your business is listed. These are not shown on your Google profile, but every working link goes into your website markup so search engines can tell they all belong to you.",
                "foundhint-local-seo",
              )}
            </p>
          </div>
          <div className={GRID}>{elsewhere.map(card)}</div>
        </div>
      ) : null}

      <div className="fhint:grid fhint:gap-2 fhint:border fhint:border-border fhint:bg-muted fhint:px-[15px] fhint:py-[13px]">
        <div className="fhint:flex fhint:flex-wrap fhint:items-center fhint:gap-3">
          <span className="fhint:min-w-0 fhint:flex-1 fhint:text-[13px]">
            <strong>
              {sprintf(
                /* translators: %d: number of links. */
                _n(
                  "%d link will be added to your business markup as sameAs.",
                  "%d links will be added to your business markup as sameAs.",
                  sameAs.length,
                  "foundhint-local-seo",
                ),
                sameAs.length,
              )}
            </strong>{" "}
            <span className="fhint:text-muted-strong">
              {__(
                "Empty and broken links are left out.",
                "foundhint-local-seo",
              )}
            </span>
          </span>
          {sameAs.length ? (
            <button
              type="button"
              onClick={() => setShowJson((value) => !value)}
              aria-expanded={showJson}
              className={linkButton}
            >
              {showJson
                ? __("Hide the markup", "foundhint-local-seo")
                : __("Show the markup", "foundhint-local-seo")}
            </button>
          ) : null}
        </div>
        {showJson && sameAs.length ? (
          <pre className="fhint:m-0 fhint:overflow-auto fhint:border fhint:border-border fhint:bg-card fhint:p-3 fhint:font-mono fhint:text-[12px] fhint:leading-[1.5]">
            {JSON.stringify({ sameAs }, null, 2)}
          </pre>
        ) : null}
        {social?.same_as && !sameAs.length && social.same_as.length ? (
          <span className={help}>
            {__(
              "The links saved before are still in your markup until you save.",
              "foundhint-local-seo",
            )}
          </span>
        ) : null}
      </div>
    </>
  );
}

// How many working profile links a model holds — the section's badge, the
// links that go into the markup. Booking links are not counted: they are
// not profiles of the business.
export function workingLinks(model) {
  return Object.values(model?.profiles ?? {}).filter(
    (url) => linkState(url) === "ok",
  ).length;
}

export default SocialSection;
