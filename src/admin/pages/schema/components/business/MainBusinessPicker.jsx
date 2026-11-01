import { useId, useState } from "react";
import { __, _n, sprintf } from "@wordpress/i18n";
import { toast } from "sonner";
import { cn } from "cn";
import { fieldErrors } from "@/lib/errors";
import { useSetMainBusinessMutation } from "@/store/api/schemaManagerApi";
import PanelHeading from "../shared/PanelHeading";
import {
  card,
  fieldError,
  input,
  label,
  muted,
  panel,
  primaryAction,
} from "../styles";

const MANUAL = "manual";

/**
 * "Choose your main business" — asked on the Main business tab before its
 * fields, when there is more than one Google profile and no choice yet.
 * The main business represents the whole brand on this website; the other
 * locations become branches. A head office that is not on Google can be
 * entered by hand instead; then every Google profile is a branch.
 *
 * @param {Object}  props
 * @param {Object}  props.main   `state.main` from the Main business tab:
 *                               `{ candidates[], location_id, mode, manual }`.
 * @param {boolean} props.locked No Premium.
 */
export function MainBusinessPicker({ main, locked }) {
  const ids = useId();
  const [setMain, setState] = useSetMainBusinessMutation();
  const candidates = main.candidates ?? [];
  const suggested = candidates.find((option) => option.suggested);
  const [choice, setChoice] = useState(
    main.mode === MANUAL
      ? MANUAL
      : main.location_id || suggested?.id || candidates[0]?.id || MANUAL,
  );
  const [manual, setManual] = useState({
    name: main.manual?.name ?? "",
    address: main.manual?.address ?? "",
    website: main.manual?.website ?? "",
  });
  const errors = fieldErrors(setState.error);
  const isManual = choice === MANUAL;
  const disabled =
    locked || setState.isLoading || (isManual && !manual.name.trim());

  const onContinue = async () => {
    try {
      await setMain(
        isManual
          ? { mode: MANUAL, ...manual }
          : { mode: "location", location_id: choice },
      ).unwrap();

      const name = isManual
        ? manual.name.trim()
        : candidates.find((option) => option.id === choice)?.name;

      toast.success(
        sprintf(
          /* translators: %s: the business chosen as main. */
          __(
            "%s is your main business. Its fields are below.",
            "foundhint-local-seo",
          ),
          name,
        ),
      );
    } catch {
      toast.error(__("Some fields need attention.", "foundhint-local-seo"));
    }
  };

  const field = (key, text, placeholder, required = false) => (
    <div className="fhint:grid fhint:content-start fhint:gap-1.5">
      <label htmlFor={`${ids}-${key}`} className={label}>
        {text}
        {required ? (
          <span className="fhint:ml-1.5 fhint:text-[11px] fhint:font-bold fhint:text-destructive">
            {__("Required", "foundhint-local-seo")}
          </span>
        ) : null}
      </label>
      <input
        id={`${ids}-${key}`}
        value={manual[key]}
        onChange={(event) =>
          setManual((current) => ({ ...current, [key]: event.target.value }))
        }
        placeholder={placeholder}
        aria-invalid={Boolean(errors[key])}
        className={input(errors[key] ? "missing" : "open")}
      />
      {errors[key] ? (
        <span role="alert" className={fieldError}>
          {errors[key]}
        </span>
      ) : null}
    </div>
  );

  return (
    <section
      aria-labelledby={`${ids}-title`}
      className={cn(panel, "fhint:min-w-0")}
    >
      <PanelHeading
        id={`${ids}-title`}
        title={__("Main business schema", "foundhint-local-seo")}
        description={sprintf(
          /* translators: %d: Google profiles connected. */
          _n(
            "%d Google profile found",
            "%d Google profiles found",
            candidates.length,
            "foundhint-local-seo",
          ),
          candidates.length,
        )}
      />

      <div className="fhint:grid fhint:gap-4 fhint:px-5 fhint:py-5">
        <div className="fhint:grid fhint:gap-1">
          <strong className="fhint:text-[15px]">
            {__("Choose your main business", "foundhint-local-seo")}
          </strong>
          <span className={muted}>
            {__(
              "This represents your whole brand on this website. Other locations become branches.",
              "foundhint-local-seo",
            )}
          </span>
        </div>

        <div
          role="radiogroup"
          aria-label={__("Main business", "foundhint-local-seo")}
          className="fhint:grid fhint:gap-2"
        >
          {candidates.map((option) => (
            <label
              key={option.id}
              className={cn(card(choice === option.id), "fhint:items-start")}
            >
              <input
                type="radio"
                name={`${ids}-main`}
                checked={choice === option.id}
                disabled={locked}
                onChange={() => setChoice(option.id)}
                className="fhint:mt-[3px] fhint:accent-primary"
              />
              <span className="fhint:grid fhint:gap-0.5">
                <span className="fhint:flex fhint:flex-wrap fhint:items-center fhint:gap-1.5 fhint:text-[13.5px]">
                  <strong>{option.name}</strong>
                  {option.area ? (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>{option.area}</span>
                    </>
                  ) : null}
                  {option.rating ? (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>
                        {sprintf(
                          /* translators: 1: average rating, 2: number of reviews. */
                          _n(
                            "★ %1$s (%2$d review)",
                            "★ %1$s (%2$d reviews)",
                            option.reviews,
                            "foundhint-local-seo",
                          ),
                          option.rating,
                          option.reviews,
                        )}
                      </span>
                    </>
                  ) : null}
                </span>
                {option.suggested ? (
                  <span className="fhint:text-[12px] fhint:font-bold fhint:text-success">
                    {__(
                      "Suggested: website and address match your site",
                      "foundhint-local-seo",
                    )}
                  </span>
                ) : null}
              </span>
            </label>
          ))}

          <label className={cn(card(isManual), "fhint:items-start")}>
            <input
              type="radio"
              name={`${ids}-main`}
              checked={isManual}
              disabled={locked}
              onChange={() => setChoice(MANUAL)}
              className="fhint:mt-[3px] fhint:accent-primary"
            />
            <span className="fhint:text-[13.5px] fhint:font-bold">
              {__(
                "My head office isn't on Google — enter details manually",
                "foundhint-local-seo",
              )}
            </span>
          </label>

          {isManual ? (
            <div className="fhint:grid fhint:grid-cols-[repeat(auto-fill,minmax(min(100%,220px),1fr))] fhint:gap-4 fhint:border fhint:border-border fhint:px-4 fhint:py-4">
              {field(
                "name",
                __("Head office name", "foundhint-local-seo"),
                __("e.g. Smile Dental Ltd.", "foundhint-local-seo"),
                true,
              )}
              {field(
                "address",
                __("Address", "foundhint-local-seo"),
                __("Street, city", "foundhint-local-seo"),
              )}
              {field(
                "website",
                __("Website", "foundhint-local-seo"),
                "https://",
              )}
            </div>
          ) : null}
        </div>

        <div className="fhint:flex fhint:flex-wrap fhint:items-center fhint:gap-3 fhint:border-t fhint:border-t-border fhint:pt-4">
          <span className={cn(muted, "fhint:flex-[1_1_260px]")}>
            {isManual
              ? __(
                  "Your head office is described from these details. Every Google profile becomes a branch.",
                  "foundhint-local-seo",
                )
              : __(
                  "It becomes your main location across FoundHint. You can change this later in 03 Location schema.",
                  "foundhint-local-seo",
                )}
          </span>
          <button
            type="button"
            onClick={onContinue}
            disabled={disabled}
            className={cn(primaryAction, "fhint:disabled:opacity-50")}
          >
            {setState.isLoading
              ? __("Saving…", "foundhint-local-seo")
              : __("Continue", "foundhint-local-seo")}
          </button>
        </div>
      </div>
    </section>
  );
}

export default MainBusinessPicker;
