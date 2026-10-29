import { useEffect } from "react";
import { __ } from "@wordpress/i18n";
import { toast } from "sonner";
import { cn } from "cn";
import { errorMessage, fieldErrors } from "@/lib/errors";
import {
  useGetSchemaTypesQuery,
  useSaveBusinessSchemaMutation,
} from "@/store/api/schemaManagerApi";
import useOverrideDraft from "../../hooks/useOverrideDraft";
import useSchemaPreview from "../../hooks/useSchemaPreview";
import {
  EMPTY_BUSINESS_DRAFT,
  isBusinessDraftDirty,
  missingBusinessFields,
} from "../../lib/business";
import BusinessFields from "./BusinessFields";
import SchemaKindPicker from "./SchemaKindPicker";
import JsonPreview from "../shared/JsonPreview";
import PlacementCards from "../shared/PlacementCards";
import SaveBar from "../shared/SaveBar";
import RequirementStatus from "./RequirementStatus";
import PanelHeading from "../shared/PanelHeading";
import { panel } from "../styles";
import SubtypePicker from "./SubtypePicker";

const TITLE_ID = "fhint-schema-business-title";

/**
 * 01 Business schema — who the business is (doc §5).
 *
 * Unsaved changes live in the draft until Save and publish; the preview is
 * rebuilt by the server from the draft, 400 ms after the last change.
 * Locked (no FoundHint Pro): the same screen, read-only, showing the
 * markup the free plugin already prints.
 *
 * The parts: `components/business/` (schema type, fields), `PanelHeading`, the shared
 * `useOverrideDraft` and `useSchemaPreview` hooks, and `lib/business`.
 */
export function BusinessTab({ state, locked, live, onDirtyChange, saveRef }) {
  const [save, saveState] = useSaveBusinessSchemaMutation();
  const { data: types = [] } = useGetSchemaTypesQuery(undefined, {
    skip: locked,
  });
  const draftApi = useOverrideDraft({
    empty: EMPTY_BUSINESS_DRAFT,
    fields: state.fields,
    onChange: saveState.reset,
  });
  const { draft, set, clear } = draftApi;

  const dirty = !locked && isBusinessDraftDirty(draft);
  const errors = fieldErrors(saveState.error);

  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);

  const preview = useSchemaPreview({
    entity: "business",
    draft,
    dirty,
    state,
    skip: locked,
  });

  // What is in force: the draft's choice, else the saved one.
  const kind = draft.schema_kind ?? state.schema_kind;
  const type = draft.schema_type || state.type;
  const visitMode =
    draft.visit_mode ?? state.extras?.visit_mode ?? "storefront";
  const organization = kind === "organization";
  const picked = types.find((option) => option.type === type);

  const missing = missingBusinessFields(
    Object.fromEntries(
      state.fields.map((field) => [field.key, draftApi.value(field)]),
    ),
    organization,
    visitMode,
  );

  // An Organization shows its information group and its social links.
  const fields = state.fields
    .map(draftApi.source)
    .filter(
      (field) =>
        !organization || field.group === "info" || field.key === "social",
    );

  const onSave = async () => {
    try {
      const result = await save(draft).unwrap();

      clear();
      toast.success(
        result?.status === "draft"
          ? __("Saved as a draft.", "foundhint-local-seo")
          : __("Business schema saved.", "foundhint-local-seo"),
      );
    } catch {
      toast.error(__("Some fields need attention.", "foundhint-local-seo"));
    }
  };

  if (saveRef) {
    saveRef.current = { save: onSave, discard: clear };
  }

  const document = locked ? state.preview : preview.document;

  return (
    <div className="fhint:flex fhint:flex-wrap fhint:items-start fhint:gap-4">
      <section
        aria-labelledby={TITLE_ID}
        className={cn(panel, "fhint:min-w-0 fhint:flex-[1_1_580px]")}
      >
        <PanelHeading
          id={TITLE_ID}
          title={__("Business schema", "foundhint-local-seo")}
          description={
            organization
              ? __(
                  "Who owns or runs the business, however many locations it has.",
                  "foundhint-local-seo",
                )
              : __(
                  "A business at a physical location, with its address, hours and category.",
                  "foundhint-local-seo",
                )
          }
          counter={state.counter}
        />

        <SchemaKindPicker
          value={kind}
          locked={locked}
          onChange={(next) => set({ schema_kind: next })}
        />

        {organization ? null : (
          <SubtypePicker
            type={type}
            typeLabel={draft.schema_type ? draft.schema_type : state.type_label}
            matchedFrom={state.matched_from}
            locked={locked}
            onPick={(next) => set({ schema_type: next, extras: {} })}
          />
        )}

        <RequirementStatus
          kind={kind}
          visitMode={visitMode}
          missing={missing}
        />

        <BusinessFields
          fields={fields}
          draft={draftApi}
          locked={locked}
          missing={missing}
          visitMode={visitMode}
          onVisitMode={(next) => set({ visit_mode: next })}
          errors={errors}
          photos={state.photos}
          extras={
            organization
              ? null
              : {
                  // The details for the type in force — a newly picked
                  // one's at once.
                  fields: draft.schema_type
                    ? (picked?.extras ?? [])
                    : (state.extra_fields ?? []),
                  typeLabel: picked?.label ?? state.type_label,
                  value: (key) =>
                    Object.prototype.hasOwnProperty.call(draft.extras, key)
                      ? draft.extras[key]
                      : state.extras?.[key],
                  onChange: (key, next) =>
                    set({ extras: { ...draft.extras, [key]: next } }),
                }
          }
        />

        <PlacementCards
          title={__("Add business schema to", "foundhint-local-seo")}
          name="fhint-business-placement"
          value={draft.placement ?? state.placement}
          postIds={draft.post_ids ?? state.post_ids}
          locked={locked}
          onChange={(next) => set({ placement: next })}
          onPages={(ids) => set({ post_ids: ids })}
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

export default BusinessTab;
