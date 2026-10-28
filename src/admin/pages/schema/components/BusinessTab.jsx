import { useEffect, useMemo, useRef, useState } from "react";
import { __, sprintf } from "@wordpress/i18n";
import { toast } from "sonner";
import { cn } from "cn";
import { errorMessage, fieldErrors } from "@/lib/errors";
import {
  useGetSchemaTypesQuery,
  usePreviewSchemaMutation,
  useSaveBusinessSchemaMutation,
} from "@/store/api/schemaManagerApi";
import FieldRow from "./FieldRow";
import JsonPreview from "./JsonPreview";
import PlacementCards from "./PlacementCards";
import SaveBar from "./SaveBar";
import StatusBox from "./StatusBox";
import SubtypePicker from "./SubtypePicker";
import {
  BADGES,
  card,
  groupHead,
  input,
  label,
  muted,
  panel,
  pill,
} from "./styles";

const EMPTY = { overrides: {}, reset: [], extras: {} };

const GROUPS = [
  ["info", () => __("Business information", "foundhint-local-seo")],
  ["address", () => __("Address", "foundhint-local-seo")],
  ["reach", () => __("Hours and reach", "foundhint-local-seo")],
];

function isDirty(draft) {
  return Object.keys(draft).some((key) =>
    Array.isArray(draft[key])
      ? draft[key].length > 0
      : draft[key] && typeof draft[key] === "object"
        ? Object.keys(draft[key]).length > 0
        : draft[key] !== undefined,
  );
}

function blank(value) {
  return Array.isArray(value)
    ? value.length === 0
    : String(value ?? "").trim() === "";
}

/**
 * 01 Business schema — who the business is (doc §5).
 *
 * Unsaved changes live in `draft` until Save and publish; the preview is
 * rebuilt by the server from the draft, 400 ms after the last change.
 * Locked (no FoundHint Pro): the same screen, read-only, showing the
 * markup the free plugin already prints.
 */
export function BusinessTab({ state, locked, live, onDirtyChange, saveRef }) {
  const [draft, setDraft] = useState(EMPTY);
  const [editing, setEditing] = useState([]);
  const [preview, previewState] = usePreviewSchemaMutation();
  const [save, saveState] = useSaveBusinessSchemaMutation();
  const [built, setBuilt] = useState(null);
  const { data: types = [] } = useGetSchemaTypesQuery(undefined, {
    skip: locked,
  });
  const timer = useRef(0);

  const dirty =
    !locked &&
    isDirty({
      ...draft,
      overrides: draft.overrides,
      reset: draft.reset,
      extras: draft.extras,
    });
  const errors = fieldErrors(saveState.error);

  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);

  // The server builds the preview — from the saved settings, or the draft.
  useEffect(() => {
    if (locked) {
      return undefined;
    }

    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(async () => {
      try {
        setBuilt(
          await preview({
            entity: "business",
            draft: dirty ? draft : {},
          }).unwrap(),
        );
      } catch {
        // A draft with a bad value: keep the last good preview.
      }
    }, 400);

    return () => window.clearTimeout(timer.current);
  }, [draft, dirty, locked, preview, state]);

  const kind = draft.schema_kind ?? state.schema_kind;
  const type = draft.schema_type || state.type;
  const visitMode =
    draft.visit_mode ?? state.extras?.visit_mode ?? "storefront";
  const placement = draft.placement ?? state.placement;
  const postIds = draft.post_ids ?? state.post_ids;
  const organization = kind === "organization";
  const picked = types.find((option) => option.type === type);
  // The details for the type in force — a newly picked one's at once.
  const extraFields = draft.schema_type
    ? (picked?.extras ?? [])
    : (state.extra_fields ?? []);
  const typeLabel = picked?.label ?? state.type_label;

  const value = (field) => {
    if (Object.prototype.hasOwnProperty.call(draft.overrides, field.key)) {
      return draft.overrides[field.key];
    }

    if (draft.reset.includes(field.key)) {
      return field.google_value;
    }

    return field.value;
  };

  const fieldState = (field) => {
    if (draft.reset.includes(field.key)) {
      return { ...field, source: "google" };
    }

    return field;
  };

  const missing = useMemo(() => {
    const values = Object.fromEntries(
      state.fields.map((field) => [field.key, value(field)]),
    );
    const required = organization
      ? ["name"]
      : visitMode === "service_area"
        ? ["name", "areas_served"]
        : ["name", "street_address", "locality", "country"];

    return required.filter((key) => blank(values[key]));
  }, [state, draft, organization, visitMode]);

  const set = (changes) => {
    saveState.reset();
    setDraft((current) => ({ ...current, ...changes }));
  };

  const setOverride = (key, next) =>
    set({
      overrides: { ...draft.overrides, [key]: next },
      reset: draft.reset.filter((item) => item !== key),
    });

  const resetField = (key) => {
    const rest = { ...draft.overrides };

    delete rest[key];

    setEditing((current) => current.filter((item) => item !== key));
    set({
      overrides: rest,
      reset:
        state.fields.find((field) => field.key === key)?.source === "override"
          ? [...draft.reset.filter((item) => item !== key), key]
          : draft.reset.filter((item) => item !== key),
    });
  };

  const onSave = async () => {
    try {
      const result = await save(draft).unwrap();

      setDraft(EMPTY);
      setEditing([]);
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
    saveRef.current = {
      save: onSave,
      discard: () => {
        setDraft(EMPTY);
        setEditing([]);
      },
    };
  }

  const document = locked ? state.preview : (built?.document ?? null);
  const fields = state.fields.map(fieldState);
  const shown = fields.filter(
    (field) =>
      !organization || field.group === "info" || field.key === "social",
  );

  return (
    <div className="fhint:flex fhint:flex-wrap fhint:items-start fhint:gap-4">
      <section
        aria-labelledby="fhint-schema-business-title"
        className={cn(panel, "fhint:min-w-0 fhint:flex-[1_1_580px]")}
      >
        <div className="fhint:flex fhint:flex-wrap fhint:items-center fhint:gap-3 fhint:border-b fhint:border-b-[#e6e3e3] fhint:px-5 fhint:py-4">
          <span className="fhint:min-w-0 fhint:flex-[1_1_260px]">
            <h2
              id="fhint-schema-business-title"
              className="fhint:m-0 fhint:text-[16px] fhint:font-bold"
            >
              {__("Business schema", "foundhint-local-seo")}
            </h2>
            <span className={muted}>
              {organization
                ? __(
                    "Who owns or runs the business, however many locations it has.",
                    "foundhint-local-seo",
                  )
                : __(
                    "A business at a physical location, with its address, hours and category.",
                    "foundhint-local-seo",
                  )}
            </span>
          </span>
          {state.counter ? (
            <span
              className={cn(
                pill,
                BADGES.google,
                "fhint:px-2.5 fhint:py-[3px] fhint:text-[11.5px]",
              )}
            >
              {sprintf(
                /* translators: 1: fields filled from Google, 2: all fields. */
                __("%1$d of %2$d fields from Google", "foundhint-local-seo"),
                state.counter.from_google,
                state.counter.total,
              )}
            </span>
          ) : null}
        </div>

        <fieldset className="fhint:m-0 fhint:grid fhint:gap-2.5 fhint:border-0 fhint:border-b fhint:border-b-[#f0eeee] fhint:px-5 fhint:py-4">
          <legend
            className={cn(
              label,
              "fhint:float-left fhint:mb-1 fhint:w-full fhint:p-0",
            )}
          >
            {__("Schema type", "foundhint-local-seo")}
          </legend>
          <div className="fhint:grid fhint:grid-cols-[repeat(auto-fit,minmax(min(100%,260px),1fr))] fhint:gap-2.5">
            {[
              [
                "organization",
                __("Organization", "foundhint-local-seo"),
                __("Business-wide", "foundhint-local-seo"),
                __(
                  "For the overall company or brand. No address or opening hours needed.",
                  "foundhint-local-seo",
                ),
                __(
                  "e.g. a parent brand that owns five plumbing locations.",
                  "foundhint-local-seo",
                ),
              ],
              [
                "localbusiness",
                __("LocalBusiness / subtype", "foundhint-local-seo"),
                __("Location-specific", "foundhint-local-seo"),
                __(
                  "For a business customers visit or that serves a local area, with address, hours and category.",
                  "foundhint-local-seo",
                ),
                __(
                  "e.g. a dental clinic with its own address and opening hours.",
                  "foundhint-local-seo",
                ),
              ],
            ].map(([key, title, scope, purpose, example]) => (
              <label
                key={key}
                className={cn(
                  card(kind === key),
                  locked && "fhint:cursor-default",
                )}
              >
                <input
                  type="radio"
                  name="fhint-schema-kind"
                  checked={kind === key}
                  disabled={locked}
                  onChange={() => set({ schema_kind: key })}
                  className="fhint:mt-[3px] fhint:accent-[#FF6B35]"
                />
                <span className="fhint:grid fhint:min-w-0 fhint:gap-[5px]">
                  <span className="fhint:flex fhint:flex-wrap fhint:items-center fhint:gap-2">
                    <strong className="fhint:text-[14px]">{title}</strong>
                    <span className={cn(pill, BADGES.scope)}>{scope}</span>
                  </span>
                  <span className="fhint:text-[12.5px] fhint:leading-normal fhint:text-[#444141]">
                    {purpose}
                  </span>
                  <span className="fhint:text-[12px] fhint:leading-normal fhint:text-[#625e5e]">
                    {example}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        {organization ? null : (
          <SubtypePicker
            type={type}
            typeLabel={draft.schema_type ? draft.schema_type : state.type_label}
            matchedFrom={state.matched_from}
            locked={locked}
            onPick={(next) => set({ schema_type: next, extras: {} })}
          />
        )}

        <StatusBox kind={kind} visitMode={visitMode} missing={missing} />

        <div className="fhint:grid fhint:grid-cols-[repeat(auto-fill,minmax(min(100%,230px),1fr))] fhint:gap-4 fhint:px-5 fhint:pt-1 fhint:pb-[18px]">
          {GROUPS.map(([group, title]) => {
            const inGroup = shown.filter((field) => field.group === group);

            if (!inGroup.length) {
              return null;
            }

            return [
              <h3
                key={`${group}-head`}
                className={cn(
                  groupHead,
                  "fhint:col-span-full fhint:m-0 fhint:border-t-2 fhint:border-t-[#201e1d] fhint:pt-2.5",
                )}
              >
                {title()}
              </h3>,
              group === "address" ? (
                <fieldset
                  key="visit"
                  className="fhint:col-span-full fhint:m-0 fhint:grid fhint:gap-2 fhint:border-0 fhint:p-0"
                >
                  <legend
                    className={cn(
                      label,
                      "fhint:float-left fhint:mb-1 fhint:w-full fhint:p-0",
                    )}
                  >
                    {__("Customers visit you at", "foundhint-local-seo")}
                  </legend>
                  <div className="fhint:flex fhint:flex-wrap fhint:gap-2">
                    {[
                      [
                        "storefront",
                        __(
                          "This address (storefront or office)",
                          "foundhint-local-seo",
                        ),
                      ],
                      [
                        "service_area",
                        __(
                          "Their location (service area only)",
                          "foundhint-local-seo",
                        ),
                      ],
                    ].map(([mode, text]) => (
                      <label
                        key={mode}
                        className={cn(
                          card(visitMode === mode),
                          "fhint:py-2",
                          locked && "fhint:cursor-default",
                        )}
                      >
                        <input
                          type="radio"
                          name="fhint-visit-mode"
                          checked={visitMode === mode}
                          disabled={locked}
                          onChange={() => set({ visit_mode: mode })}
                          className="fhint:mt-[3px] fhint:accent-[#FF6B35]"
                        />
                        <span className="fhint:text-[13px]">{text}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              ) : null,
              ...inGroup
                .filter(
                  (field) =>
                    !(
                      visitMode === "service_area" &&
                      [
                        "street_address",
                        "postal_code",
                        "latitude",
                        "longitude",
                      ].includes(field.key)
                    ),
                )
                .map((field) => (
                  <FieldRow
                    key={field.key}
                    field={field}
                    value={value(field)}
                    editing={
                      editing.includes(field.key) ||
                      Object.prototype.hasOwnProperty.call(
                        draft.overrides,
                        field.key,
                      )
                    }
                    locked={locked}
                    missing={missing.includes(field.key)}
                    visitMode={visitMode}
                    error={errors[field.key]}
                    photos={state.photos}
                    onEdit={() =>
                      setEditing((current) => [...current, field.key])
                    }
                    onReset={() => resetField(field.key)}
                    onChange={(next) => setOverride(field.key, next)}
                  />
                )),
            ];
          })}

          {!organization && extraFields.length ? (
            <>
              <h3
                className={cn(
                  groupHead,
                  "fhint:col-span-full fhint:m-0 fhint:border-t-2 fhint:border-t-[#201e1d] fhint:pt-2.5",
                )}
              >
                {sprintf(
                  /* translators: %s: the business type, e.g. "Dental practice". */
                  __("Details for %s", "foundhint-local-seo"),
                  typeLabel,
                )}
              </h3>
              {extraFields.map((extra) => (
                <ExtraField
                  key={extra.key}
                  extra={extra}
                  value={
                    Object.prototype.hasOwnProperty.call(
                      draft.extras,
                      extra.key,
                    )
                      ? draft.extras[extra.key]
                      : state.extras?.[extra.key]
                  }
                  locked={locked}
                  error={errors[`extras.${extra.key}`]}
                  onChange={(next) =>
                    set({ extras: { ...draft.extras, [extra.key]: next } })
                  }
                />
              ))}
            </>
          ) : null}
        </div>

        <PlacementCards
          title={__("Add business schema to", "foundhint-local-seo")}
          name="fhint-business-placement"
          value={placement}
          postIds={postIds}
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
        loading={previewState.isLoading && !document}
        dirty={dirty}
      />
    </div>
  );
}

/** One type-specific detail: yes/no, a list, a time or text. */
function ExtraField({ extra, value, locked, error, onChange }) {
  const id = `fhint-extra-${extra.key}`;

  return (
    <div className="fhint:grid fhint:min-w-0 fhint:content-start fhint:gap-1.5">
      <div className="fhint:flex fhint:flex-wrap fhint:items-center fhint:gap-2">
        <label htmlFor={id} className={label}>
          {extra.label}
        </label>
        <span className={cn(pill, BADGES.optional)}>
          {__("Optional", "foundhint-local-seo")}
        </span>
      </div>
      {extra.kind === "bool" ? (
        <select
          id={id}
          value={value === true ? "yes" : value === false ? "no" : ""}
          disabled={locked}
          onChange={(event) =>
            onChange(
              event.target.value === "" ? "" : event.target.value === "yes",
            )
          }
          className={cn(input(locked ? "locked" : "open"), "fhint:pr-8!")}
        >
          <option value="">{__("Not set", "foundhint-local-seo")}</option>
          <option value="yes">{__("Yes", "foundhint-local-seo")}</option>
          <option value="no">{__("No", "foundhint-local-seo")}</option>
        </select>
      ) : extra.kind === "enum" ? (
        <select
          id={id}
          value={value ?? ""}
          disabled={locked}
          onChange={(event) => onChange(event.target.value)}
          className={cn(input(locked ? "locked" : "open"), "fhint:pr-8!")}
        >
          <option value="">{__("Not set", "foundhint-local-seo")}</option>
          {extra.options.map((option) => (
            <option key={option} value={option}>
              {option.replace(/([a-z])([A-Z])/g, "$1 $2")}
            </option>
          ))}
        </select>
      ) : (
        <input
          id={id}
          type={
            extra.kind === "time"
              ? "time"
              : extra.kind === "url"
                ? "url"
                : "text"
          }
          value={value ?? ""}
          readOnly={locked}
          onChange={(event) => onChange(event.target.value)}
          aria-invalid={error ? true : undefined}
          className={input(error ? "missing" : locked ? "locked" : "open")}
        />
      )}
      <code className="fhint:font-mono fhint:text-[11px] fhint:text-[#9b9797]">
        {extra.key}
      </code>
      {error ? (
        <span
          role="alert"
          className="fhint:text-[12px] fhint:font-bold fhint:text-[#C02718]"
        >
          {error}
        </span>
      ) : null}
    </div>
  );
}

export default BusinessTab;
