import { useEffect, useId, useRef, useState } from "react";
import { __, sprintf } from "@wordpress/i18n";
import { ChevronDownIcon, XIcon } from "lucide-react";
import { toast } from "sonner";
import { cn } from "cn";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import Hint from "@/components/Hint";
import { errorMessage, fieldErrors } from "@/lib/errors";
import { focus } from "@/pages/profile/styles";
import {
  useCreateServiceSchemaMutation,
  useDeleteServiceSchemaMutation,
  useGetSchemaPagesQuery,
  usePreviewSchemaMutation,
  useSaveServiceSchemaMutation,
} from "@/store/api/schemaManagerApi";
import JsonPreview from "./JsonPreview";
import PlacementCards from "./PlacementCards";
import SaveBar from "./SaveBar";
import { warningText } from "./ServiceList";
import { BADGES, card, chip, input, label, muted, panel, pill } from "./styles";

const AREA_TYPES = [
  ["City", () => __("City or town", "foundhint-local-seo")],
  ["AdministrativeArea", () => __("Region or state", "foundhint-local-seo")],
  ["Place", () => __("Named area", "foundhint-local-seo")],
  ["Country", () => __("Country", "foundhint-local-seo")],
];

const CURRENCIES = [
  "USD",
  "EUR",
  "GBP",
  "CAD",
  "AUD",
  "INR",
  "BDT",
  "PKR",
  "AED",
  "SAR",
  "SGD",
  "MYR",
  "ZAR",
  "NZD",
];

const MAX_DESCRIPTION = 300;

export function areaTypeLabel(type) {
  const found = AREA_TYPES.find(([key]) => key === type);

  return found ? found[1]() : type;
}

const dialogButton = cn(
  "fhint:cursor-pointer fhint:border fhint:border-[#bab6b6] fhint:bg-card fhint:px-3.5 fhint:py-2 fhint:text-[13px] fhint:font-bold",
  focus,
);

function Section({ number, title, hint, children }) {
  const id = useId();

  return (
    <section
      aria-labelledby={id}
      className="fhint:grid fhint:gap-3 fhint:border-t fhint:border-t-[#f0eeee] fhint:px-5 fhint:py-4"
    >
      <div className="fhint:flex fhint:items-center fhint:gap-2">
        <span className="fhint:font-mono fhint:text-[11px] fhint:text-[#9b9797]">
          {number}
        </span>
        <h3 id={id} className="fhint:m-0 fhint:text-[14px] fhint:font-bold">
          {title}
        </h3>
        {hint ? <Hint about={title} text={hint} /> : null}
      </div>
      {children}
    </section>
  );
}

function FieldError({ id, messages }) {
  const text = Array.isArray(messages) ? messages.join(" ") : messages;

  if (!text) {
    return null;
  }

  return (
    <span
      id={id}
      role="alert"
      className="fhint:text-[12.5px] fhint:text-[#C02718]"
    >
      {text}
    </span>
  );
}

/**
 * One service's editor (doc §7.2): 01 Service, 02 Service provider, 03
 * Service areas, 04 Service page, 05 Optional details, and where it is
 * printed. Keyed by the service by its parent, so another service starts
 * clean.
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
  const [built, setBuilt] = useState(null);
  const [areaName, setAreaName] = useState("");
  const [areaType, setAreaType] = useState("City");
  const [pageSearch, setPageSearch] = useState("");
  const [optionalOpen, setOptionalOpen] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [preview, previewState] = usePreviewSchemaMutation();
  const [save, saveState] = useSaveServiceSchemaMutation();
  const [create, createState] = useCreateServiceSchemaMutation();
  const [remove, removeState] = useDeleteServiceSchemaMutation();
  const timer = useRef(0);
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

  useEffect(() => {
    if (locked) {
      return undefined;
    }

    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(async () => {
      try {
        setBuilt(
          await preview({
            entity: "service",
            id: isNew ? 0 : state.id,
            list,
            draft: dirty ? draft : {},
          }).unwrap(),
        );
      } catch {
        // Keep the last good preview.
      }
    }, 400);

    return () => window.clearTimeout(timer.current);
  }, [draft, dirty, isNew, list, locked, preview, state]);

  const { data: pageData } = useGetSchemaPagesQuery(
    {
      search: pageSearch,
      include: values.page.post_id ? [values.page.post_id] : [],
    },
    { skip: locked || values.page.mode !== "wp" },
  );
  const pages = pageData?.pages ?? [];

  const set = (changes) => {
    writeState.reset?.();
    setDraft((current) => ({ ...current, ...changes }));
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
    saveRef.current = {
      save: onSave,
      discard: () => setDraft({}),
    };
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

  const areas = values.areas ?? [];
  const addArea = (name, type, source = "manual") => {
    const clean = name.trim();

    if (
      !clean ||
      areas.some(
        (area) =>
          area.name.toLowerCase() === clean.toLowerCase() && area.type === type,
      )
    ) {
      return;
    }

    set({ areas: [...areas, { name: clean, type, source }] });
  };

  const suggestions = (options.suggestions ?? []).filter(
    (name) =>
      !areas.some((area) => area.name.toLowerCase() === name.toLowerCase()),
  );
  const branches = options.branches ?? [];
  const categories = options.categories ?? [];
  const pricing = values.pricing;
  const priced = pricing.model !== "none";
  const warnings = built?.warnings ?? state.warnings ?? [];
  const pageWarnings = warnings.filter(
    (warning) => !["no_pages", "branch_off"].includes(warning.code),
  );
  const resolved = built?.page?.url ?? state.page?.url ?? "";
  const pageTitle = built?.page?.title ?? state.page?.title ?? "";
  const usedBy = options.used_pages ?? {};
  const currencies = CURRENCIES.includes(pricing.currency)
    ? CURRENCIES
    : [pricing.currency, ...CURRENCIES];
  const document = locked ? state.node : (built?.document ?? null);
  const title =
    values.name || (isNew ? __("New service", "foundhint-local-seo") : "");
  const optionalSummary = !priced
    ? __("No price", "foundhint-local-seo")
    : pricing.model === "range"
      ? `${pricing.price || "…"}–${pricing.max || "…"} ${pricing.currency}`
      : pricing.model === "from"
        ? sprintf(
            /* translators: 1: price, 2: currency. */
            __("From %1$s %2$s", "foundhint-local-seo"),
            pricing.price || "…",
            pricing.currency,
          )
        : `${pricing.price || "…"} ${pricing.currency}`;

  const field = (key) => `${ids}-${key}`;
  const control = (key) =>
    cn(input(locked ? "locked" : errors[key] ? "missing" : "open"));

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
        <div className="fhint:flex fhint:flex-wrap fhint:items-center fhint:gap-3 fhint:bg-[#201e1d] fhint:px-5 fhint:py-3 fhint:text-white">
          <span className="fhint:text-[11px] fhint:font-bold fhint:tracking-[0.08em] fhint:text-[#bab6b6] fhint:uppercase">
            {__("Editing", "foundhint-local-seo")}
          </span>
          <strong className="fhint:min-w-0 fhint:flex-1 fhint:truncate fhint:text-[14px]">
            {title}
          </strong>
          {!isNew && !locked ? (
            <button
              type="button"
              onClick={() => setConfirmRemove(true)}
              className={cn(
                "fhint:cursor-pointer fhint:border fhint:border-[#625e5e] fhint:bg-transparent fhint:px-2.5 fhint:py-1 fhint:text-[12px] fhint:font-bold fhint:text-white",
                focus,
              )}
            >
              {__("Remove service", "foundhint-local-seo")}
            </button>
          ) : null}
        </div>

        <Section
          number="01"
          title={__("Service", "foundhint-local-seo")}
          hint={__(
            "What you offer, in the words customers use. The description should match what the service page says.",
            "foundhint-local-seo",
          )}
        >
          <div className="fhint:grid fhint:grid-cols-[repeat(auto-fill,minmax(min(100%,240px),1fr))] fhint:gap-4">
            <div className="fhint:grid fhint:content-start fhint:gap-1.5">
              <span className="fhint:flex fhint:flex-wrap fhint:items-center fhint:gap-1.5">
                <label htmlFor={field("name")} className={label}>
                  {__("Service name", "foundhint-local-seo")}
                </label>
                <span className={cn(pill, BADGES.required)}>
                  {__("Required", "foundhint-local-seo")}
                </span>
                {state.from_google ? (
                  <span className={cn(pill, BADGES.google)}>
                    {__("From Google", "foundhint-local-seo")}
                  </span>
                ) : null}
              </span>
              <input
                ref={nameRef}
                id={field("name")}
                value={values.name}
                disabled={locked}
                onChange={(event) => set({ name: event.target.value })}
                placeholder={__("e.g. Teeth whitening", "foundhint-local-seo")}
                aria-invalid={Boolean(errors.name)}
                aria-describedby={errors.name ? field("name-error") : undefined}
                className={control("name")}
              />
              <FieldError id={field("name-error")} messages={errors.name} />
            </div>

            <div className="fhint:grid fhint:content-start fhint:gap-1.5">
              <label htmlFor={field("type")} className={label}>
                {__("Service category", "foundhint-local-seo")}
              </label>
              <input
                id={field("type")}
                list={field("types")}
                value={values.service_type}
                disabled={locked}
                onChange={(event) => set({ service_type: event.target.value })}
                placeholder={
                  categories.length
                    ? __("Pick or type a category", "foundhint-local-seo")
                    : __("e.g. Orthodontics", "foundhint-local-seo")
                }
                aria-describedby={field("type-hint")}
                className={control("service_type")}
              />
              <datalist id={field("types")}>
                {categories.map((category) => (
                  <option key={category} value={category} />
                ))}
              </datalist>
              <code
                id={field("type-hint")}
                className="fhint:font-mono fhint:text-[11px] fhint:text-[#9b9797]"
              >
                serviceType
              </code>
              <FieldError messages={errors.service_type} />
            </div>

            <div className="fhint:col-span-full fhint:grid fhint:gap-1.5">
              <span className="fhint:flex fhint:items-center fhint:justify-between fhint:gap-2">
                <label htmlFor={field("description")} className={label}>
                  {__("Short description", "foundhint-local-seo")}
                </label>
                <span
                  className={cn(
                    muted,
                    values.description.length > MAX_DESCRIPTION &&
                      "fhint:font-bold fhint:text-[#C02718]",
                  )}
                >
                  {`${values.description.length}/${MAX_DESCRIPTION}`}
                </span>
              </span>
              <textarea
                id={field("description")}
                rows={2}
                value={values.description}
                disabled={locked}
                onChange={(event) => set({ description: event.target.value })}
                placeholder={__(
                  "One or two sentences on what's included.",
                  "foundhint-local-seo",
                )}
                className={control("description")}
              />
              <FieldError messages={errors.description} />
            </div>

            <div className="fhint:grid fhint:content-start fhint:gap-1.5">
              <label htmlFor={field("status")} className={label}>
                {__("Status", "foundhint-local-seo")}
              </label>
              <select
                id={field("status")}
                value={values.status}
                disabled={locked}
                onChange={(event) => set({ status: event.target.value })}
                className={cn(control("status"), "fhint:pr-8!")}
              >
                <option value="active">
                  {__("Active, publish it", "foundhint-local-seo")}
                </option>
                <option value="inactive">
                  {__("Inactive, keep it off my site", "foundhint-local-seo")}
                </option>
              </select>
            </div>

            <div className="fhint:grid fhint:content-start fhint:gap-1.5">
              <span className="fhint:flex fhint:items-center fhint:gap-1.5">
                <label htmlFor={field("image")} className={label}>
                  {__("Image", "foundhint-local-seo")}
                </label>
                <span className={cn(pill, BADGES.optional)}>
                  {__("Optional", "foundhint-local-seo")}
                </span>
              </span>
              <select
                id={field("image")}
                value={values.image.mode}
                disabled={locked}
                onChange={(event) =>
                  set({
                    image: { ...values.image, mode: event.target.value },
                  })
                }
                className={cn(control("image"), "fhint:pr-8!")}
              >
                <option value="none">
                  {__("No image", "foundhint-local-seo")}
                </option>
                {values.page.mode === "wp" ? (
                  <option value="featured">
                    {__(
                      "Featured image of the service page",
                      "foundhint-local-seo",
                    )}
                  </option>
                ) : null}
                <option value="url">
                  {__("An image address (URL)", "foundhint-local-seo")}
                </option>
              </select>
              {values.image.mode === "featured" && !options.featured ? (
                <span className="fhint:text-[12px] fhint:text-[#8a5a00]">
                  {__(
                    "The service page has no featured image yet, so none is printed.",
                    "foundhint-local-seo",
                  )}
                </span>
              ) : null}
              <FieldError messages={errors.image} />
            </div>

            {values.image.mode === "url" ? (
              <div className="fhint:grid fhint:content-start fhint:gap-1.5">
                <label htmlFor={field("image-url")} className={label}>
                  {__("Image URL", "foundhint-local-seo")}
                </label>
                <input
                  id={field("image-url")}
                  type="url"
                  value={values.image.url}
                  disabled={locked}
                  onChange={(event) =>
                    set({ image: { mode: "url", url: event.target.value } })
                  }
                  placeholder="https://"
                  className={control("image")}
                />
              </div>
            ) : null}
          </div>
        </Section>

        <Section
          number="02"
          title={__("Service provider", "foundhint-local-seo")}
          hint={__(
            "Who offers it. The service points at your business or branch, so it never creates a second business.",
            "foundhint-local-seo",
          )}
        >
          <fieldset className="fhint:m-0 fhint:grid fhint:grid-cols-[repeat(auto-fit,minmax(min(100%,220px),1fr))] fhint:gap-2 fhint:border-0 fhint:p-0">
            <legend className="fhint:sr-only">
              {__("Provided by", "foundhint-local-seo")}
            </legend>
            {[
              [
                "business",
                __("Main business", "foundhint-local-seo"),
                sprintf(
                  /* translators: %s: the business name. */
                  __("%s, from Business schema.", "foundhint-local-seo"),
                  options.business,
                ),
              ],
              [
                "branches",
                __("Specific branches", "foundhint-local-seo"),
                branches.length
                  ? __(
                      "One or more branches from Location schema.",
                      "foundhint-local-seo",
                    )
                  : __("Your business has no branches.", "foundhint-local-seo"),
              ],
            ].map(([key, text, body]) => (
              <label
                key={key}
                className={cn(
                  card(values.provider.mode === key),
                  (locked || (key === "branches" && !branches.length)) &&
                    "fhint:cursor-default fhint:opacity-70",
                )}
              >
                <input
                  type="radio"
                  name={field("provider")}
                  checked={values.provider.mode === key}
                  disabled={locked || (key === "branches" && !branches.length)}
                  onChange={() =>
                    set({
                      provider: {
                        mode: key,
                        branch_ids:
                          key === "branches" && list
                            ? [list]
                            : values.provider.branch_ids,
                      },
                    })
                  }
                  className="fhint:mt-[3px] fhint:accent-[#FF6B35]"
                />
                <span>
                  <strong className="fhint:block fhint:text-[13.5px]">
                    {text}
                  </strong>
                  <span className={muted}>{body}</span>
                </span>
              </label>
            ))}
          </fieldset>

          {values.provider.mode === "branches" ? (
            <div className="fhint:grid fhint:gap-1.5">
              <span className={label} id={field("branches")}>
                {__("Branches that provide it", "foundhint-local-seo")}
              </span>
              <div
                className="fhint:flex fhint:flex-wrap fhint:gap-1.5"
                role="group"
                aria-labelledby={field("branches")}
              >
                {branches.map((branch) => {
                  const on = values.provider.branch_ids.includes(branch.id);

                  return (
                    <button
                      key={branch.id}
                      type="button"
                      aria-pressed={on}
                      disabled={locked}
                      onClick={() =>
                        set({
                          provider: {
                            mode: "branches",
                            branch_ids: on
                              ? values.provider.branch_ids.filter(
                                  (id) => id !== branch.id,
                                )
                              : [...values.provider.branch_ids, branch.id],
                          },
                        })
                      }
                      className={chip(on)}
                    >
                      {branch.name}
                    </button>
                  );
                })}
              </div>
              <FieldError messages={errors.provider} />
            </div>
          ) : (
            <FieldError messages={errors.provider} />
          )}

          <div className="fhint:grid fhint:grid-cols-[repeat(auto-fill,minmax(min(100%,240px),1fr))] fhint:gap-4">
            <div className="fhint:grid fhint:content-start fhint:gap-1.5">
              <span className="fhint:flex fhint:items-center fhint:gap-1.5">
                <label htmlFor={field("person")} className={label}>
                  {__("Specific provider", "foundhint-local-seo")}
                </label>
                <span className={cn(pill, BADGES.optional)}>
                  {__("Optional", "foundhint-local-seo")}
                </span>
                <Hint
                  about={__("Specific provider", "foundhint-local-seo")}
                  text={__(
                    "A dentist, technician or partner company who does the work. They are added as their own entry linked to your business, which stays the provider.",
                    "foundhint-local-seo",
                  )}
                />
              </span>
              <input
                id={field("person")}
                value={values.person.name}
                disabled={locked}
                onChange={(event) =>
                  set({
                    person: { ...values.person, name: event.target.value },
                  })
                }
                placeholder={__(
                  "e.g. Dr. Farhana Rahman",
                  "foundhint-local-seo",
                )}
                className={control("person")}
              />
              <FieldError messages={errors.person} />
            </div>
            <div className="fhint:grid fhint:content-start fhint:gap-1.5">
              <label htmlFor={field("person-type")} className={label}>
                {__("Provider is a", "foundhint-local-seo")}
              </label>
              <select
                id={field("person-type")}
                value={values.person.type}
                disabled={locked}
                onChange={(event) =>
                  set({
                    person: { ...values.person, type: event.target.value },
                  })
                }
                className={cn(control("person"), "fhint:pr-8!")}
              >
                <option value="Person">
                  {__("Person (dentist, technician)", "foundhint-local-seo")}
                </option>
                <option value="Organization">
                  {__("Partner company", "foundhint-local-seo")}
                </option>
              </select>
            </div>
          </div>
        </Section>

        <Section
          number="03"
          title={__("Service areas", "foundhint-local-seo")}
          hint={__(
            "Only add places you genuinely serve. A service area is not your business address, which lives in Location schema.",
            "foundhint-local-seo",
          )}
        >
          <ul
            className="fhint:m-0 fhint:flex fhint:list-none fhint:flex-wrap fhint:gap-1.5 fhint:p-0"
            aria-label={__("Areas served", "foundhint-local-seo")}
          >
            {areas.map((area) => (
              <li
                key={`${area.type}-${area.name}`}
                className="fhint:inline-flex fhint:items-center fhint:gap-1.5 fhint:border fhint:border-[#d7d3d3] fhint:bg-card fhint:py-1 fhint:pr-1 fhint:pl-2.5 fhint:text-[12.5px]"
              >
                <strong>{area.name}</strong>
                <span className="fhint:text-[11.5px] fhint:text-[#625e5e]">
                  {areaTypeLabel(area.type)}
                </span>
                {locked ? null : (
                  <button
                    type="button"
                    onClick={() =>
                      set({ areas: areas.filter((item) => item !== area) })
                    }
                    aria-label={sprintf(
                      /* translators: %s: a place name. */
                      __("Remove %s", "foundhint-local-seo"),
                      area.name,
                    )}
                    className={cn(
                      "fhint:inline-flex fhint:cursor-pointer fhint:border-0 fhint:bg-transparent fhint:p-0.5 fhint:text-[#625e5e]",
                      focus,
                    )}
                  >
                    <XIcon aria-hidden="true" className="fhint:size-3.5" />
                  </button>
                )}
              </li>
            ))}
            {!areas.length ? (
              <li className={muted}>
                {__("No areas yet.", "foundhint-local-seo")}
              </li>
            ) : null}
          </ul>

          {locked ? null : (
            <div className="fhint:flex fhint:flex-wrap fhint:gap-2">
              <input
                value={areaName}
                onChange={(event) => setAreaName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    addArea(areaName, areaType);
                    setAreaName("");
                  }
                }}
                placeholder={__(
                  "City, region or named area",
                  "foundhint-local-seo",
                )}
                aria-label={__("Area name", "foundhint-local-seo")}
                className={cn(
                  input("open"),
                  "fhint:max-w-[260px] fhint:flex-1",
                )}
              />
              <select
                value={areaType}
                onChange={(event) => setAreaType(event.target.value)}
                aria-label={__("Area type", "foundhint-local-seo")}
                className={cn(input("open"), "fhint:w-auto fhint:pr-8!")}
              >
                {AREA_TYPES.map(([key, text]) => (
                  <option key={key} value={key}>
                    {text()}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={!areaName.trim()}
                onClick={() => {
                  addArea(areaName, areaType);
                  setAreaName("");
                }}
                className={cn(chip(false), "disabled:fhint:opacity-50")}
              >
                {__("Add", "foundhint-local-seo")}
              </button>
            </div>
          )}

          {!locked && suggestions.length ? (
            <div className="fhint:flex fhint:flex-wrap fhint:items-center fhint:gap-1.5">
              <span className={muted}>
                {__("From your Google service area:", "foundhint-local-seo")}
              </span>
              {suggestions.map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => addArea(name, "Place", "google")}
                  className={chip(false)}
                >
                  {`+ ${name}`}
                </button>
              ))}
            </div>
          ) : null}
          <FieldError messages={errors.areas} />
        </Section>

        <Section
          number="04"
          title={__("Service page", "foundhint-local-seo")}
          hint={__(
            "The page about this service. The schema is printed there, and its address becomes the service's identity.",
            "foundhint-local-seo",
          )}
        >
          <div
            className="fhint:flex fhint:gap-0"
            role="group"
            aria-label={__("Service page source", "foundhint-local-seo")}
          >
            {[
              ["wp", __("WordPress page", "foundhint-local-seo")],
              ["url", __("Enter a URL", "foundhint-local-seo")],
            ].map(([key, text]) => (
              <button
                key={key}
                type="button"
                aria-pressed={values.page.mode === key}
                disabled={locked}
                onClick={() =>
                  set({
                    page: {
                      mode: key,
                      post_id: key === "wp" ? values.page.post_id : 0,
                      url: key === "url" ? values.page.url || resolved : "",
                    },
                    ...(key === "url" && values.image.mode === "featured"
                      ? { image: { mode: "none", url: "" } }
                      : {}),
                  })
                }
                className={chip(values.page.mode === key)}
              >
                {text}
              </button>
            ))}
          </div>

          {values.page.mode === "wp" ? (
            locked ? (
              <span className={muted}>{pageTitle || resolved}</span>
            ) : (
              <div className="fhint:flex fhint:flex-wrap fhint:gap-2">
                <input
                  type="search"
                  value={pageSearch}
                  onChange={(event) => setPageSearch(event.target.value)}
                  placeholder={__("Search your pages", "foundhint-local-seo")}
                  aria-label={__("Search your pages", "foundhint-local-seo")}
                  className={cn(input("open"), "fhint:max-w-[220px]")}
                />
                <select
                  value={values.page.post_id || ""}
                  onChange={(event) =>
                    set({
                      page: {
                        mode: "wp",
                        post_id: Number(event.target.value) || 0,
                        url: "",
                      },
                    })
                  }
                  aria-label={__("WordPress page", "foundhint-local-seo")}
                  aria-invalid={Boolean(errors.page)}
                  className={cn(
                    control("page"),
                    "fhint:min-w-[220px] fhint:flex-1 fhint:pr-8!",
                  )}
                >
                  <option value="">
                    {__("Choose a page", "foundhint-local-seo")}
                  </option>
                  {pages.map((page) => (
                    <option key={page.id} value={page.id}>
                      {usedBy[page.id]?.length
                        ? sprintf(
                            /* translators: 1: page title, 2: services that use it. */
                            __("%1$s — Used by %2$s", "foundhint-local-seo"),
                            page.front
                              ? __("Home", "foundhint-local-seo")
                              : page.title,
                            usedBy[page.id].join(", "),
                          )
                        : page.front
                          ? __("Home", "foundhint-local-seo")
                          : page.title}
                    </option>
                  ))}
                </select>
              </div>
            )
          ) : (
            <input
              type="url"
              value={values.page.url}
              disabled={locked}
              onChange={(event) =>
                set({
                  page: { mode: "url", post_id: 0, url: event.target.value },
                })
              }
              placeholder={`${window.location.origin}/services/…`}
              aria-label={__("Service page URL", "foundhint-local-seo")}
              aria-invalid={Boolean(errors.page)}
              className={control("page")}
            />
          )}
          <FieldError messages={errors.page} />

          {resolved ? (
            <span className={muted}>
              {__("Primary landing page:", "foundhint-local-seo")}{" "}
              <code className="fhint:font-mono fhint:text-[12px] fhint:break-all">
                {resolved}
              </code>
            </span>
          ) : null}

          {pageWarnings.length ? (
            <ul
              aria-live="polite"
              className="fhint:m-0 fhint:grid fhint:list-none fhint:gap-1.5 fhint:p-0"
            >
              {pageWarnings.map((warning) => (
                <li
                  key={warning.code}
                  className="fhint:border-l-[3px] fhint:border-l-[#E0A33A] fhint:bg-[#FBF0DE] fhint:px-3 fhint:py-2 fhint:text-[12.5px] fhint:text-[#5c3d00]"
                >
                  <span className="fhint:sr-only">
                    {__("Check:", "foundhint-local-seo")}{" "}
                  </span>
                  {warningText(warning)}
                </li>
              ))}
            </ul>
          ) : null}
        </Section>

        <section className="fhint:border-t fhint:border-t-[#f0eeee]">
          <button
            type="button"
            aria-expanded={optionalOpen}
            aria-controls={field("optional")}
            onClick={() => setOptionalOpen((open) => !open)}
            className={cn(
              "fhint:flex fhint:w-full fhint:cursor-pointer fhint:items-center fhint:gap-2 fhint:border-0 fhint:bg-transparent fhint:px-5 fhint:py-4 fhint:text-left",
              focus,
            )}
          >
            <span className="fhint:font-mono fhint:text-[11px] fhint:text-[#9b9797]">
              05
            </span>
            <strong className="fhint:text-[14px]">
              {__("Optional details", "foundhint-local-seo")}
            </strong>
            <span className={cn(muted, "fhint:flex-1")}>{optionalSummary}</span>
            <ChevronDownIcon
              aria-hidden="true"
              className={cn(
                "fhint:size-4 fhint:transition-transform",
                optionalOpen && "fhint:rotate-180",
              )}
            />
          </button>
          {optionalOpen ? (
            <div
              id={field("optional")}
              className="fhint:grid fhint:grid-cols-[repeat(auto-fill,minmax(min(100%,180px),1fr))] fhint:gap-4 fhint:px-5 fhint:pb-4"
            >
              <div className="fhint:grid fhint:content-start fhint:gap-1.5">
                <span className="fhint:flex fhint:items-center fhint:gap-1.5">
                  <label htmlFor={field("pricing")} className={label}>
                    {__("Pricing", "foundhint-local-seo")}
                  </label>
                  <Hint
                    about={__("Pricing", "foundhint-local-seo")}
                    text={__(
                      "Only publish a price you would honour. The price is shared with your Business Profile's service list.",
                      "foundhint-local-seo",
                    )}
                  />
                </span>
                <select
                  id={field("pricing")}
                  value={pricing.model}
                  disabled={locked}
                  onChange={(event) =>
                    set({ pricing: { ...pricing, model: event.target.value } })
                  }
                  className={cn(control("pricing"), "fhint:pr-8!")}
                >
                  <option value="none">
                    {__("No price", "foundhint-local-seo")}
                  </option>
                  <option value="fixed">
                    {__("Fixed price", "foundhint-local-seo")}
                  </option>
                  <option value="from">
                    {__("Starting at", "foundhint-local-seo")}
                  </option>
                  <option value="range">
                    {__("Price range", "foundhint-local-seo")}
                  </option>
                </select>
              </div>

              {priced ? (
                <div className="fhint:grid fhint:content-start fhint:gap-1.5">
                  <label htmlFor={field("price")} className={label}>
                    {pricing.model === "range"
                      ? __("From", "foundhint-local-seo")
                      : pricing.model === "from"
                        ? __("Starting price", "foundhint-local-seo")
                        : __("Price", "foundhint-local-seo")}
                  </label>
                  <input
                    id={field("price")}
                    inputMode="decimal"
                    value={pricing.price}
                    disabled={locked}
                    onChange={(event) =>
                      set({
                        pricing: { ...pricing, price: event.target.value },
                      })
                    }
                    aria-invalid={Boolean(errors.price)}
                    className={control("price")}
                  />
                  <FieldError messages={errors.price} />
                </div>
              ) : null}

              {pricing.model === "range" ? (
                <div className="fhint:grid fhint:content-start fhint:gap-1.5">
                  <label htmlFor={field("max")} className={label}>
                    {__("Up to", "foundhint-local-seo")}
                  </label>
                  <input
                    id={field("max")}
                    inputMode="decimal"
                    value={pricing.max}
                    disabled={locked}
                    onChange={(event) =>
                      set({ pricing: { ...pricing, max: event.target.value } })
                    }
                    aria-invalid={Boolean(errors.price_max)}
                    className={control("price_max")}
                  />
                  <FieldError messages={errors.price_max} />
                </div>
              ) : null}

              {priced ? (
                <div className="fhint:grid fhint:content-start fhint:gap-1.5">
                  <label htmlFor={field("currency")} className={label}>
                    {__("Currency", "foundhint-local-seo")}
                  </label>
                  <select
                    id={field("currency")}
                    value={pricing.currency}
                    disabled={locked}
                    onChange={(event) =>
                      set({
                        pricing: { ...pricing, currency: event.target.value },
                      })
                    }
                    className={cn(control("currency"), "fhint:pr-8!")}
                  >
                    {currencies.map((code) => (
                      <option key={code} value={code}>
                        {code}
                      </option>
                    ))}
                  </select>
                  <FieldError messages={errors.currency} />
                </div>
              ) : null}
            </div>
          ) : null}
        </section>

        <PlacementCards
          title={__("Add this schema to", "foundhint-local-seo")}
          name={field("placement")}
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
          .filter((warning) =>
            ["no_pages", "branch_off"].includes(warning.code),
          )
          .map((warning) => (
            <p
              key={`${warning.code}-${warning.branch ?? ""}`}
              className="fhint:mx-5 fhint:mt-0 fhint:mb-3 fhint:text-[12.5px] fhint:font-semibold fhint:text-[#8a5a00]"
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
        loading={previewState.isLoading && !document}
        dirty={dirty}
      />

      <AlertDialog open={confirmRemove} onOpenChange={setConfirmRemove}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {sprintf(
                /* translators: %s: service name. */
                __("Remove %s?", "foundhint-local-seo"),
                state.values.name,
              )}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {__(
                "The service is removed from FoundHint, including your profile's service list, and its schema stops printing. To keep it but hide it from your site, switch it off instead.",
                "foundhint-local-seo",
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <button
              type="button"
              className={dialogButton}
              onClick={() => setConfirmRemove(false)}
            >
              {__("Keep it", "foundhint-local-seo")}
            </button>
            <button
              type="button"
              disabled={removeState.isLoading}
              className={cn(
                dialogButton,
                "fhint:border-0 fhint:bg-[#C02718] fhint:text-white",
              )}
              onClick={onRemove}
            >
              {__("Remove service", "foundhint-local-seo")}
            </button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default ServiceEditor;
