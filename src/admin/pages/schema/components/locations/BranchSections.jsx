import { useEffect, useId, useState } from "react";
import { __, sprintf } from "@wordpress/i18n";
import {
  ChevronLeftIcon,
  CircleAlertIcon,
  Link2Icon,
  LockIcon,
  TriangleAlertIcon,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "cn";
import Hint from "@/components/Hint";
import { Switch } from "@/components/ui/switch";
import { errorMessage } from "@/lib/errors";
import { focus } from "@/pages/profile/styles";
import {
  useGetSchemaPagesQuery,
  useGetSchemaTypesQuery,
  useCreateLocationPageMutation,
  useSetLocationPageMutation,
} from "@/store/api/schemaManagerApi";
import { BADGE, ROLES, STATUSES, TONES, issueText } from "../../lib/locations";
import { panelTitle, sectionTitle } from "../styles";

const SECTION =
  "fhint:grid fhint:gap-2.5 fhint:border-b fhint:border-b-[#f0eeee] fhint:px-5 fhint:py-4";
const SELECT = (bad) =>
  cn(
    "fhint:box-border fhint:w-full fhint:max-w-none! fhint:border fhint:bg-white fhint:px-2.5! fhint:py-[9px]! fhint:pr-8! fhint:text-[13.5px] fhint:text-[#201e1d]",
    bad ? "fhint:border-[#C02718]" : "fhint:border-[#bab6b6]",
    focus,
  );
const LINK =
  "fhint:cursor-pointer fhint:border-0 fhint:bg-transparent fhint:p-0 fhint:text-[12.5px] fhint:font-bold fhint:text-[#D8521F]";

function Heading({ number, title, required, requiredBad, children }) {
  return (
    <div className="fhint:flex fhint:flex-wrap fhint:items-center fhint:gap-2">
      <span className="fhint:text-[12px] fhint:font-bold fhint:text-[#D8521F]">
        {number}
      </span>
      <h3 className={sectionTitle}>{title}</h3>
      {required ? (
        <span
          className={cn(
            "fhint:rounded-full fhint:px-2 fhint:py-0.5 fhint:text-[11px] fhint:font-bold",
            requiredBad
              ? "fhint:bg-[#FBE9E6] fhint:text-[#C02718]"
              : "fhint:bg-[#201e1d] fhint:text-white",
          )}
        >
          {__("Required", "foundhint-local-seo")}
        </span>
      ) : null}
      {children}
    </div>
  );
}

/**
 * The branch editor's head and its four sections (design B): the way back
 * to the list with the branch's role and status, its name and how many
 * fields come from Google, what blocks or needs a look, then 01 its page,
 * 02 its schema type, 03 its parent, 04 what it inherits from the brand.
 *
 * The page is saved at once (it is the branch's address on this site);
 * type, parent and inheritance go into the draft with the fields.
 *
 * @param {Object}   props
 * @param {Object}   props.state   The branch's state.
 * @param {Object}   props.row     Its row in the Locations list, if loaded.
 * @param {Object}   props.draft   The editor's draft.
 * @param {Function} props.set     Change the draft.
 * @param {boolean}  props.locked  No Premium.
 * @param {Function} props.onBack  Back to the list.
 * @param {Object}   props.usedBy  Post id → other branches using it.
 */
export function BranchSections({
  state,
  row,
  draft,
  set,
  locked,
  onBack,
  usedBy = {},
}) {
  const ids = useId();
  const [parentOpen, setParentOpen] = useState(false);
  const [setPage, pageState] = useSetLocationPageMutation();
  const [createLocationPage, createState] = useCreateLocationPageMutation();
  const createPage = state.create_page ?? {};
  // Which option card is in force: a page FoundHint made, any other page,
  // or (no page yet) the card the user picked. "create" is only a choice
  // until its button makes the page.
  const [pickedMode, setMode] = useState(null);
  const pageMode =
    pickedMode ??
    (createPage.created ? "create" : state.page ? "existing" : null);

  // Another branch starts from its own page.
  useEffect(() => {
    setMode(null);
  }, [state.id]);
  const { data: types = [] } = useGetSchemaTypesQuery(undefined, {
    skip: locked,
  });
  const page = state.page;
  const { data: pageData } = useGetSchemaPagesQuery(
    { search: "", include: page?.post_id ? [page.post_id] : [] },
    { skip: locked },
  );
  const pages = pageData?.pages ?? [];

  const name = state.fields?.[0]?.value ?? "";
  const schemaType = draft.schema_type ?? state.schema_type ?? "";
  const typeInForce = schemaType || state.type;
  const parent = draft.parent ?? state.parent;
  const inherit = { ...state.inherit, ...(draft.inherit ?? {}) };
  const values = state.inherit_values ?? {};
  const parents = state.parents ?? {};
  const issues = row?.issues ?? state.issues ?? [];
  const alerts = issues.filter((issue) => issue.level !== "rec");
  const shared = issues.some((issue) => issue.code === "page_shared");
  const [roleText, roleTone] = ROLES[state.role] ?? ROLES.branch;
  const [statusText, statusTone] = row
    ? (STATUSES[row.status] ?? STATUSES.live)
    : [null, null];
  const linked =
    parent === "organization"
      ? parents.organization
      : parent === "business"
        ? parents.business
        : null;

  const makePage = async () => {
    try {
      await createLocationPage(state.id).unwrap();
      setMode(null);
      toast.success(
        __(
          "Page created and published. The branch's schema prints there.",
          "foundhint-local-seo",
        ),
      );
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  const choosePage = async (postId) => {
    try {
      await setPage({ id: state.id, postId }).unwrap();
      toast.success(
        postId
          ? __("Page saved. The branch publishes there.", "foundhint-local-seo")
          : __("Page removed from this branch.", "foundhint-local-seo"),
      );
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  return (
    <>
      <div className="fhint:flex fhint:flex-wrap fhint:items-center fhint:gap-2.5 fhint:border-b fhint:border-b-[#f0eeee] fhint:bg-[#faf9f9] fhint:px-5 fhint:py-2.5">
        <button
          type="button"
          onClick={onBack}
          className={cn(
            "fhint:inline-flex fhint:cursor-pointer fhint:items-center fhint:gap-1.5 fhint:border-0 fhint:bg-transparent fhint:p-0 fhint:text-[13px] fhint:font-bold fhint:text-[#201e1d]",
            focus,
          )}
        >
          <ChevronLeftIcon aria-hidden="true" className="fhint:size-4" />
          {__("All locations", "foundhint-local-seo")}
        </button>
        <span aria-hidden="true" className="fhint:text-[#bab6b6]">
          /
        </span>
        <span className="fhint:text-[13px] fhint:text-[#625e5e]">{name}</span>
        <span className="fhint:ml-auto fhint:flex fhint:items-center fhint:gap-1.5">
          <span className={cn(BADGE, TONES[roleTone])}>{roleText()}</span>
          {statusText ? (
            <span className={cn(BADGE, TONES[statusTone])}>{statusText()}</span>
          ) : null}
        </span>
      </div>

      <div className="fhint:flex fhint:flex-wrap fhint:items-center fhint:gap-3 fhint:border-b fhint:border-b-[#e6e3e3] fhint:px-5 fhint:py-4">
        <span className="fhint:flex fhint:min-w-0 fhint:flex-[1_1_260px] fhint:items-center fhint:gap-2">
          <h2 id="fhint-schema-location-title" className={panelTitle}>
            {name}
          </h2>
          <Hint
            about={name}
            text={__(
              "Branch schema for this Google profile. It links to your brand with parentOrganization, so Google sees one business with several locations.",
              "foundhint-local-seo",
            )}
          />
        </span>
        {state.counter ? (
          <span className={cn(BADGE, TONES.branch)}>
            {sprintf(
              /* translators: 1: fields filled from Google, 2: all fields. */
              __("%1$d of %2$d fields from Google", "foundhint-local-seo"),
              state.counter.from_google,
              state.counter.total,
            )}
          </span>
        ) : null}
      </div>

      {alerts.length ? (
        <div
          aria-live="polite"
          className="fhint:grid fhint:gap-2 fhint:px-5 fhint:pt-3.5"
        >
          {alerts.map((issue) => {
            const words = issueText(issue);
            const block = issue.level === "block";
            const Icon = block ? CircleAlertIcon : TriangleAlertIcon;

            return (
              <div
                key={issue.code}
                className={cn(
                  "fhint:flex fhint:items-start fhint:gap-2.5 fhint:border fhint:px-3 fhint:py-2.5 fhint:text-[13px] fhint:leading-normal",
                  block
                    ? "fhint:border-[#F1C7BF] fhint:bg-[#FDF3F1] fhint:text-[#8f1d10]"
                    : "fhint:border-[#F0D9A8] fhint:bg-[#FFF8EC] fhint:text-[#6b4600]",
                )}
              >
                <Icon
                  aria-hidden="true"
                  className="fhint:mt-0.5 fhint:size-4 fhint:shrink-0"
                />
                <span>
                  <strong>{words.title}</strong> {words.text}
                </span>
              </div>
            );
          })}
        </div>
      ) : null}

      <section className={SECTION}>
        <Heading
          number="01"
          title={__("Location page", "foundhint-local-seo")}
          required
          requiredBad={!page || shared}
        >
          <span className="fhint:text-[12.5px] fhint:text-[#625e5e]">
            {!page
              ? __(
                  "No page yet. Pick the page that describes this branch.",
                  "foundhint-local-seo",
                )
              : shared
                ? sprintf(
                    /* translators: %s: a page path. */
                    __(
                      "%s is shared, so nothing publishes.",
                      "foundhint-local-seo",
                    ),
                    page.path,
                  )
                : sprintf(
                    /* translators: %s: a page path. */
                    __("Schema outputs on %s", "foundhint-local-seo"),
                    page.path,
                  )}
          </span>
        </Heading>
        {locked ? null : (
          <div
            role="radiogroup"
            aria-label={__("Location page", "foundhint-local-seo")}
            className="fhint:grid fhint:grid-cols-[repeat(auto-fit,minmax(min(100%,240px),1fr))] fhint:gap-2"
          >
            {[
              [
                "create",
                __("Create location page", "foundhint-local-seo"),
                __(
                  "FoundHint creates the page with this branch's address, hours and map, and adds the schema to it.",
                  "foundhint-local-seo",
                ),
              ],
              [
                "existing",
                __("Use an existing page", "foundhint-local-seo"),
                __(
                  "Pick a page you already have for this branch.",
                  "foundhint-local-seo",
                ),
              ],
            ].map(([key, text, body]) => (
              <label
                key={key}
                className={cn(
                  "fhint:flex fhint:cursor-pointer fhint:items-start fhint:gap-2.5 fhint:border fhint:px-[13px] fhint:py-[11px]",
                  pageMode === key
                    ? "fhint:border-[#FF6B35] fhint:bg-[#FFF8F4]"
                    : "fhint:border-[#e6e3e3] fhint:bg-white",
                )}
              >
                <input
                  type="radio"
                  name={`${ids}-page`}
                  checked={pageMode === key}
                  onChange={() => setMode(key)}
                  className="fhint:mt-[3px] fhint:accent-[#FF6B35]"
                />
                <span className="fhint:grid fhint:min-w-0 fhint:gap-0.5">
                  <span className="fhint:flex fhint:flex-wrap fhint:items-center fhint:gap-1.5">
                    <strong className="fhint:text-[13.5px]">{text}</strong>
                    {key === "create" ? (
                      <span className={cn(BADGE, TONES.ok)}>
                        {__("Recommended", "foundhint-local-seo")}
                      </span>
                    ) : null}
                  </span>
                  {key === "create" && createPage.path ? (
                    <code className="fhint:justify-self-start fhint:truncate fhint:bg-[#f3f2f2] fhint:px-[7px] fhint:py-0.5 fhint:font-mono fhint:text-[12px] fhint:text-[#201e1d]">
                      {createPage.created && page ? page.path : createPage.path}
                    </code>
                  ) : null}
                  <span className="fhint:text-[12.5px] fhint:text-[#625e5e]">
                    {body}
                  </span>
                </span>
              </label>
            ))}
          </div>
        )}
        {!locked && pageMode === "create" && !createPage.created ? (
          <div className="fhint:flex fhint:flex-wrap fhint:items-center fhint:gap-3 fhint:border fhint:border-[#e6e3e3] fhint:bg-[#faf9f9] fhint:px-[13px] fhint:py-2.5">
            <span className="fhint:min-w-0 fhint:flex-[1_1_260px] fhint:text-[12.5px] fhint:text-[#444141]">
              {page
                ? sprintf(
                    /* translators: 1: new page path, 2: current page path. */
                    __(
                      "Publishes a new page at %1$s and moves this branch's schema there from %2$s.",
                      "foundhint-local-seo",
                    ),
                    createPage.path,
                    page.path,
                  )
                : sprintf(
                    /* translators: %s: new page path. */
                    __(
                      "Publishes a new page at %s. You can edit it in WordPress afterwards.",
                      "foundhint-local-seo",
                    ),
                    createPage.path,
                  )}
            </span>
            <button
              type="button"
              disabled={createState.isLoading}
              onClick={makePage}
              className={cn(
                "fhint:inline-flex fhint:cursor-pointer fhint:items-center fhint:gap-[7px] fhint:border-0 fhint:bg-[#FF6B35] fhint:px-[15px] fhint:py-2 fhint:text-[13px] fhint:font-bold fhint:text-white fhint:hover:bg-[#E85A25] fhint:disabled:opacity-60",
                focus,
              )}
            >
              {createState.isLoading
                ? __("Creating…", "foundhint-local-seo")
                : __("Create and publish page", "foundhint-local-seo")}
            </button>
          </div>
        ) : null}
        {locked || pageMode === "create" ? null : (
          <label className="fhint:grid fhint:gap-1.5">
            <span className="fhint:sr-only">
              {__("Existing page", "foundhint-local-seo")}
            </span>
            <select
              value={page?.post_id ?? ""}
              disabled={pageState.isLoading}
              onChange={(event) => choosePage(Number(event.target.value) || 0)}
              className={SELECT(!page || shared)}
            >
              <option value="">
                {__("Choose a page", "foundhint-local-seo")}
              </option>
              {pages.map((option) => (
                <option key={option.id} value={option.id}>
                  {usedBy[option.id]?.length
                    ? sprintf(
                        /* translators: 1: page title, 2: its path, 3: branches using it. */
                        __("%1$s · %2$s (used by %3$s)", "foundhint-local-seo"),
                        option.title,
                        option.path,
                        usedBy[option.id].join(", "),
                      )
                    : `${option.title} · ${option.path}`}
                </option>
              ))}
            </select>
          </label>
        )}
        {!locked && pageMode === "create" && createPage.created && page ? (
          <a
            href={page.url}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "fhint:justify-self-start fhint:text-[12.5px] fhint:font-bold fhint:text-[#D8521F]",
              focus,
            )}
          >
            {__("View the page", "foundhint-local-seo")}
            <span className="fhint:sr-only">
              {__("(opens in a new tab)", "foundhint-local-seo")}
            </span>
          </a>
        ) : null}
        {page && !page.published ? (
          <span className="fhint:text-[12.5px] fhint:font-bold fhint:text-[#8a5a00]">
            {__(
              "This page isn't published, so the branch can't publish yet.",
              "foundhint-local-seo",
            )}
          </span>
        ) : null}
      </section>

      <section className={cn(SECTION, "fhint:gap-2")}>
        <Heading
          number="02"
          title={__("Schema type", "foundhint-local-seo")}
          required
        />
        <div className="fhint:flex fhint:flex-wrap fhint:items-center fhint:gap-2.5">
          <select
            value={schemaType}
            disabled={locked}
            onChange={(event) => set({ schema_type: event.target.value })}
            aria-label={__("LocalBusiness subtype", "foundhint-local-seo")}
            className={cn(
              SELECT(false),
              "fhint:w-auto! fhint:flex-[1_1_300px]",
            )}
          >
            <option value="">
              {sprintf(
                /* translators: %s: the type FoundHint picks. */
                __("Automatic (%s)", "foundhint-local-seo"),
                state.type,
              )}
            </option>
            {types
              .filter((option) => option.type !== "Organization")
              .map((option) => (
                <option key={option.type} value={option.type}>
                  {`${option.label} · ${option.type}`}
                </option>
              ))}
          </select>
          <code className="fhint:bg-[#FFE4D6] fhint:px-[7px] fhint:py-0.5 fhint:font-mono fhint:text-[11.5px] fhint:text-[#8a3b12]">
            {`LocalBusiness › ${typeInForce}`}
          </code>
        </div>
        <span className="fhint:text-[12px] fhint:leading-normal fhint:text-[#625e5e]">
          {state.category
            ? sprintf(
                /* translators: %s: a Google category. */
                __(
                  "Matched from this profile's Google category: %s. Organization isn't offered here, because a branch is a place customers visit.",
                  "foundhint-local-seo",
                ),
                state.category,
              )
            : __(
                "Organization isn't offered here, because a branch is a place customers visit.",
                "foundhint-local-seo",
              )}
        </span>
      </section>

      <section className={SECTION}>
        <Heading
          number="03"
          title={__("Parent business", "foundhint-local-seo")}
        />
        <div className="fhint:flex fhint:flex-wrap fhint:items-center fhint:gap-3 fhint:border fhint:border-[#e6e3e3] fhint:bg-[#faf9f9] fhint:px-3.5 fhint:py-[11px]">
          <span
            aria-hidden="true"
            className="fhint:grid fhint:size-[30px] fhint:shrink-0 fhint:place-items-center fhint:bg-[#FFF1EB] fhint:text-[#D8521F]"
          >
            <Link2Icon className="fhint:size-4" />
          </span>
          <span className="fhint:min-w-0 fhint:flex-[1_1_240px] fhint:text-[13.5px]">
            {linked ? (
              <>
                {__("Linked to", "foundhint-local-seo")}{" "}
                <strong>{linked.name}</strong> ·{" "}
                <code className="fhint:font-mono fhint:text-[12px] fhint:text-[#444141]">
                  {parent === "organization" ? "#organization" : "#business"}
                </code>
              </>
            ) : (
              __("Not part of a group", "foundhint-local-seo")
            )}
          </span>
          <span className="fhint:rounded-full fhint:bg-[#f3f2f2] fhint:px-2 fhint:py-0.5 fhint:text-[11px] fhint:font-bold fhint:text-[#625e5e]">
            {__("Read-only", "foundhint-local-seo")}
          </span>
          {locked ? null : (
            <button
              type="button"
              aria-expanded={parentOpen}
              onClick={() => setParentOpen((open) => !open)}
              className={cn(LINK, focus)}
            >
              {parentOpen
                ? __("Done", "foundhint-local-seo")
                : __("Change", "foundhint-local-seo")}
            </button>
          )}
        </div>
        {linked && linked.enabled === false ? (
          <span className="fhint:text-[12.5px] fhint:font-bold fhint:text-[#8a5a00]">
            {__(
              "That schema is switched off, so the branch isn't linked to it until you turn it on.",
              "foundhint-local-seo",
            )}
          </span>
        ) : null}
        {parentOpen ? (
          <div
            role="radiogroup"
            aria-label={__("Parent business", "foundhint-local-seo")}
            className="fhint:grid fhint:grid-cols-[repeat(auto-fit,minmax(min(100%,220px),1fr))] fhint:gap-2"
          >
            {[
              [
                "organization",
                parents.organization?.name,
                __(
                  "Organization from 01 · #organization",
                  "foundhint-local-seo",
                ),
              ],
              [
                "business",
                parents.business?.name,
                __("Main business from 02 · #business", "foundhint-local-seo"),
              ],
              [
                "none",
                __("Not part of a group", "foundhint-local-seo"),
                __(
                  "A business of its own, with no parent.",
                  "foundhint-local-seo",
                ),
              ],
            ].map(([key, text, body]) => (
              <label
                key={key}
                className={cn(
                  "fhint:flex fhint:cursor-pointer fhint:items-start fhint:gap-2.5 fhint:border fhint:px-[13px] fhint:py-[11px]",
                  parent === key
                    ? "fhint:border-[#FF6B35] fhint:bg-[#FFF8F4]"
                    : "fhint:border-[#e6e3e3] fhint:bg-white",
                )}
              >
                <input
                  type="radio"
                  name={`${ids}-parent`}
                  checked={parent === key}
                  onChange={() => set({ parent: key })}
                  className="fhint:mt-[3px] fhint:accent-[#FF6B35]"
                />
                <span>
                  <strong className="fhint:block fhint:text-[13.5px]">
                    {text}
                  </strong>
                  <span className="fhint:text-[12.5px] fhint:text-[#625e5e]">
                    {body}
                  </span>
                </span>
              </label>
            ))}
          </div>
        ) : null}
      </section>

      <section className={SECTION}>
        <Heading
          number="04"
          title={__("Inherit from brand", "foundhint-local-seo")}
        />
        <div className="fhint:border fhint:border-[#e6e3e3]">
          {[
            [
              "logo",
              __("Logo", "foundhint-local-seo"),
              values.logo
                ? sprintf(
                    /* translators: %s: a file name. */
                    __("%s, from 02 Main business", "foundhint-local-seo"),
                    values.logo,
                  )
                : __("No logo set yet", "foundhint-local-seo"),
            ],
            [
              "social",
              __("Social profiles", "foundhint-local-seo"),
              values.social || __("No profiles yet", "foundhint-local-seo"),
            ],
            [
              "price",
              __("Price range", "foundhint-local-seo"),
              values.price
                ? sprintf(
                    /* translators: %s: e.g. "$$". */
                    __("%s, from 02 Main business", "foundhint-local-seo"),
                    values.price,
                  )
                : __("No price range set yet", "foundhint-local-seo"),
            ],
          ].map(([key, text, value]) => {
            const on = inherit[key] !== false;

            return (
              <div
                key={key}
                className="fhint:flex fhint:items-center fhint:gap-3 fhint:border-b fhint:border-b-[#f0eeee] fhint:px-3.5 fhint:py-2.5 fhint:last:border-b-0"
              >
                <span className="fhint:grid fhint:min-w-0 fhint:flex-1 fhint:gap-0.5">
                  <strong className="fhint:text-[13.5px]">{text}</strong>
                  <span className="fhint:truncate fhint:text-[12px] fhint:text-[#625e5e]">
                    {value}
                  </span>
                </span>
                <span
                  className={cn(
                    "fhint:text-[12px] fhint:font-bold",
                    on ? "fhint:text-[#157F4B]" : "fhint:text-[#9b9797]",
                  )}
                >
                  {on
                    ? __("Inherited", "foundhint-local-seo")
                    : __("Not used", "foundhint-local-seo")}
                </span>
                <Switch
                  checked={on}
                  disabled={locked}
                  onCheckedChange={(next) =>
                    set({ inherit: { ...(draft.inherit ?? {}), [key]: next } })
                  }
                  aria-label={sprintf(
                    /* translators: %s: e.g. "logo". */
                    __("Inherit %s from brand", "foundhint-local-seo"),
                    text.toLowerCase(),
                  )}
                />
              </div>
            );
          })}
        </div>
        <div className="fhint:grid fhint:gap-2 fhint:border fhint:border-[#e6e3e3] fhint:bg-[#faf9f9] fhint:px-3.5 fhint:py-3">
          <div className="fhint:flex fhint:flex-wrap fhint:gap-1.5">
            {[
              __("Name", "foundhint-local-seo"),
              __("Phone", "foundhint-local-seo"),
              __("Address", "foundhint-local-seo"),
              __("Geo", "foundhint-local-seo"),
              __("Hours", "foundhint-local-seo"),
              __("Images", "foundhint-local-seo"),
            ].map((item) => (
              <span
                key={item}
                className="fhint:inline-flex fhint:items-center fhint:gap-1.5 fhint:border fhint:border-[#d7d3d3] fhint:bg-white fhint:px-2.5 fhint:py-[5px] fhint:text-[12.5px] fhint:font-bold fhint:text-[#444141]"
              >
                <LockIcon aria-hidden="true" className="fhint:size-3" />
                {item}
              </span>
            ))}
          </div>
          <span className="fhint:text-[12.5px] fhint:text-[#625e5e]">
            {__(
              "Always from this location's Google profile, never from the brand.",
              "foundhint-local-seo",
            )}
          </span>
        </div>
      </section>
    </>
  );
}

export default BranchSections;
