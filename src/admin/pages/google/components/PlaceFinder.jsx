import { useId, useState } from "react";
import { __, _n, sprintf } from "@wordpress/i18n";
import {
  CheckIcon,
  CircleAlertIcon,
  CircleMinusIcon,
  ExternalLinkIcon,
  MinusIcon,
  SearchIcon,
} from "lucide-react";
import { Link } from "react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import RequestError from "@/components/RequestError";
import SectionCard from "@/components/SectionCard";
import {
  useDeletePlacesKeyMutation,
  useGetPlacesQuery,
  useLinkPlaceMutation,
  useReadPlaceLiveMutation,
  useSavePlacesKeyMutation,
  useSearchPlacesMutation,
  useUnlinkPlaceMutation,
} from "@/store/api/placesApi";

/**
 * Finding the business on Google Maps, without signing in to Google.
 *
 * The Places API reads what anyone can see on Google Maps, so all it needs
 * is an API key. It is the short path to "is Google showing my business
 * correctly?" — and **only** that: Google's terms forbid keeping what it
 * returns, beyond the place id and, for 30 days, coordinates. So this
 * section compares and points; it never copies Google's values into the
 * business record, and there is deliberately no button that would.
 *
 * Every Google value on screen sits above the "Google Maps" attribution,
 * inside the same card, which is where Google's attribution rules put it.
 */

const CLOUD_LIBRARY_URL =
  "https://console.cloud.google.com/apis/library/places.googleapis.com";
const CLOUD_CREDENTIALS_URL =
  "https://console.cloud.google.com/apis/credentials";

/**
 * Google's required text attribution.
 *
 * Their rules, kept exactly: the words "Google Maps", never translated or
 * re-cased, never wrapped; Roboto or the product's own sans-serif; weight
 * 400; 12-16px; white, #1F1F1F or #5E5E5E only. That is why the string is
 * not passed through `__()` — translating it would break the rule it exists
 * to satisfy.
 */
function GoogleMapsAttribution() {
  return (
    <span
      translate="no"
      style={{ fontFamily: "Roboto, ui-sans-serif, system-ui, sans-serif" }}
      className="fhint:text-[12px] fhint:font-normal fhint:whitespace-nowrap fhint:text-google-attribution"
    >
      Google Maps
    </span>
  );
}

/** The one-line truth about what this section keeps. */
function StorageNote() {
  return (
    <div className="fhint:flex fhint:flex-wrap fhint:items-center fhint:justify-between fhint:gap-2 fhint:border-t fhint:border-border fhint:pt-3 fhint:text-[12px] fhint:text-muted-strong">
      <span>
        {__(
          "Shown live from Google and not saved. FoundHint keeps only the place ID, and the map position for up to 30 days.",
          "found-hint",
        )}
      </span>
      <GoogleMapsAttribution />
    </div>
  );
}

function KeyForm({ isReplacing, onDone }) {
  const inputId = useId();
  const [apiKey, setApiKey] = useState("");
  const [save, { isLoading, error }] = useSavePlacesKeyMutation();

  const onSubmit = async (event) => {
    event.preventDefault();

    try {
      await save({ api_key: apiKey }).unwrap();
      setApiKey("");
      toast.success(__("API key saved.", "found-hint"));
      onDone?.();
    } catch {
      // Shown inline.
    }
  };

  return (
    <form onSubmit={onSubmit}>
      <RequestError error={error} />
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor={inputId}>
            {__("Google Maps Platform API key", "found-hint")}
          </FieldLabel>
          {/* A password field: a Maps key is a bearer credential, and a
              screen share or a shoulder is enough to leak one. */}
          <Input
            id={inputId}
            type="password"
            autoComplete="off"
            spellCheck={false}
            value={apiKey}
            onChange={(event) => setApiKey(event.target.value)}
            placeholder="AIza…"
          />
          <FieldDescription>
            {__(
              "Enable the Places API (New) in a Google Cloud project with billing turned on, then create an API key. Restrict it to the Places API, and to this server's IP address if you can — a website restriction will block it.",
              "found-hint",
            )}
          </FieldDescription>
        </Field>
      </FieldGroup>

      <div className="fhint:mt-4 fhint:flex fhint:flex-wrap fhint:items-center fhint:gap-2">
        <Button type="submit" disabled={isLoading || "" === apiKey.trim()}>
          {isLoading ? <Spinner data-icon="inline-start" /> : null}
          {__("Save key", "found-hint")}
        </Button>
        {isReplacing ? (
          <Button type="button" variant="outline" onClick={onDone}>
            {__("Cancel", "found-hint")}
          </Button>
        ) : null}
        <Button
          variant="ghost"
          render={
            <a
              href={CLOUD_LIBRARY_URL}
              target="_blank"
              rel="noreferrer noopener"
            />
          }
        >
          <ExternalLinkIcon data-icon="inline-start" />
          {__("Enable the Places API", "found-hint")}
        </Button>
        <Button
          variant="ghost"
          render={
            <a
              href={CLOUD_CREDENTIALS_URL}
              target="_blank"
              rel="noreferrer noopener"
            />
          }
        >
          <ExternalLinkIcon data-icon="inline-start" />
          {__("Create a key", "found-hint")}
        </Button>
      </div>
    </form>
  );
}

function KeyLine({ hint, onReplace }) {
  const [remove, { isLoading }] = useDeletePlacesKeyMutation();

  return (
    <div className="fhint:flex fhint:flex-wrap fhint:items-center fhint:gap-2 fhint:text-[13px]">
      <span className="fhint:text-muted-strong">
        {__("API key", "found-hint")}
      </span>
      <code className="fhint:bg-muted fhint:px-2 fhint:py-0.5 fhint:text-[12.5px]">
        {hint}
      </code>
      <Button type="button" variant="link" size="sm" onClick={onReplace}>
        {__("Replace", "found-hint")}
      </Button>
      <Button
        type="button"
        variant="link"
        size="sm"
        disabled={isLoading}
        onClick={async () => {
          try {
            await remove().unwrap();
            toast.success(__("API key removed.", "found-hint"));
          } catch {
            toast.error(__("Could not remove the key.", "found-hint"));
          }
        }}
      >
        {__("Remove", "found-hint")}
      </Button>
    </div>
  );
}

function PlaceSearch({ onCancel }) {
  const inputId = useId();
  const [query, setQuery] = useState("");
  const [search, { data, isLoading, error, reset }] = useSearchPlacesMutation();
  const [link, { isLoading: isLinking, error: linkError }] =
    useLinkPlaceMutation();
  const [linkingId, setLinkingId] = useState("");

  const onSubmit = async (event) => {
    event.preventDefault();

    try {
      await search({ query }).unwrap();
    } catch {
      // Shown inline.
    }
  };

  const onChoose = async (placeId) => {
    setLinkingId(placeId);

    try {
      await link({ place_id: placeId }).unwrap();
      reset();
      toast.success(__("Linked to your place on Google.", "found-hint"));
    } catch {
      // Shown inline.
    } finally {
      setLinkingId("");
    }
  };

  const candidates = data?.candidates ?? [];

  return (
    <div className="fhint:flex fhint:flex-col fhint:gap-4">
      <form onSubmit={onSubmit}>
        <Field>
          <FieldLabel htmlFor={inputId}>
            {__("Search Google Maps for your business", "found-hint")}
          </FieldLabel>
          <div className="fhint:flex fhint:flex-wrap fhint:gap-2">
            <Input
              id={inputId}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={__("Business name and town", "found-hint")}
              className="fhint:min-w-0 fhint:flex-1 fhint:basis-60"
            />
            <Button type="submit" disabled={isLoading || "" === query.trim()}>
              {isLoading ? (
                <Spinner data-icon="inline-start" />
              ) : (
                <SearchIcon data-icon="inline-start" />
              )}
              {__("Search", "found-hint")}
            </Button>
            {onCancel ? (
              <Button type="button" variant="outline" onClick={onCancel}>
                {__("Cancel", "found-hint")}
              </Button>
            ) : null}
          </div>
          <FieldDescription>
            {__(
              "The name and town you would type into Google Maps. If a chain has several branches, include the street.",
              "found-hint",
            )}
          </FieldDescription>
        </Field>
      </form>

      <RequestError error={error ?? linkError} />

      {/* Announced, so a screen-reader user hears that the search finished
          and how many results it found without hunting for the list. */}
      <p role="status" className="fhint:sr-only">
        {data
          ? sprintf(
              /* translators: %d: number of places found. */
              _n(
                "%d place found.",
                "%d places found.",
                candidates.length,
                "found-hint",
              ),
              candidates.length,
            )
          : ""}
      </p>

      {data && candidates.length === 0 ? (
        <p className="fhint:text-[13px] fhint:text-muted-strong">
          {__(
            "Google found nothing for that. Try the name exactly as it appears on Google Maps, with the town.",
            "found-hint",
          )}
        </p>
      ) : null}

      {candidates.length > 0 ? (
        <div className="fhint:flex fhint:flex-col fhint:gap-3">
          <ul className="fhint:m-0 fhint:flex fhint:list-none fhint:flex-col fhint:gap-2 fhint:p-0">
            {candidates.map((candidate, index) => (
              <li
                key={candidate.place_id}
                className="fhint:flex fhint:flex-wrap fhint:items-center fhint:gap-3 fhint:border fhint:border-border fhint:px-4 fhint:py-3"
              >
                {/* Every button reads "This is my business", so each is
                    described by its own place — otherwise a screen reader
                    announces the same words once per result. */}
                <div
                  id={`${inputId}-candidate-${index}`}
                  className="fhint:min-w-0 fhint:flex-1"
                >
                  <div className="fhint:text-[13.5px] fhint:font-bold">
                    {candidate.name}
                  </div>
                  <div className="fhint:text-[12.5px] fhint:text-muted-strong">
                    {candidate.address}
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  disabled={isLinking}
                  aria-describedby={`${inputId}-candidate-${index}`}
                  onClick={() => onChoose(candidate.place_id)}
                >
                  {linkingId === candidate.place_id ? (
                    <Spinner data-icon="inline-start" />
                  ) : null}
                  {__("This is my business", "found-hint")}
                </Button>
              </li>
            ))}
          </ul>
          <StorageNote />
        </div>
      ) : null}
    </div>
  );
}

/** Words for a comparison status, paired with an icon — never colour alone. */
function statusLabel(status) {
  switch (status) {
    case "match":
      return __("Matches", "found-hint");
    case "differs":
      return __("Different", "found-hint");
    case "missing_here":
      return __("Missing here", "found-hint");
    case "missing_there":
      return __("Not on Google", "found-hint");
    default:
      return __("Not set", "found-hint");
  }
}

function StatusCell({ status }) {
  // Attention uses the notice text colour, not the score band's amber: the
  // amber measured 4.24:1 on a white card at this size, under the 4.5:1
  // WCAG AA asks of 14px text.
  const tone =
    "match" === status
      ? "fhint:text-success"
      : "differs" === status || "missing_here" === status
        ? "fhint:text-notice-foreground"
        : "fhint:text-muted-strong";

  const Icon =
    "match" === status
      ? CheckIcon
      : "differs" === status || "missing_here" === status
        ? CircleAlertIcon
        : "missing_there" === status
          ? CircleMinusIcon
          : MinusIcon;

  return (
    <span
      className={`fhint:inline-flex fhint:items-center fhint:gap-1.5 fhint:font-bold ${tone}`}
    >
      <Icon aria-hidden="true" className="fhint:size-3.5" />
      {statusLabel(status)}
    </span>
  );
}

function fieldLabel(key) {
  switch (key) {
    case "name":
      return __("Business name", "found-hint");
    case "address":
      return __("Address", "found-hint");
    case "phone":
      return __("Phone", "found-hint");
    case "website":
      return __("Website", "found-hint");
    default:
      return key;
  }
}

/** A day's periods as words: "09:00–17:00, 18:00–22:00", "Closed", … */
function formatPeriods(periods) {
  if (!periods || periods.length === 0) {
    return "—";
  }

  if (periods.some((period) => period.is_closed)) {
    return __("Closed", "found-hint");
  }

  if (periods.some((period) => period.is_24h)) {
    return __("Open 24 hours", "found-hint");
  }

  return periods
    .map((period) => `${period.open_time}–${period.close_time}`)
    .join(", ");
}

function Value({ children }) {
  return children ? (
    <span className="fhint:break-words">{children}</span>
  ) : (
    <span className="fhint:text-muted-strong">—</span>
  );
}

function LiveComparison({ live }) {
  const { comparison, place } = live;
  const attention = comparison.summary.attention;

  return (
    <div className="fhint:flex fhint:flex-col fhint:gap-4">
      <p
        role="status"
        className="fhint:m-0 fhint:text-[14px] fhint:font-extrabold"
      >
        {attention === 0
          ? __("Google shows the same details as your website.", "found-hint")
          : sprintf(
              /* translators: %d: number of details that differ. */
              _n(
                "%d detail needs a look.",
                "%d details need a look.",
                attention,
                "found-hint",
              ),
              attention,
            )}
      </p>

      <div className="fhint:overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{__("Detail", "found-hint")}</TableHead>
              <TableHead>{__("On your website", "found-hint")}</TableHead>
              <TableHead>{__("On Google", "found-hint")}</TableHead>
              <TableHead>{__("Status", "found-hint")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {comparison.fields.map((field) => (
              <TableRow key={field.key}>
                <TableCell className="fhint:font-bold">
                  {fieldLabel(field.key)}
                </TableCell>
                <TableCell className="fhint:whitespace-normal">
                  <Value>{field.ours}</Value>
                </TableCell>
                <TableCell className="fhint:whitespace-normal">
                  <Value>{field.theirs}</Value>
                </TableCell>
                <TableCell>
                  <StatusCell status={field.status} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="fhint:overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{__("Opening hours", "found-hint")}</TableHead>
              <TableHead>{__("On your website", "found-hint")}</TableHead>
              <TableHead>{__("On Google", "found-hint")}</TableHead>
              <TableHead>{__("Status", "found-hint")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {comparison.hours.days.map((day) => (
              <TableRow key={day.day_of_week}>
                <TableCell className="fhint:font-bold">
                  {day.day_name}
                </TableCell>
                <TableCell>{formatPeriods(day.ours)}</TableCell>
                <TableCell>{formatPeriods(day.theirs)}</TableCell>
                <TableCell>
                  <StatusCell status={day.status} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {attention > 0 ? (
        <p className="fhint:m-0 fhint:text-[13px] fhint:text-muted-strong">
          {__(
            "Where your website is right, update Google in your Business Profile. Where Google is right, update your details here — FoundHint will not copy them across for you.",
            "found-hint",
          )}{" "}
          <Link
            to="/business"
            className="fhint:font-extrabold fhint:text-link-accent fhint:no-underline fhint:hover:underline"
          >
            {__("Edit your business details", "found-hint")}
          </Link>
        </p>
      ) : null}

      {place.maps_url ? (
        <div>
          <Button
            variant="outline"
            render={
              <a
                href={place.maps_url}
                target="_blank"
                rel="noreferrer noopener"
              />
            }
          >
            <ExternalLinkIcon data-icon="inline-start" />
            {__("Open on Google Maps", "found-hint")}
          </Button>
        </div>
      ) : null}

      <StorageNote />
    </div>
  );
}

function formatDate(value) {
  if (!value) {
    return "";
  }

  const parsed = new Date(`${value.replace(" ", "T")}Z`);

  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString();
}

function LinkedPlace({ link }) {
  const [readLive, { data: live, isLoading, error }] =
    useReadPlaceLiveMutation();
  const [unlink, { isLoading: isUnlinking }] = useUnlinkPlaceMutation();
  const [choosing, setChoosing] = useState(false);

  if (choosing) {
    return <PlaceSearch onCancel={() => setChoosing(false)} />;
  }

  return (
    <div className="fhint:flex fhint:flex-col fhint:gap-4">
      <div className="fhint:grid fhint:gap-[9px] fhint:text-[13px]">
        <div className="fhint:flex fhint:flex-wrap fhint:gap-x-2.5 fhint:gap-y-0.5">
          <span className="fhint:w-[140px] fhint:shrink-0 fhint:text-muted-foreground">
            {__("Place ID", "found-hint")}
          </span>
          <code className="fhint:min-w-0 fhint:text-[12.5px] fhint:break-all">
            {link.place_id}
          </code>
        </div>
        <div className="fhint:flex fhint:flex-wrap fhint:gap-x-2.5 fhint:gap-y-0.5">
          <span className="fhint:w-[140px] fhint:shrink-0 fhint:text-muted-foreground">
            {__("Linked", "found-hint")}
          </span>
          <strong>{formatDate(link.linked_at)}</strong>
        </div>
        <div className="fhint:flex fhint:flex-wrap fhint:gap-x-2.5 fhint:gap-y-0.5">
          <span className="fhint:w-[140px] fhint:shrink-0 fhint:text-muted-foreground">
            {__("Map position", "found-hint")}
          </span>
          <strong>
            {link.has_coordinates
              ? sprintf(
                  /* translators: %d: days until the stored map position is deleted. */
                  _n(
                    "Kept for %d more day",
                    "Kept for %d more days",
                    link.coordinates_expire_in_days,
                    "found-hint",
                  ),
                  link.coordinates_expire_in_days,
                )
              : __("Not held — read again when needed", "found-hint")}
          </strong>
        </div>
      </div>

      <div className="fhint:flex fhint:flex-wrap fhint:gap-2">
        <Button type="button" onClick={() => readLive()} disabled={isLoading}>
          {isLoading ? <Spinner data-icon="inline-start" /> : null}
          {live
            ? __("Check again", "found-hint")
            : __("Compare with Google", "found-hint")}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => setChoosing(true)}
        >
          {__("Choose a different place", "found-hint")}
        </Button>
        <Button
          type="button"
          variant="ghost"
          disabled={isUnlinking}
          onClick={async () => {
            try {
              await unlink().unwrap();
              toast.success(__("Unlinked.", "found-hint"));
            } catch {
              toast.error(__("Could not unlink.", "found-hint"));
            }
          }}
        >
          {__("Unlink", "found-hint")}
        </Button>
      </div>

      <RequestError error={error} />

      {live ? <LiveComparison live={live} /> : null}
    </div>
  );
}

export function PlaceFinder() {
  const { data: state, isLoading, error } = useGetPlacesQuery();
  const [replacingKey, setReplacingKey] = useState(false);

  let body;

  if (isLoading) {
    body = <Spinner />;
  } else if (error || !state) {
    body = <RequestError error={error} />;
  } else if (!state.configured || replacingKey) {
    body = (
      <KeyForm
        isReplacing={state.configured}
        onDone={() => setReplacingKey(false)}
      />
    );
  } else {
    body = (
      <div className="fhint:flex fhint:flex-col fhint:gap-5">
        <KeyLine
          hint={state.key_hint}
          onReplace={() => setReplacingKey(true)}
        />
        {!state.has_location ? (
          <p className="fhint:m-0 fhint:text-[13px] fhint:text-muted-strong">
            {__(
              "Add your business address first, so there is a location to link.",
              "found-hint",
            )}{" "}
            <Link
              to="/business"
              className="fhint:font-extrabold fhint:text-link-accent fhint:no-underline fhint:hover:underline"
            >
              {__("Add your details", "found-hint")}
            </Link>
          </p>
        ) : state.link ? (
          <LinkedPlace link={state.link} />
        ) : (
          <PlaceSearch />
        )}
      </div>
    );
  }

  return (
    <SectionCard
      id="google-places"
      title={__("Find your business on Google", "found-hint")}
      description={__(
        "No Google sign-in needed. Find your listing on Google Maps and see whether it matches your details here.",
        "found-hint",
      )}
    >
      {body}
    </SectionCard>
  );
}

export default PlaceFinder;
