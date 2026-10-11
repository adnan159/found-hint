import { useId, useState } from "react";
import { __, _n, sprintf } from "@wordpress/i18n";
import { cn } from "cn";
import { linkState } from "../model";
import {
  errorText,
  help,
  input,
  label,
  linkButton,
  tag,
  tagTones,
} from "../styles";

/**
 * The networks the server stores, in the design's order, with the brand
 * colour each tile is tinted in. Colour here is decoration only — the name
 * is always written out beside it.
 *
 * `google: false` marks a link Google has no place for. It is still worth
 * having: it goes into the site's own markup.
 */
const NETWORKS = {
  facebook: {
    name: "Facebook",
    short: "FB",
    color: "#1877F2",
    placeholder: "https://facebook.com/your-page",
  },
  instagram: {
    name: "Instagram",
    short: "IG",
    color: "#C13584",
    placeholder: "https://instagram.com/your-account",
  },
  linkedin: {
    name: "LinkedIn",
    short: "IN",
    color: "#0A66C2",
    placeholder: "https://linkedin.com/company/your-company",
  },
  youtube: {
    name: "YouTube",
    short: "YT",
    color: "#C4302B",
    placeholder: "https://youtube.com/@your-channel",
  },
  tiktok: {
    name: "TikTok",
    short: "TT",
    color: "#201e1d",
    placeholder: "https://tiktok.com/@your-account",
  },
  x: {
    name: "X (Twitter)",
    short: "X",
    color: "#201e1d",
    placeholder: "https://x.com/your-account",
  },
  pinterest: {
    name: "Pinterest",
    short: "PI",
    color: "#BD081C",
    placeholder: "https://pinterest.com/your-account",
  },
  yelp: {
    name: "Yelp",
    short: "YE",
    color: "#D32323",
    placeholder: "https://www.yelp.com/biz/your-business",
    google: false,
  },
};

const ORDER = Object.keys(NETWORKS);

const STATES = {
  ok: { tone: tagTones.ok, label: () => __("Working", "foundhint-local-seo") },
  bad: {
    tone: tagTones.bad,
    label: () => __("Check link", "foundhint-local-seo"),
  },
  empty: {
    tone: tagTones.quiet,
    label: () => __("Not added", "foundhint-local-seo"),
  },
};

function LinkCard({ network, value, onChange, error }) {
  const id = useId();
  const meta = NETWORKS[network] ?? {
    name: network,
    short: network.slice(0, 2).toUpperCase(),
    color: "#605d5d",
    placeholder: "https://",
  };
  const state = error ? "bad" : linkState(value);
  const message =
    error ??
    (state === "bad"
      ? __(
          "This needs to be a full web address starting with https://",
          "foundhint-local-seo",
        )
      : "");

  return (
    <div className="fhint:flex fhint:items-start fhint:gap-3 fhint:rounded-[12px] fhint:border fhint:border-[#e6e3e3] fhint:bg-card fhint:p-3.5">
      <span
        aria-hidden="true"
        style={{ color: meta.color, backgroundColor: `${meta.color}1F` }}
        className={cn(
          "fhint:grid fhint:size-[42px] fhint:flex-none fhint:place-items-center fhint:rounded-[10px] fhint:text-[11.5px] fhint:font-extrabold",
          state !== "ok" && "fhint:opacity-60",
        )}
      >
        {meta.short}
      </span>
      <div className="fhint:grid fhint:min-w-0 fhint:flex-1 fhint:gap-1.5">
        <div className="fhint:flex fhint:flex-wrap fhint:items-center fhint:gap-2">
          <label htmlFor={id} className={label}>
            {meta.name}
          </label>
          <span className={cn(tag, STATES[state].tone, "fhint:ml-auto")}>
            {STATES[state].label()}
          </span>
        </div>
        <input
          id={id}
          type="url"
          inputMode="url"
          value={value}
          placeholder={meta.placeholder}
          onChange={(event) => onChange(event.target.value)}
          aria-invalid={state === "bad" ? true : undefined}
          aria-describedby={message ? `${id}-help` : undefined}
          className={cn(input, "fhint:rounded-[10px]!")}
        />
        {message ? (
          <span
            id={`${id}-help`}
            role={error ? "alert" : undefined}
            className={errorText}
          >
            {message}
          </span>
        ) : null}
      </div>
    </div>
  );
}

const GRID =
  "fhint:grid fhint:grid-cols-[repeat(auto-fit,minmax(min(100%,300px),1fr))] fhint:gap-3";

/**
 * Links to the business elsewhere.
 *
 * The design also lists booking and ordering links, a texting number,
 * WhatsApp and some twenty directories. Nothing stores those yet, so they
 * are not drawn: a field that is typed into and then forgotten on save is
 * the worst kind of missing feature.
 */
export function SocialSection({ model, onChange, errors, social }) {
  const [showJson, setShowJson] = useState(false);

  const networks = [
    ...ORDER.filter((network) => network in model),
    ...Object.keys(model).filter((network) => !ORDER.includes(network)),
  ];
  const onGoogle = networks.filter(
    (network) => NETWORKS[network]?.google !== false,
  );
  const elsewhere = networks.filter(
    (network) => NETWORKS[network]?.google === false,
  );

  const sameAs = networks
    .map((network) => String(model[network] ?? "").trim())
    .filter((url) => linkState(url) === "ok");

  const card = (network) => (
    <LinkCard
      key={network}
      network={network}
      value={model[network] ?? ""}
      error={errors?.[`social_profiles.${network}`]}
      onChange={(value) => onChange({ ...model, [network]: value })}
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

// How many working links a model holds — the section's badge.
export function workingLinks(model) {
  return Object.values(model ?? {}).filter((url) => linkState(url) === "ok")
    .length;
}

export default SocialSection;
