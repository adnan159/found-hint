import { useEffect, useRef, useState } from "react";
import { __, _n, sprintf } from "@wordpress/i18n";
import { toast } from "sonner";
import { cn } from "cn";
import { Switch } from "@/components/ui/switch";
import { errorMessage, fieldErrors } from "@/lib/errors";
import { focus } from "@/pages/profile/styles";
import {
  usePreviewSchemaMutation,
  useSaveLocationSchemaMutation,
} from "@/store/api/schemaManagerApi";
import FieldRow from "./FieldRow";
import JsonPreview from "./JsonPreview";
import PlacementCards from "./PlacementCards";
import SaveBar from "./SaveBar";
import {
  BADGES,
  chip,
  groupHead,
  input,
  label,
  muted,
  panel,
  pill,
} from "./styles";

const EMPTY = { overrides: {}, reset: [] };

const GROUPS = [
  ["branch", () => __("Branch", "foundhint-local-seo")],
  ["address", () => __("Address", "foundhint-local-seo")],
  ["contact", () => __("Contact", "foundhint-local-seo")],
  ["hours", () => __("Hours", "foundhint-local-seo")],
];

function isDirty(draft) {
  return (
    Object.keys(draft.overrides).length > 0 ||
    draft.reset.length > 0 ||
    ["parent", "status", "placement", "post_ids"].some(
      (key) => draft[key] !== undefined,
    )
  );
}

function pagesLine(branch) {
  if (branch.status === "inactive") {
    return __("Off", "foundhint-local-seo");
  }

  // The free markup: every location on every page.
  if (branch.pages === null) {
    return __("On every page", "foundhint-local-seo");
  }

  return sprintf(
    /* translators: %d: number of pages. */
    _n("On %d page", "On %d pages", branch.pages, "foundhint-local-seo"),
    branch.pages,
  );
}

/**
 * 02 Location schema — where each branch operates (doc §6).
 *
 * Every location but the main one is a branch; the main one is the
 * business. Each branch is typed like the business, linked to it by
 * parentOrganization, and placed on its own pages.
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
  const [draft, setDraft] = useState(EMPTY);
  const [editing, setEditing] = useState([]);
  const [preview, previewState] = usePreviewSchemaMutation();
  const [save, saveState] = useSaveLocationSchemaMutation();
  const [built, setBuilt] = useState(null);
  const timer = useRef(0);
  const dirty = !locked && isDirty(draft);
  const errors = fieldErrors(saveState.error);

  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);

  // A different branch starts clean.
  useEffect(() => {
    setDraft(EMPTY);
    setEditing([]);
    setBuilt(null);
  }, [branchId]);

  useEffect(() => {
    if (locked || !branchId) {
      return undefined;
    }

    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(async () => {
      try {
        setBuilt(
          await preview({
            entity: "location",
            id: branchId,
            draft: dirty ? draft : {},
          }).unwrap(),
        );
      } catch {
        // Keep the last good preview.
      }
    }, 400);

    return () => window.clearTimeout(timer.current);
  }, [draft, dirty, locked, preview, state, branchId]);

  if (!branches.length) {
    return (
      <section
        className={cn(
          panel,
          "fhint:grid fhint:justify-items-start fhint:gap-2 fhint:px-5 fhint:py-6",
        )}
      >
        <h2 className="fhint:m-0 fhint:text-[16px] fhint:font-bold">
          {__("Your business has one location", "foundhint-local-seo")}
        </h2>
        <p
          className={cn(
            muted,
            "fhint:m-0 fhint:max-w-[60ch] fhint:leading-relaxed",
          )}
        >
          {__(
            "Business schema already describes it, with its address and hours. Branches appear here when your Google account has more than one location.",
            "foundhint-local-seo",
          )}
        </p>
      </section>
    );
  }

  if (!branchId) {
    return (
      <section
        className={cn(panel, "fhint:grid fhint:gap-3 fhint:px-5 fhint:py-5")}
      >
        <h2 className="fhint:m-0 fhint:text-[16px] fhint:font-bold">
          {__("Location schema", "foundhint-local-seo")}
        </h2>
        <p
          className={cn(
            muted,
            "fhint:m-0 fhint:max-w-[64ch] fhint:leading-relaxed",
          )}
        >
          {__(
            "Your main location is selected at the top of the page. It is described in Business schema. Choose a branch to edit its schema — the top bar switches with it.",
            "foundhint-local-seo",
          )}
        </p>
        <div
          className="fhint:flex fhint:flex-wrap fhint:gap-2"
          role="group"
          aria-label={__("Branches", "foundhint-local-seo")}
        >
          {branches.map((branch) => (
            <button
              key={branch.id}
              type="button"
              onClick={() => onBranch(branch.id)}
              className={cn(
                "fhint:cursor-pointer fhint:border fhint:border-[#d7d3d3] fhint:bg-card fhint:px-3 fhint:py-2 fhint:text-left",
                focus,
              )}
            >
              <strong className="fhint:block fhint:text-[13.5px]">
                {branch.name}
              </strong>
              <span className="fhint:text-[12px] fhint:text-[#625e5e]">
                {pagesLine(branch)}
              </span>
            </button>
          ))}
        </div>
      </section>
    );
  }

  if (!state) {
    return null;
  }

  const set = (changes) => {
    saveState.reset();
    setDraft((current) => ({ ...current, ...changes }));
  };

  const value = (field) => {
    if (Object.prototype.hasOwnProperty.call(draft.overrides, field.key)) {
      return draft.overrides[field.key];
    }

    return draft.reset.includes(field.key) ? field.google_value : field.value;
  };

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
      const result = await save({ id: branchId, ...draft }).unwrap();

      setDraft(EMPTY);
      setEditing([]);
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
    saveRef.current = {
      save: onSave,
      discard: () => {
        setDraft(EMPTY);
        setEditing([]);
      },
    };
  }

  const parent = draft.parent ?? state.parent;
  const status =
    draft.status ?? (state.status === "inactive" ? "inactive" : "active");
  const placement = draft.placement ?? state.placement;
  const postIds = draft.post_ids ?? state.post_ids;
  const name =
    value(state.fields[0]) || __("this branch", "foundhint-local-seo");
  const values = Object.fromEntries(
    state.fields.map((field) => [field.key, value(field)]),
  );
  const missing = ["name", "street_address", "locality", "country"].filter(
    (key) => String(values[key] ?? "").trim() === "",
  );
  const document = locked ? state.preview : (built?.document ?? null);
  const closed = state.warnings?.includes("permanently_closed");

  return (
    <div className="fhint:flex fhint:flex-wrap fhint:items-start fhint:gap-4">
      <section
        aria-labelledby="fhint-schema-location-title"
        className={cn(panel, "fhint:min-w-0 fhint:flex-[1_1_580px]")}
      >
        <div className="fhint:flex fhint:flex-wrap fhint:items-center fhint:gap-3 fhint:border-b fhint:border-b-[#e6e3e3] fhint:px-5 fhint:py-4">
          <span className="fhint:min-w-0 fhint:flex-[1_1_260px]">
            <h2
              id="fhint-schema-location-title"
              className="fhint:m-0 fhint:text-[16px] fhint:font-bold"
            >
              {__("Location schema", "foundhint-local-seo")}
            </h2>
            <span className={muted}>
              {__(
                "Each branch: its own address, phone, hours and page, linked to your business.",
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

        <div className="fhint:grid fhint:gap-2 fhint:border-b fhint:border-b-[#f0eeee] fhint:px-5 fhint:py-3.5">
          <span className={label}>{__("Branch", "foundhint-local-seo")}</span>
          <div
            className="fhint:flex fhint:flex-wrap fhint:gap-2"
            role="group"
            aria-label={__("Branches", "foundhint-local-seo")}
          >
            {branches.map((branch) => {
              const on = branch.id === branchId;

              return (
                <button
                  key={branch.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => onBranch(branch.id)}
                  className={cn(
                    "fhint:cursor-pointer fhint:border fhint:bg-card fhint:px-3 fhint:py-2 fhint:text-left",
                    on
                      ? "fhint:border-[#FF6B35] fhint:bg-[#FFF8F4] fhint:shadow-[0_0_0_1px_#FF6B35]"
                      : "fhint:border-[#d7d3d3]",
                    branch.status === "inactive" && !on && "fhint:opacity-60",
                    focus,
                  )}
                >
                  <strong className="fhint:block fhint:text-[13.5px]">
                    {branch.name}
                  </strong>
                  <span className="fhint:text-[12px] fhint:text-[#625e5e]">
                    {pagesLine(branch)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="fhint:flex fhint:flex-wrap fhint:items-center fhint:gap-3 fhint:border-b fhint:border-b-[#f0eeee] fhint:px-5 fhint:py-3">
          <label className="fhint:flex fhint:items-center fhint:gap-2.5 fhint:text-[13px] fhint:font-bold">
            <Switch
              checked={status !== "inactive"}
              disabled={locked || closed}
              onCheckedChange={(on) =>
                set({ status: on ? "active" : "inactive" })
              }
            />
            {__("Print this branch's schema", "foundhint-local-seo")}
          </label>
          <span className={muted}>
            {closed
              ? __(
                  "This location is marked permanently closed on your profile, so nothing is printed for it.",
                  "foundhint-local-seo",
                )
              : status === "inactive"
                ? __(
                    "Off: its details are kept, and nothing is printed.",
                    "foundhint-local-seo",
                  )
                : missing.length
                  ? sprintf(
                      /* translators: %s: missing fields. */
                      __(
                        "Can't publish yet. Google needs: %s.",
                        "foundhint-local-seo",
                      ),
                      missing.join(", "),
                    )
                  : __(
                      "Has the details Google needs for this branch.",
                      "foundhint-local-seo",
                    )}
          </span>
        </div>

        <div className="fhint:grid fhint:grid-cols-[repeat(auto-fill,minmax(min(100%,230px),1fr))] fhint:gap-4 fhint:px-5 fhint:pt-1 fhint:pb-[18px]">
          {GROUPS.map(([group, title]) => {
            const inGroup = state.fields.filter(
              (field) => field.group === group,
            );

            return [
              <h3
                key={`${group}-head`}
                className={cn(
                  groupHead,
                  "fhint:col-span-full fhint:m-0 fhint:mt-3 fhint:border-t-2 fhint:border-t-[#201e1d] fhint:pt-2.5",
                )}
              >
                {title()}
              </h3>,
              ...inGroup.map((field) => (
                <FieldRow
                  key={field.key}
                  field={
                    draft.reset.includes(field.key)
                      ? { ...field, source: "google" }
                      : field
                  }
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
                  visitMode="storefront"
                  error={errors[field.key]}
                  scope="location"
                  onEdit={() =>
                    setEditing((current) => [...current, field.key])
                  }
                  onReset={() => resetField(field.key)}
                  onChange={(next) =>
                    set({
                      overrides: { ...draft.overrides, [field.key]: next },
                      reset: draft.reset.filter((item) => item !== field.key),
                    })
                  }
                />
              )),
              group === "branch" ? (
                <div
                  key="parent"
                  className="fhint:grid fhint:min-w-0 fhint:content-start fhint:gap-1.5"
                >
                  <label htmlFor="fhint-location-parent" className={label}>
                    {__("Part of", "foundhint-local-seo")}
                  </label>
                  <select
                    id="fhint-location-parent"
                    value={parent}
                    disabled={locked}
                    onChange={(event) => set({ parent: event.target.value })}
                    aria-describedby="fhint-location-parent-hint"
                    className={cn(
                      input(locked ? "locked" : "open"),
                      "fhint:pr-8!",
                    )}
                  >
                    <option value="business">
                      {sprintf(
                        /* translators: %s: the business name. */
                        __("%s (Business schema)", "foundhint-local-seo"),
                        state.parent_name,
                      )}
                    </option>
                    <option value="none">
                      {__("Not part of a group", "foundhint-local-seo")}
                    </option>
                  </select>
                  <code
                    id="fhint-location-parent-hint"
                    className="fhint:font-mono fhint:text-[11px] fhint:text-[#9b9797]"
                  >
                    parentOrganization
                  </code>
                </div>
              ) : null,
              group === "branch" ? (
                <div
                  key="sisters"
                  className="fhint:grid fhint:min-w-0 fhint:content-start fhint:gap-1.5"
                >
                  <span className={label}>
                    {__("Sister branches", "foundhint-local-seo")}
                  </span>
                  <div className="fhint:flex fhint:flex-wrap fhint:gap-1.5">
                    {state.sisters?.length ? (
                      state.sisters.map((sister) => (
                        <span
                          key={sister}
                          className={cn(chip(false), "fhint:cursor-default")}
                        >
                          {sister}
                        </span>
                      ))
                    ) : (
                      <span className={muted}>
                        {parent === "business"
                          ? __(
                              "No other branch in the group.",
                              "foundhint-local-seo",
                            )
                          : __("Not part of a group.", "foundhint-local-seo")}
                      </span>
                    )}
                  </div>
                </div>
              ) : null,
            ];
          })}
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

        {placement === "every_page" && branches.length > 1 ? (
          <p className="fhint:mx-5 fhint:mt-0 fhint:mb-3 fhint:text-[12.5px] fhint:font-semibold fhint:text-[#8a5a00]">
            {__(
              "With more than one branch, every page would claim every branch. Choose each branch's own pages instead.",
              "foundhint-local-seo",
            )}
          </p>
        ) : null}
        {placement === "chosen" && !postIds.length ? (
          <p className="fhint:mx-5 fhint:mt-0 fhint:mb-3 fhint:text-[12.5px] fhint:font-semibold fhint:text-[#8a5a00]">
            {__(
              "No pages chosen yet, so this branch prints nowhere. Pick its page, and your Contact page.",
              "foundhint-local-seo",
            )}
          </p>
        ) : null}

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

export default LocationTab;
