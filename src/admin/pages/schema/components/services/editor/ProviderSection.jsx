import { __, sprintf } from "@wordpress/i18n";
import { cn } from "cn";
import Hint from "@/components/Hint";
import { BADGES, card, chip, label, muted, pill } from "../../styles";
import { EditorSection } from "./EditorSection";
import { FieldError } from "./FieldError";

/**
 * 02 Service provider: the main business or chosen branches, and an
 * optional person or partner company who does the work.
 *
 * @param {Object} props
 * @param {Object} props.form    From the editor.
 * @param {Object} props.options `{ business, branches }`.
 * @param {number} props.list    The branch in view (0: the business).
 */
export function ProviderSection({ form, options, list }) {
  const { values, set, locked, errors, field, control } = form;
  const branches = options.branches ?? [];
  const provider = values.provider;

  const modes = [
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
  ];

  const toggleBranch = (id) =>
    set({
      provider: {
        mode: "branches",
        branch_ids: provider.branch_ids.includes(id)
          ? provider.branch_ids.filter((item) => item !== id)
          : [...provider.branch_ids, id],
      },
    });

  return (
    <EditorSection
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
        {modes.map(([key, text, body]) => {
          const off = locked || (key === "branches" && !branches.length);

          return (
            <label
              key={key}
              className={cn(
                card(provider.mode === key),
                off && "fhint:cursor-default fhint:opacity-70",
              )}
            >
              <input
                type="radio"
                name={field("provider")}
                checked={provider.mode === key}
                disabled={off}
                onChange={() =>
                  set({
                    provider: {
                      mode: key,
                      // Opened from a branch: that branch provides it.
                      branch_ids:
                        key === "branches" && list
                          ? [list]
                          : provider.branch_ids,
                    },
                  })
                }
                // WordPress pulls every admin radio up 4px; 1px down sets it
                // level with the title's 20px line.
                className="fhint:m-0! fhint:mt-px! fhint:flex-none fhint:accent-[#FF6B35]"
              />
              <span>
                <strong className="fhint:block fhint:text-[13.5px] fhint:leading-5">
                  {text}
                </strong>
                <span className={muted}>{body}</span>
              </span>
            </label>
          );
        })}
      </fieldset>

      {provider.mode === "branches" ? (
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
              const on = provider.branch_ids.includes(branch.id);

              return (
                <button
                  key={branch.id}
                  type="button"
                  aria-pressed={on}
                  disabled={locked}
                  onClick={() => toggleBranch(branch.id)}
                  className={chip(on)}
                >
                  {branch.name}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
      <FieldError messages={errors.provider} />

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
              set({ person: { ...values.person, name: event.target.value } })
            }
            placeholder={__("e.g. Dr. Farhana Rahman", "foundhint-local-seo")}
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
              set({ person: { ...values.person, type: event.target.value } })
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
    </EditorSection>
  );
}

export default ProviderSection;
