import { useEffect, useId, useRef, useState } from "react";
import { __, sprintf } from "@wordpress/i18n";
import { toast } from "sonner";
import { cn } from "cn";
import { errorMessage, fieldErrors } from "@/lib/errors";
import {
  useCreateServiceSchemaMutation,
  useDeleteServiceSchemaMutation,
  useSaveServiceSchemaMutation,
} from "@/store/api/schemaManagerApi";
import useSchemaPreview from "../../../hooks/useSchemaPreview";
import { PLACEMENT_WARNINGS, warningText } from "../../../lib/service";
import JsonPreview from "../../shared/JsonPreview";
import PlacementCards from "../../shared/PlacementCards";
import SaveBar from "../../shared/SaveBar";
import AreasSection from "./AreasSection";
import BasicsSection from "./BasicsSection";
import EditorBar from "./EditorBar";
import OptionalDetails from "./OptionalDetails";
import PageSection from "./PageSection";
import ProviderSection from "./ProviderSection";
import RemoveDialog from "./RemoveDialog";
import { input, panel, warningNote } from "../../styles";

/**
 * One service's editor (doc §7.2): 01 Service, 02 Service provider, 03
 * Service areas, 04 Service page, 05 Optional details, and where it is
 * printed. Keyed by the service by its parent, so another service starts
 * clean.
 *
 * The sections live in `components/services/`; the rules in `lib/service`. Each section
 * gets one `form` object: the values in force, `set`, `locked`, the
 * server's errors, and helpers for ids and control classes.
 */
export function ServiceEditor({
  list,
  state,
  isNew,
  locked,
  live,
  onDirtyChange,
  saveRef,
  onSaved,
  onRemoved,
  reveal = false,
}) {
  const [draft, setDraft] = useState({});
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [save, saveState] = useSaveServiceSchemaMutation();
  const [create, createState] = useCreateServiceSchemaMutation();
  const [remove, removeState] = useDeleteServiceSchemaMutation();
  const top = useRef(null);
  const nameRef = useRef(null);
  const ids = useId();
  const writeState = isNew ? createState : saveState;
  const errors = fieldErrors(writeState.error);
  const dirty = !locked && Object.keys(draft).length > 0;
  const values = { ...state.values, ...draft };
  const options = state.options ?? {};

  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);

  useEffect(() => () => onDirtyChange?.(false), [onDirtyChange]);

  // Opened from the list: bring the editor into view, and a new service
  // straight to its name.
  useEffect(() => {
    if (!reveal) {
      return;
    }

    top.current?.scrollIntoView?.({ behavior: "smooth", block: "start" });

    if (isNew) {
      nameRef.current?.focus({ preventScroll: true });
    }
  }, [reveal, isNew]);

  const preview = useSchemaPreview({
    entity: "service",
    id: isNew ? 0 : state.id,
    list,
    draft,
    dirty,
    state,
    skip: locked,
  });
  const built = preview.result;

  const set = (changes) => {
    writeState.reset?.();
    setDraft((current) => ({ ...current, ...changes }));
  };

  const form = {
    values,
    set,
    locked,
    errors,
    field: (key) => `${ids}-${key}`,
    control: (key) =>
      input(locked ? "locked" : errors[key] ? "missing" : "open"),
  };

  const onSave = async () => {
    try {
      const result = isNew
        ? await create({ list, ...draft, name: values.name }).unwrap()
        : await save({ id: state.id, ...draft }).unwrap();

      setDraft({});
      toast.success(
        isNew
          ? __("Service added.", "foundhint-local-seo")
          : __("Service schema saved.", "foundhint-local-seo"),
      );
      onSaved?.(result?.id);
    } catch {
      toast.error(__("Some fields need attention.", "foundhint-local-seo"));
    }
  };

  if (saveRef) {
    saveRef.current = { save: onSave, discard: () => setDraft({}) };
  }

  const onRemove = async () => {
    try {
      await remove(state.id).unwrap();
      setConfirmRemove(false);
      setDraft({});
      toast.success(__("Service removed.", "foundhint-local-seo"));
      onRemoved?.();
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  // The latest build's word on the page and warnings, else the saved one.
  const warnings = built?.warnings ?? state.warnings ?? [];
  const resolved = built?.page?.url ?? state.page?.url ?? "";
  const pageTitle = built?.page?.title ?? state.page?.title ?? "";
  const document = locked ? state.node : preview.document;

  return (
    <div className="fhint:flex fhint:flex-wrap fhint:items-start fhint:gap-4">
      <section
        ref={top}
        aria-label={__("Service editor", "foundhint-local-seo")}
        className={cn(
          panel,
          "fhint:min-w-0 fhint:flex-[1_1_580px] fhint:scroll-mt-4",
        )}
      >
        <EditorBar
          title={
            values.name ||
            (isNew ? __("New service", "foundhint-local-seo") : "")
          }
          canRemove={!isNew && !locked}
          onRemove={() => setConfirmRemove(true)}
        />

        <BasicsSection
          form={form}
          fromGoogle={state.from_google}
          options={options}
          nameRef={nameRef}
        />
        <ProviderSection form={form} options={options} list={list} />
        <AreasSection form={form} suggestions={options.suggestions} />
        <PageSection
          form={form}
          resolved={resolved}
          pageTitle={pageTitle}
          usedBy={options.used_pages ?? {}}
          warnings={warnings.filter(
            (warning) => !PLACEMENT_WARNINGS.includes(warning.code),
          )}
        />
        <OptionalDetails form={form} />

        <PlacementCards
          title={__("Add this schema to", "foundhint-local-seo")}
          name={form.field("placement")}
          value={values.placement}
          postIds={values.post_ids}
          locked={locked}
          homeWarning={false}
          choices={[
            [
              "own_page",
              __("Its service page", "foundhint-local-seo"),
              pageTitle && values.page.mode === "wp"
                ? sprintf(
                    /* translators: %s: page title. */
                    __("Printed only on %s.", "foundhint-local-seo"),
                    pageTitle,
                  )
                : __(
                    "Printed only on the service page.",
                    "foundhint-local-seo",
                  ),
            ],
            [
              "chosen",
              __("Pages I choose", "foundhint-local-seo"),
              __("Pick the pages below.", "foundhint-local-seo"),
            ],
          ]}
          onChange={(next) => set({ placement: next })}
          onPages={(next) => set({ post_ids: next })}
        />

        {warnings
          .filter((warning) => PLACEMENT_WARNINGS.includes(warning.code))
          .map((warning) => (
            <p
              key={`${warning.code}-${warning.branch ?? ""}`}
              className={warningNote}
            >
              {warningText(warning)}
            </p>
          ))}

        {writeState.error && !Object.keys(errors).length ? (
          <p
            role="alert"
            className="fhint:mx-5 fhint:mb-3 fhint:text-[13px] fhint:text-[#C02718]"
          >
            {errorMessage(writeState.error)}
          </p>
        ) : null}

        {locked ? null : (
          <SaveBar
            dirty={dirty}
            saving={writeState.isLoading}
            status={values.status === "inactive" ? "inactive" : "active"}
            live={live}
            onSave={onSave}
          />
        )}
      </section>

      <JsonPreview
        document={document}
        rootType="Service"
        live={live && !dirty && values.status === "active"}
        loading={preview.loading && !document}
        dirty={dirty}
      />

      <RemoveDialog
        open={confirmRemove}
        name={state.values.name}
        removing={removeState.isLoading}
        onOpenChange={setConfirmRemove}
        onRemove={onRemove}
      />
    </div>
  );
}

export default ServiceEditor;
