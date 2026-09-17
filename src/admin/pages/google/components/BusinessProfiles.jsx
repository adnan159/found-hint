import { __, _n, sprintf } from "@wordpress/i18n";
import { RefreshCwIcon } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyTitle } from "@/components/ui/empty";
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
import { useSyncGoogleProfilesMutation } from "@/store/api/googleApi";

/**
 * What Google says about the places this account manages.
 *
 * Read from the stored copy, never live: reading Google costs a request
 * against a quota the operator owns, so it happens when they ask for it and
 * not on every visit to the screen. The "last read" stamp is shown for the
 * same reason — a cached list without a date is indistinguishable from a
 * current one.
 */
const VERIFICATION_LABELS = {
  OK: () => __("Ready", "found-hint"),
  PENDING_EDITS: () => __("Pending edits", "found-hint"),
  LIMITED: () => __("Limited", "found-hint"),
};

/**
 * "Read 3 locations across 1 account." — both halves counted separately,
 * because a single format string cannot pluralise two numbers at once and
 * "1 accounts" is the kind of thing that makes a product look unfinished.
 *
 * @param {{locations: number, accounts: number}} counts What the sync found.
 * @return {string} A sentence.
 */
function summarise(counts) {
  const locations = counts.locations ?? 0;
  const accounts = counts.accounts ?? 0;

  return sprintf(
    /* translators: 1: e.g. "3 locations", 2: e.g. "1 account". */
    __("Read %1$s across %2$s.", "found-hint"),
    sprintf(
      /* translators: %d: number of Google locations. */
      _n("%d location", "%d locations", locations, "found-hint"),
      locations,
    ),
    sprintf(
      /* translators: %d: number of Google accounts. */
      _n("%d account", "%d accounts", accounts, "found-hint"),
      accounts,
    ),
  );
}

function formatSyncedAt(value) {
  if (!value) {
    return "";
  }

  // Stored as a UTC MySQL datetime.
  const parsed = new Date(`${value.replace(" ", "T")}Z`);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString();
}

export function BusinessProfiles({ overview, isConnected }) {
  const [sync, { isLoading: isSyncing, error }] =
    useSyncGoogleProfilesMutation();

  const locations = overview?.google_locations ?? [];
  const syncedAt = formatSyncedAt(overview?.synced_at);

  const onSync = async () => {
    try {
      const result = await sync().unwrap();
      const counts = result?.counts;

      toast.success(
        counts
          ? summarise(counts)
          : __("Read your Google profiles.", "found-hint"),
      );
    } catch {
      // Shown inline by RequestError — Google's refusals are specific
      // enough to be worth reading in full.
    }
  };

  return (
    <SectionCard
      id="google-profiles"
      title={__("Business profiles", "found-hint")}
      description={
        syncedAt
          ? sprintf(
              /* translators: %s: date and time Google was last read. */
              __("What Google last told us, read %s.", "found-hint"),
              syncedAt,
            )
          : __("The places this Google account manages.", "found-hint")
      }
      action={
        <Button
          type="button"
          variant="outline"
          onClick={onSync}
          disabled={!isConnected || isSyncing}
        >
          {isSyncing ? (
            <Spinner data-icon="inline-start" />
          ) : (
            <RefreshCwIcon data-icon="inline-start" />
          )}
          {__("Read from Google", "found-hint")}
        </Button>
      }
    >
      <RequestError error={error} />

      {locations.length === 0 ? (
        <Empty>
          <EmptyTitle>{__("Nothing read yet", "found-hint")}</EmptyTitle>
          <EmptyDescription>
            {isConnected
              ? __(
                  "Read from Google to list the places this account manages. Google has to have approved your Cloud project for the Business Profile APIs before anything comes back.",
                  "found-hint",
                )
              : __("Connect a Google account first.", "found-hint")}
          </EmptyDescription>
        </Empty>
      ) : (
        <div className="fhint:overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{__("Profile", "found-hint")}</TableHead>
                <TableHead>{__("Address", "found-hint")}</TableHead>
                <TableHead>{__("Phone", "found-hint")}</TableHead>
                <TableHead>{__("State", "found-hint")}</TableHead>
                <TableHead>{__("Mapped to", "found-hint")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {locations.map((location) => {
                const mapped = overview.locations.find(
                  (ours) => ours.mapped_to === location.location_name,
                );

                return (
                  <TableRow key={location.location_name}>
                    <TableCell>
                      <span className="fhint:font-bold">
                        {location.title || location.location_name}
                      </span>
                      {location.store_code ? (
                        <span className="fhint:block fhint:text-[12px] fhint:text-muted-foreground">
                          {location.store_code}
                        </span>
                      ) : null}
                    </TableCell>
                    <TableCell className="fhint:text-muted-strong">
                      {location.address || "—"}
                    </TableCell>
                    <TableCell className="fhint:text-muted-strong">
                      {location.phone || "—"}
                    </TableCell>
                    <TableCell>
                      {location.verification_state ? (
                        <Badge
                          variant={
                            location.verification_state === "OK"
                              ? "secondary"
                              : "outline"
                          }
                        >
                          {VERIFICATION_LABELS[location.verification_state]
                            ? VERIFICATION_LABELS[location.verification_state]()
                            : location.verification_state}
                        </Badge>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="fhint:text-muted-strong">
                      {mapped ? mapped.name : __("Not mapped", "found-hint")}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </SectionCard>
  );
}

export default BusinessProfiles;
