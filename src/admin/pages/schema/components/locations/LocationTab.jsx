import { useEffect } from "react";
import { __, sprintf } from "@wordpress/i18n";
import { toast } from "sonner";
import { cn } from "cn";
import { errorMessage, fieldErrors } from "@/lib/errors";
import { useSaveLocationSchemaMutation } from "@/store/api/schemaManagerApi";
import useOverrideDraft from "../../hooks/useOverrideDraft";
import useSchemaPreview from "../../hooks/useSchemaPreview";
import {
  EMPTY_LOCATION_DRAFT,
  isLocationDraftDirty,
  missingLocationFields,
} from "../../lib/location";
import JsonPreview from "../shared/JsonPreview";
import BranchButtons from "./BranchButtons";
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
  state,
  locked,
  live,
  onDirtyChange,
  saveRef,
}) {
  const [save, saveState] = useSaveLocationSchemaMutation();
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

  if (!branches.length || !branchId) {
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
        <PanelHeading
          id={TITLE_ID}
          title={__("Location schema", "foundhint-local-seo")}
          description={__(
            "Each branch: its own address, phone, hours and page, linked to your business.",
            "foundhint-local-seo",
          )}
          counter={state.counter}
        />

        <div className="fhint:grid fhint:gap-2 fhint:border-b fhint:border-b-[#f0eeee] fhint:px-5 fhint:py-3.5">
          <span className={label}>{__("Branch", "foundhint-local-seo")}</span>
          <BranchButtons
            branches={branches}
            current={branchId}
            onPick={onBranch}
          />
        </div>

        <BranchPrintSwitch
          status={status}
          closed={state.warnings?.includes("permanently_closed")}
          missing={missing}
          locked={locked}
          onChange={(next) => set({ status: next })}
        />

        <LocationFields
          fields={state.fields}
          draft={draftApi}
          locked={locked}
          missing={missing}
          errors={errors}
          group={{
            parent,
            parentName: state.parent_name,
            sisters: state.sisters,
            onParent: (next) => set({ parent: next }),
          }}
        />

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

        {saveState.error && !Object.keys(errors).length ? (
          <p
            role="alert"
            className="fhint:mx-5 fhint:mb-3 fhint:text-[13px] fhint:text-[#C02718]"
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
      />
    </div>
  );
}

export default LocationTab;
