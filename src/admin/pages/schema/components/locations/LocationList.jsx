import { useState } from "react";
import { __, _n, sprintf } from "@wordpress/i18n";
import {
  EllipsisIcon,
  ExternalLinkIcon,
  MapPinIcon,
  PlusIcon,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "cn";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { errorMessage } from "@/lib/errors";
import { focusRing as focus } from "@/lib/fieldStyles";
import { useRefreshFromGoogleMutation } from "@/store/api/profileApi";
import {
  useFoundLocationsMutation,
  useSaveLocationSchemaMutation,
  useSetLocationRoleMutation,
} from "@/store/api/schemaManagerApi";
import { relative } from "../../lib/schema";
import {
  BADGE,
  DOTS,
  ROLES,
  STATUSES,
  TONES,
  issueText,
  issuesTone,
  rosterSummary,
} from "../../lib/locations";
import LocationSetup from "./LocationSetup";
import SeparatePanel from "./SeparatePanel";

// The design's columns: location, role, page, output, warnings, actions.
const COLUMNS =
  "fhint:grid fhint:min-w-[920px] fhint:grid-cols-[minmax(0,2.3fr)_100px_minmax(0,1.5fr)_140px_minmax(0,1.3fr)_250px] fhint:gap-3.5";
const TEXT_LINK = cn(
  "fhint:cursor-pointer fhint:border-0 fhint:bg-transparent fhint:px-1 fhint:py-1.5 fhint:text-[13px] fhint:font-bold fhint:text-[#D8521F]",
  focus,
);
const BOX_BUTTON = cn(
  "fhint:cursor-pointer fhint:border fhint:border-[#d7d3d3] fhint:bg-white fhint:px-[11px] fhint:py-1.5 fhint:text-[12.5px] fhint:font-bold fhint:whitespace-nowrap fhint:text-[#201e1d] fhint:hover:bg-[#f8f4f4]",
  focus,
);
const PILL_BUTTON = cn(
  "fhint:inline-flex fhint:cursor-pointer fhint:items-center fhint:gap-[7px] fhint:rounded-full fhint:border fhint:border-[#d7d3d3] fhint:bg-white fhint:px-[15px] fhint:py-2 fhint:text-[13px] fhint:font-bold fhint:text-[#201e1d] fhint:hover:bg-[#f8f4f4] fhint:disabled:opacity-60",
  focus,
);
const ORANGE = cn(
  "fhint:inline-flex fhint:cursor-pointer fhint:items-center fhint:gap-[7px] fhint:border-0 fhint:bg-[#FF6B35] fhint:px-[15px] fhint:py-[9px] fhint:text-[13px] fhint:font-bold fhint:text-white fhint:hover:bg-[#E85A25] fhint:disabled:opacity-60",
  focus,
);

function Badge({ tone, dot, children }) {
  return (
    <span className={cn(BADGE, TONES[tone])}>
      {dot ? (
        <span
          aria-hidden="true"
          className={cn(
            "fhint:size-[7px] fhint:rounded-full",
            DOTS[tone] ?? DOTS.quiet,
          )}
        />
      ) : null}
      {children}
    </span>
  );
}

/**
 * 03 Locations — the list (design B): every Google profile with its role,
 * its page, whether it is published, and what to check. Branches open in
 * the editor; the main business is edited in 02; a separate business has
 * its own website, so its schema is copied there.
 *
 * @param {Object}   props
 * @param {Object}   props.roster     `GET schema/locations/roster`.
 * @param {string}   props.syncedAt   When Google was last read (UTC).
 * @param {Function} props.onEdit     Open a branch in the editor.
 * @param {Function} props.onOpenMain Open 02 Main business.
 */
export function LocationList({ roster, syncedAt, onEdit, onOpenMain }) {
  const [setupOpen, setSetupOpen] = useState(false);
  const [separateId, setSeparateId] = useState(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [found, foundState] = useFoundLocationsMutation();
  const [setRole] = useSetLocationRoleMutation();
  const [saveBranch] = useSaveLocationSchemaMutation();
  const [refresh, refreshState] = useRefreshFromGoogleMutation();

  const rows = roster.rows ?? [];
  const single = roster.profiles <= 1;
  const separate = rows.find(
    (row) => row.id === separateId && row.role === "separate",
  );
  const syncLine = syncedAt
    ? sprintf(
        /* translators: %s: e.g. "2 days ago". */
        __("Synced from Google %s", "foundhint-local-seo"),
        relative(syncedAt),
      )
    : __("Not synced from Google yet", "foundhint-local-seo");

  const run = async (promise, done) => {
    try {
      await promise;
      if (done) {
        toast.success(done);
      }
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  const refreshAll = () =>
    run(
      refresh({ locationId: 0 }).unwrap(),
      __("Refreshed from Google.", "foundhint-local-seo"),
    );

  const foundNames = (roster.found ?? []).map((item) => item.name);
  const foundSeparate = (roster.found ?? []).some(
    (item) => item.suggest === "separate",
  );

  // "Open" on a separate business: its own view, like a branch's editor —
  // details and actions on the left, its schema in the preview beside them.
  if (separate) {
    return (
      <SeparatePanel
        row={separate}
        onBack={() => setSeparateId(null)}
        onTreatAsBranch={() =>
          run(
            setRole({ id: separate.id, role: "branch" }).unwrap(),
            sprintf(
              /* translators: %s: a location. */
              __(
                "%s is a branch now. Give it a page to publish.",
                "foundhint-local-seo",
              ),
              separate.name,
            ),
          ).then(() => setSeparateId(null))
        }
      />
    );
  }

  return (
    <div className="fhint:grid fhint:min-w-0 fhint:grid-cols-[minmax(0,1fr)] fhint:gap-4">
      <section className="fhint:flex fhint:flex-wrap fhint:items-center fhint:gap-3.5 fhint:border fhint:border-[#e6e3e3] fhint:bg-white fhint:px-5 fhint:py-3.5">
        <span
          aria-hidden="true"
          className="fhint:grid fhint:size-[34px] fhint:shrink-0 fhint:place-items-center fhint:bg-[#FFF1EB] fhint:text-[#D8521F]"
        >
          <MapPinIcon className="fhint:size-[18px]" />
        </span>
        <span className="fhint:grid fhint:min-w-0 fhint:flex-[1_1_360px] fhint:gap-0.5">
          <h2 className="fhint:m-0 fhint:text-[15px] fhint:font-bold">
            {rosterSummary(roster)}
          </h2>
          <span className="fhint:text-[12.5px] fhint:text-[#625e5e]">
            {syncLine}
          </span>
        </span>
        {single ? null : (
          <button
            type="button"
            onClick={() => setSetupOpen(true)}
            className={cn(TEXT_LINK, "fhint:px-0")}
          >
            {__("Run location setup", "foundhint-local-seo")}
          </button>
        )}
        <button
          type="button"
          onClick={refreshAll}
          disabled={refreshState.isLoading}
          className={PILL_BUTTON}
        >
          {refreshState.isLoading
            ? __("Refreshing…", "foundhint-local-seo")
            : __("Refresh from Google", "foundhint-local-seo")}
        </button>
      </section>

      {foundNames.length ? (
        <div
          role="status"
          className="fhint:flex fhint:flex-wrap fhint:items-center fhint:gap-3.5 fhint:border fhint:border-[#FFC9AF] fhint:bg-[#FFF8F4] fhint:px-5 fhint:py-3.5 fhint:shadow-[inset_3px_0_0_#FF6B35]"
        >
          <span className="fhint:grid fhint:min-w-0 fhint:flex-[1_1_420px] fhint:gap-0.5">
            <strong className="fhint:text-[14.5px]">
              {sprintf(
                /* translators: %d: profiles found. */
                _n(
                  "%d more Google profile found",
                  "%d more Google profiles found",
                  foundNames.length,
                  "foundhint-local-seo",
                ),
                foundNames.length,
              )}
            </strong>
            <span className="fhint:text-[13px] fhint:leading-normal fhint:text-[#444141]">
              {foundSeparate
                ? sprintf(
                    /* translators: %s: profile names. */
                    __(
                      "%s. One has a website on another domain, so it may be a separate business — run location setup to choose, or generate branch schema for all of them.",
                      "foundhint-local-seo",
                    ),
                    foundNames.join(", "),
                  )
                : sprintf(
                    /* translators: %s: profile names. */
                    __(
                      "%s. Same website as yours, so FoundHint suggests making them branches.",
                      "foundhint-local-seo",
                    ),
                    foundNames.join(" and "),
                  )}
            </span>
          </span>
          <button
            type="button"
            disabled={foundState.isLoading}
            onClick={() =>
              run(
                found("dismiss").unwrap(),
                __(
                  "Hidden. They'll show again when another profile is found.",
                  "foundhint-local-seo",
                ),
              )
            }
            className={cn(
              TEXT_LINK,
              "fhint:px-1.5 fhint:py-2 fhint:text-[#625e5e]",
            )}
          >
            {__("Not now", "foundhint-local-seo")}
          </button>
          <button
            type="button"
            disabled={foundState.isLoading}
            onClick={async () => {
              try {
                const result = await found("generate").unwrap();

                toast.success(
                  sprintf(
                    /* translators: %d: branches generated. */
                    _n(
                      "Branch schema generated for %d location. Give it a page to publish.",
                      "Branch schema generated for %d locations. Give each one a page to publish.",
                      result.generated,
                      "foundhint-local-seo",
                    ),
                    result.generated,
                  ),
                );
              } catch (error) {
                toast.error(errorMessage(error));
              }
            }}
            className={ORANGE}
          >
            <PlusIcon aria-hidden="true" className="fhint:size-4" />
            {__("Generate branch schema", "foundhint-local-seo")}
          </button>
        </div>
      ) : null}

      {single ? (
        <section className="fhint:grid fhint:justify-items-start fhint:gap-3.5 fhint:border fhint:border-[#e6e3e3] fhint:bg-white fhint:px-8 fhint:py-9">
          <span
            aria-hidden="true"
            className="fhint:grid fhint:size-11 fhint:place-items-center fhint:bg-[#FFF1EB] fhint:text-[#D8521F]"
          >
            <MapPinIcon className="fhint:size-5" />
          </span>
          <h2 className="fhint:m-0 fhint:text-[19px] fhint:leading-snug fhint:font-bold">
            {__(
              "You have one location. Your main business schema covers it.",
              "foundhint-local-seo",
            )}
          </h2>
          <p className="fhint:m-0 fhint:max-w-[640px] fhint:text-[13.5px] fhint:leading-relaxed fhint:text-[#444141]">
            {sprintf(
              /* translators: %s: the main business. */
              __(
                "%s is described in 02 LocalBusiness schema. When you add another location to your Google Business Profile, FoundHint finds it here and creates branch schema linked to your business.",
                "foundhint-local-seo",
              ),
              rows[0]?.name ?? __("Your business", "foundhint-local-seo"),
            )}
          </p>
          <div className="fhint:flex fhint:flex-wrap fhint:gap-2.5">
            <button
              type="button"
              aria-expanded={helpOpen}
              onClick={() => setHelpOpen((open) => !open)}
              className={cn(
                "fhint:inline-flex fhint:cursor-pointer fhint:items-center fhint:gap-[7px] fhint:border fhint:border-[#201e1d] fhint:bg-white fhint:px-[15px] fhint:py-2 fhint:text-[13px] fhint:font-bold fhint:text-[#201e1d] fhint:hover:bg-[#f8f4f4]",
                focus,
              )}
            >
              <PlusIcon aria-hidden="true" className="fhint:size-4" />
              {helpOpen
                ? __("Hide steps", "foundhint-local-seo")
                : __("Add another location", "foundhint-local-seo")}
            </button>
            <button type="button" onClick={onOpenMain} className={TEXT_LINK}>
              {__("Open 02 LocalBusiness schema", "foundhint-local-seo")}
            </button>
          </div>
          {helpOpen ? (
            <div className="fhint:grid fhint:max-w-[640px] fhint:gap-2.5 fhint:border fhint:border-[#e6e3e3] fhint:bg-[#faf9f9] fhint:px-4 fhint:py-3.5">
              <span className="fhint:text-[13px] fhint:leading-relaxed">
                <strong>
                  {__(
                    "Add the location on Google first.",
                    "foundhint-local-seo",
                  )}
                </strong>{" "}
                {__(
                  "Create it in Google Business Profile with its own address and phone. FoundHint picks it up on the next refresh and suggests it as a branch.",
                  "foundhint-local-seo",
                )}
              </span>
              <span className="fhint:flex fhint:flex-wrap fhint:gap-2">
                <a
                  href="https://business.google.com/locations"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    "fhint:inline-flex fhint:items-center fhint:gap-[7px] fhint:bg-[#201e1d] fhint:px-3.5 fhint:py-2 fhint:text-[13px] fhint:font-bold fhint:text-white fhint:no-underline",
                    focus,
                  )}
                >
                  {__("Open Business Profile", "foundhint-local-seo")}
                  <ExternalLinkIcon
                    aria-hidden="true"
                    className="fhint:size-3.5"
                  />
                  <span className="fhint:sr-only">
                    {__("(opens in a new tab)", "foundhint-local-seo")}
                  </span>
                </a>
                <button
                  type="button"
                  disabled={refreshState.isLoading}
                  onClick={refreshAll}
                  className={PILL_BUTTON}
                >
                  {refreshState.isLoading
                    ? __("Refreshing…", "foundhint-local-seo")
                    : __("Refresh from Google", "foundhint-local-seo")}
                </button>
              </span>
            </div>
          ) : null}
        </section>
      ) : (
        <section
          role="table"
          aria-label={__("Locations", "foundhint-local-seo")}
          className="fhint:min-w-0 fhint:overflow-x-auto fhint:border fhint:border-[#e6e3e3] fhint:bg-white"
        >
          <div
            role="row"
            className={cn(
              COLUMNS,
              "fhint:border-b-2 fhint:border-b-[#201e1d] fhint:px-5 fhint:py-2.5 fhint:text-[11.5px] fhint:font-bold fhint:tracking-[0.06em] fhint:text-[#625e5e] fhint:uppercase",
            )}
          >
            <span role="columnheader">
              {__("Location", "foundhint-local-seo")}
            </span>
            <span role="columnheader">{__("Role", "foundhint-local-seo")}</span>
            <span role="columnheader">
              {__("Assigned page", "foundhint-local-seo")}
            </span>
            <span role="columnheader">
              {__("Output", "foundhint-local-seo")}
            </span>
            <span role="columnheader">
              {__("Warnings", "foundhint-local-seo")}
            </span>
            <span role="columnheader">
              {__("Actions", "foundhint-local-seo")}
            </span>
          </div>

          {rows.map((row) => {
            const isMain = row.role === "main";
            const isBranch = row.role === "branch";
            const isSeparate = row.role === "separate";
            const [roleText, roleTone] = ROLES[row.role] ?? ROLES.branch;
            const [statusText, statusTone] =
              STATUSES[row.status] ?? STATUSES.live;
            const paused = row.status === "paused";
            const blocked = row.issues.some((issue) => issue.level === "block");

            return (
              <div
                key={`${row.role}-${row.id}`}
                role="row"
                className={cn(
                  COLUMNS,
                  "fhint:items-center fhint:px-5 fhint:py-[13px]",
                  isMain
                    ? "fhint:border-b-2 fhint:border-b-[#201e1d] fhint:bg-[#faf9f9]"
                    : "fhint:border-b fhint:border-b-[#f0eeee]",
                  !isMain &&
                    (blocked ? "fhint:bg-[#FFFBFA]" : "fhint:bg-white"),
                )}
              >
                <span
                  role="cell"
                  className="fhint:grid fhint:min-w-0 fhint:gap-0.5"
                >
                  <strong className="fhint:text-[14px]">{row.name}</strong>
                  <span className="fhint:truncate fhint:text-[12.5px] fhint:text-[#625e5e]">
                    {row.address}
                  </span>
                  {isMain ? (
                    <span className="fhint:inline-flex fhint:items-center fhint:gap-[5px] fhint:text-[12px] fhint:font-bold fhint:text-[#D8521F]">
                      <MapPinIcon aria-hidden="true" className="fhint:size-3" />
                      {__(
                        "Main business — edit in tab 02",
                        "foundhint-local-seo",
                      )}
                    </span>
                  ) : null}
                </span>
                <span role="cell">
                  <Badge tone={roleTone}>{roleText()}</Badge>
                </span>
                <span role="cell" className="fhint:min-w-0">
                  {isSeparate ? (
                    <span className="fhint:grid fhint:gap-0.5">
                      <span className="fhint:truncate fhint:text-[12.5px] fhint:font-bold">
                        {row.domain}
                      </span>
                      <span className="fhint:text-[12px] fhint:text-[#625e5e]">
                        {__("Its own website", "foundhint-local-seo")}
                      </span>
                    </span>
                  ) : row.page ? (
                    <code className="fhint:inline-block fhint:max-w-full fhint:truncate fhint:bg-[#f3f2f2] fhint:px-[7px] fhint:py-0.5 fhint:align-middle fhint:font-mono fhint:text-[12px] fhint:text-[#201e1d]">
                      {row.page.path}
                    </code>
                  ) : isMain ? (
                    <code className="fhint:bg-[#f3f2f2] fhint:px-[7px] fhint:py-0.5 fhint:font-mono fhint:text-[12px] fhint:text-[#201e1d]">
                      {__("/ · home page", "foundhint-local-seo")}
                    </code>
                  ) : (
                    <span className="fhint:rounded-full fhint:bg-[#FBE9E6] fhint:px-2 fhint:py-0.5 fhint:text-[11.5px] fhint:font-bold fhint:text-[#C02718]">
                      {__("No page", "foundhint-local-seo")}
                    </span>
                  )}
                </span>
                <span role="cell">
                  <Badge tone={statusTone} dot>
                    {statusText()}
                  </Badge>
                </span>
                <span role="cell" className="fhint:min-w-0">
                  {row.issues.length ? (
                    <span className="fhint:grid fhint:justify-items-start fhint:gap-[3px]">
                      <Badge tone={issuesTone(row.issues)}>
                        {sprintf(
                          /* translators: %d: issues. */
                          _n(
                            "%d issue",
                            "%d issues",
                            row.issues.length,
                            "foundhint-local-seo",
                          ),
                          row.issues.length,
                        )}
                      </Badge>
                      <span className="fhint:text-[12px] fhint:leading-snug fhint:text-[#625e5e]">
                        {row.issues
                          .map((issue) => issueText(issue).short)
                          .join(" · ")}
                      </span>
                    </span>
                  ) : (
                    <span className="fhint:text-[12.5px] fhint:text-[#9b9797]">
                      {__("None", "foundhint-local-seo")}
                    </span>
                  )}
                </span>
                <span
                  role="cell"
                  className="fhint:flex fhint:items-center fhint:gap-2"
                >
                  {isBranch ? (
                    <>
                      <button
                        type="button"
                        onClick={() => onEdit(row.id)}
                        className={TEXT_LINK}
                      >
                        {__("Edit", "foundhint-local-seo")}
                      </button>
                      <button
                        type="button"
                        onClick={() => onEdit(row.id, "page")}
                        className={BOX_BUTTON}
                      >
                        {row.page
                          ? __("Change page", "foundhint-local-seo")
                          : __("Assign page", "foundhint-local-seo")}
                      </button>
                    </>
                  ) : null}
                  {isMain ? (
                    <button
                      type="button"
                      onClick={onOpenMain}
                      className={BOX_BUTTON}
                    >
                      {__("Open tab 02", "foundhint-local-seo")}
                    </button>
                  ) : null}
                  {isSeparate ? (
                    <button
                      type="button"
                      onClick={() => setSeparateId(row.id)}
                      className={TEXT_LINK}
                    >
                      {__("Open", "foundhint-local-seo")}
                    </button>
                  ) : null}
                  {isMain ? null : (
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        aria-label={sprintf(
                          /* translators: %s: a location. */
                          __("More actions for %s", "foundhint-local-seo"),
                          row.name,
                        )}
                        className={cn(
                          "fhint:grid fhint:size-[30px] fhint:cursor-pointer fhint:place-items-center fhint:border fhint:border-[#d7d3d3] fhint:bg-white fhint:p-0 fhint:text-[#201e1d] fhint:hover:bg-[#f8f4f4]",
                          focus,
                        )}
                      >
                        <EllipsisIcon
                          aria-hidden="true"
                          className="fhint:size-4"
                        />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {isBranch ? (
                          <DropdownMenuItem
                            onClick={() =>
                              run(
                                saveBranch({
                                  id: row.id,
                                  status: paused ? "active" : "inactive",
                                }).unwrap(),
                                paused
                                  ? sprintf(
                                      /* translators: %s: a location. */
                                      __(
                                        "%s is publishing again.",
                                        "foundhint-local-seo",
                                      ),
                                      row.name,
                                    )
                                  : sprintf(
                                      /* translators: %s: a location. */
                                      __(
                                        "%s is paused. Its schema is off your site until you resume it.",
                                        "foundhint-local-seo",
                                      ),
                                      row.name,
                                    ),
                              )
                            }
                          >
                            {paused
                              ? __("Resume output", "foundhint-local-seo")
                              : __("Pause output", "foundhint-local-seo")}
                          </DropdownMenuItem>
                        ) : null}
                        <DropdownMenuItem
                          onClick={() =>
                            run(
                              refresh({ locationId: row.id }).unwrap(),
                              sprintf(
                                /* translators: %s: a location. */
                                __(
                                  "Re-synced %s from Google.",
                                  "foundhint-local-seo",
                                ),
                                row.name,
                              ),
                            )
                          }
                        >
                          {__("Re-sync from Google", "foundhint-local-seo")}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() =>
                            run(
                              setRole({ id: row.id, role: "removed" }).unwrap(),
                              sprintf(
                                /* translators: %s: a location. */
                                __(
                                  "%s removed from schema. Its Google profile isn't changed.",
                                  "foundhint-local-seo",
                                ),
                                row.name,
                              ),
                            )
                          }
                        >
                          {__("Remove from schema", "foundhint-local-seo")}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </span>
              </div>
            );
          })}

          <div className="fhint:flex fhint:min-w-[920px] fhint:flex-wrap fhint:gap-5 fhint:bg-[#faf9f9] fhint:px-5 fhint:py-2.5 fhint:text-[12px] fhint:text-[#625e5e]">
            {[
              [
                "bad",
                __(
                  "Blocking: nothing publishes until fixed",
                  "foundhint-local-seo",
                ),
              ],
              [
                "warn",
                __("Warning: publishes, but check it", "foundhint-local-seo"),
              ],
              [
                "ok",
                __("Recommended: optional improvements", "foundhint-local-seo"),
              ],
            ].map(([tone, text]) => (
              <span
                key={tone}
                className="fhint:inline-flex fhint:items-center fhint:gap-1.5"
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "fhint:size-[7px] fhint:rounded-full",
                    DOTS[tone],
                  )}
                />
                {text}
              </span>
            ))}
          </div>
        </section>
      )}

      {setupOpen ? (
        <LocationSetup
          setup={roster.setup}
          onClose={() => setSetupOpen(false)}
        />
      ) : null}
    </div>
  );
}

export default LocationList;
