import { useEffect } from "react";
import { __, sprintf } from "@wordpress/i18n";
import { ChevronRightIcon } from "lucide-react";
import { toast } from "sonner";
import { cn } from "cn";
import { errorMessage, fieldErrors } from "@/lib/errors";
import {
  useGetLocationRosterQuery,
  useSaveLocationSchemaMutation,
} from "@/store/api/schemaManagerApi";
import useOverrideDraft from "../../hooks/useOverrideDraft";
import useSchemaPreview from "../../hooks/useSchemaPreview";
import {
  EMPTY_LOCATION_DRAFT,
  isLocationDraftDirty,
  missingLocationFields,
} from "../../lib/location";
import JsonPreview from "../shared/JsonPreview";
import BranchButtons from "./BranchButtons";
import BranchGroupFields from "./BranchGroupFields";
import BranchSections from "./BranchSections";
import LocationList from "./LocationList";
import LocationFields from "./LocationFields";
import NoBranchChosen from "./NoBranchChosen";
import PlacementWarnings from "./PlacementWarnings";
import BranchPrintSwitch from "./BranchPrintSwitch";
import PlacementCards from "../shared/PlacementCards";
import SaveBar from "../shared/SaveBar";
import { label, panel } from "../styles";
import PanelHeading from "../shared/PanelHeading";

const TITLE_ID = "fhint-schema-location-title";

/**
 * Where a branch's schema prints (design: "Outputs on"): its page, or why
 * it prints nowhere yet.
 */
function outputsOn(state) {
  const page = state?.page;

  if (!page) {
    return {
      text: __("no page yet. Assign one to publish.", "foundhint-local-seo"),
      ok: false,
    };
  }

  if (!page.published) {
    return {
      text: sprintf(
        /* translators: %s: a page path. */
        __("%s (not published yet)", "foundhint-local-seo"),
        page.path,
      ),
      ok: false,
    };
  }

  if ((state.issues ?? []).some((issue) => issue.code === "page_shared")) {
    return {
      text: sprintf(
        /* translators: %s: a page path. */
        __("%s is shared, so nothing publishes", "foundhint-local-seo"),
        page.path,
      ),
      ok: false,
    };
  }

  return { text: page.path, ok: true };
}

/** Pages other branches use: post id → their names ("used by …"). */
function usedBy(roster, branchId) {
  const out = {};

  (roster?.rows ?? []).forEach((row) => {
    if (row.role === "branch" && row.id !== branchId && row.page) {
      out[row.page.post_id] = [...(out[row.page.post_id] ?? []), row.name];
    }
  });

  return out;
}

/**
 * 02 Location schema — where each branch operates (doc §6).
 *
 * Every location but the main one is a branch; the main one is the
 * business. Each branch is typed like the business, linked to it by
 * parentOrganization, and placed on its own pages.
 *
 * The parts: `components/locations/`, `PanelHeading`, the shared `useOverrideDraft` and
 * `useSchemaPreview` hooks, and `lib/location`.
 */
export function LocationTab({
  branches,
  branchId,
  onBranch,
  onAllLocations,
  onOpenMain,
  syncedAt,
  state,
  locked,
  live,
  onDirtyChange,
  saveRef,
}) {
  const [save, saveState] = useSaveLocationSchemaMutation();
  // The design's Locations list, and each branch's row in it.
  const { data: roster } = useGetLocationRosterQuery(undefined, {
    skip: locked,
  });
  const draftApi = useOverrideDraft({
    empty: EMPTY_LOCATION_DRAFT,
    fields: state?.fields ?? [],
    onChange: saveState.reset,
  });
  const { draft, set, clear } = draftApi;

  const dirty = !locked && isLocationDraftDirty(draft);
  const errors = fieldErrors(saveState.error);

  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);

  const preview = useSchemaPreview({
    entity: "location",
    id: branchId,
    draft,
    dirty,
    state,
    skip: locked || !branchId,
  });

  // A different branch starts clean. Only the branch is a dependency: the
  // two clear functions are new each render and would loop it.
  useEffect(() => {
    clear();
    preview.clear();
  }, [branchId]);

  if (!branchId) {
    // With Premium: every profile, its role, page, status and issues.
    if (!locked) {
      return roster ? (
        <LocationList
          roster={roster}
          onEdit={(id) => onBranch(id)}
          onOpenMain={onOpenMain}
          syncedAt={syncedAt}
        />
      ) : null;
    }

    return <NoBranchChosen branches={branches} onBranch={onBranch} />;
  }

  if (!state) {
    return null;
  }

  const onSave = async () => {
    try {
      const result = await save({ id: branchId, ...draft }).unwrap();

      clear();
      toast.success(
        result?.status === "draft"
          ? __("Saved as a draft.", "foundhint-local-seo")
          : __("Location schema saved.", "foundhint-local-seo"),
      );
    } catch {
      toast.error(__("Some fields need attention.", "foundhint-local-seo"));
    }
  };

  if (saveRef) {
    saveRef.current = { save: onSave, discard: clear };
  }

  // What is in force: the draft's choice, else the saved one.
  const parent = draft.parent ?? state.parent;
  const status =
    draft.status ?? (state.status === "inactive" ? "inactive" : "active");
  const placement = draft.placement ?? state.placement;
  const postIds = draft.post_ids ?? state.post_ids;
  const name =
    draftApi.value(state.fields[0]) || __("this branch", "foundhint-local-seo");
  const missing = missingLocationFields(
    Object.fromEntries(
      state.fields.map((field) => [field.key, draftApi.value(field)]),
    ),
  );
  const document = locked ? state.preview : preview.document;

  return (
    <div className="fhint:flex fhint:flex-wrap fhint:items-start fhint:gap-4">
      <section
        aria-labelledby={TITLE_ID}
        className={cn(panel, "fhint:min-w-0 fhint:flex-[1_1_580px]")}
      >
        {locked ? (
          <PanelHeading
            id={TITLE_ID}
            title={__("Location schema", "foundhint-local-seo")}
            description={__(
              "Each branch: its own address, phone, hours and page, linked to your business.",
              "foundhint-local-seo",
            )}
            counter={state.counter}
          />
        ) : (
          <BranchSections
            state={{ ...state, id: branchId }}
            row={roster?.rows?.find((item) => item.id === branchId)}
            draft={draft}
            set={set}
            locked={locked}
            onBack={onAllLocations}
            usedBy={usedBy(roster, branchId)}
          />
        )}

        <LocationFields
          fields={state.fields}
          draft={draftApi}
          locked={locked}
          missing={missing}
          errors={errors}
        />

        {/* What the design leaves out, kept: switching the branch's output,
            the branch buttons, its sister branches, and pages of its own
            beyond its location page. */}
        <details
          open={locked || undefined}
          className="fhint:group fhint:border-t fhint:border-t-[#e6e3e3]"
        >
          <summary className="fhint:flex fhint:cursor-pointer fhint:items-center fhint:gap-2 fhint:px-5 fhint:py-3.5 fhint:text-[13px] fhint:font-bold fhint:text-[#201e1d] fhint:marker:content-none">
            <ChevronRightIcon
              aria-hidden="true"
              className="fhint:size-4 fhint:transition-transform fhint:group-open:rotate-90"
            />
            {__("More options", "foundhint-local-seo")}
            <span className="fhint:font-normal fhint:text-[#625e5e]">
              {__(
                "Output switch, other branches, extra pages",
                "foundhint-local-seo",
              )}
            </span>
          </summary>

          <BranchPrintSwitch
            status={status}
            closed={state.warnings?.includes("permanently_closed")}
            missing={missing}
            locked={locked}
            onChange={(next) => set({ status: next })}
          />

          <div className="fhint:grid fhint:gap-2 fhint:border-b fhint:border-b-border fhint:px-5 fhint:py-3.5">
            <span className={label}>{__("Branch", "foundhint-local-seo")}</span>
            <BranchButtons
              branches={branches}
              current={branchId}
              onPick={onBranch}
            />
          </div>

          <div className="fhint:grid fhint:grid-cols-[repeat(auto-fill,minmax(min(100%,230px),1fr))] fhint:gap-4 fhint:border-b fhint:border-b-border fhint:px-5 fhint:py-3.5">
            <BranchGroupFields parent={parent} sisters={state.sisters} />
          </div>

          <PlacementCards
            title={sprintf(
              /* translators: %s: the branch name. */
              __("Add %s location schema to", "foundhint-local-seo"),
              name,
            )}
            name="fhint-location-placement"
            value={placement}
            postIds={postIds}
            locked={locked}
            homeWarning={false}
            onChange={(next) => set({ placement: next })}
            onPages={(ids) => set({ post_ids: ids })}
          />

          <PlacementWarnings
            placement={placement}
            postIds={postIds}
            branchCount={branches.length}
          />
        </details>

        {saveState.error && !Object.keys(errors).length ? (
          <p
            role="alert"
            className="fhint:mx-5 fhint:mb-3 fhint:text-sm fhint:text-destructive"
          >
            {errorMessage(saveState.error)}
          </p>
        ) : null}

        {locked ? null : (
          <SaveBar
            dirty={dirty}
            saving={saveState.isLoading}
            status={missing.length ? "draft" : state.status}
            live={live}
            onSave={onSave}
          />
        )}
      </section>

      <JsonPreview
        document={document}
        rootType={document?.["@type"] ?? ""}
        live={live && !dirty && state.status === "active"}
        loading={preview.loading && !document}
        dirty={dirty}
        outputsOn={locked ? null : outputsOn(state)}
      />
    </div>
  );
}

export default LocationTab;
