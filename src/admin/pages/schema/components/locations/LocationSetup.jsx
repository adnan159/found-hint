import { useId, useState } from "react";
import { __, _n, sprintf } from "@wordpress/i18n";
import { toast } from "sonner";
import { cn } from "cn";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { errorMessage, fieldErrors } from "@/lib/errors";
import { focus } from "@/pages/profile/styles";
import { useSetupLocationsMutation } from "@/store/api/schemaManagerApi";
import {
  card,
  dialogButton,
  fieldError,
  input,
  label,
  muted,
  pill,
  primaryAction,
} from "../styles";

const MANUAL = "manual";

/**
 * Location setup (design B), three steps:
 * 1. Which one is your main business? — a Google profile, or a head office
 *    typed by hand.
 * 2. Do customers visit it? — a LocalBusiness, or a head office described
 *    by the Organization.
 * 3. Confirm the other profiles — each a branch (published here) or a
 *    separate business (its own website), FoundHint's suggestion marked.
 *
 * @param {Object}   props
 * @param {Object}   props.setup   `roster.setup`.
 * @param {Function} props.onClose Close it.
 */
export function LocationSetup({ setup, onClose }) {
  const ids = useId();
  const profiles = setup.profiles ?? [];
  const currentMain = profiles.find((profile) => profile.role === "main");
  const [step, setStep] = useState(1);
  const [main, setMain] = useState(
    setup.manual ? MANUAL : (currentMain?.id ?? profiles[0]?.id),
  );
  const [head, setHead] = useState({
    name: setup.head?.name ?? "",
    address: setup.head?.address ?? "",
    website: setup.head?.website ?? "",
  });
  const [visit, setVisit] = useState(setup.visit === "no" ? "no" : "yes");
  const [roles, setRoles] = useState(() =>
    Object.fromEntries(
      profiles.map((profile) => [
        profile.id,
        profile.confirmed && profile.role !== "main"
          ? profile.role === "separate"
            ? "separate"
            : "branch"
          : profile.suggest,
      ]),
    ),
  );
  const [save, saveState] = useSetupLocationsMutation();
  const errors = fieldErrors(saveState.error);

  const manual = main === MANUAL;
  const chosen = profiles.find((profile) => profile.id === main);
  const mainName = manual
    ? head.name.trim() || __("Your head office", "foundhint-local-seo")
    : (chosen?.name ?? "");
  const others = profiles.filter((profile) => manual || profile.id !== main);
  const branches = others.filter((profile) => roles[profile.id] === "branch");
  const nextOff = step === 1 && manual && !head.name.trim();

  const finish = async () => {
    try {
      await save({
        main: manual
          ? { mode: MANUAL, ...head }
          : { mode: "location", location_id: main },
        visit,
        roles: Object.fromEntries(
          others.map((profile) => [profile.id, roles[profile.id]]),
        ),
      }).unwrap();

      toast.success(
        sprintf(
          /* translators: 1: number of branches, 2: the main business. */
          _n(
            "Roles saved. %1$d branch now links to %2$s.",
            "Roles saved. %1$d branches now link to %2$s.",
            branches.length,
            "foundhint-local-seo",
          ),
          branches.length,
          mainName,
        ),
      );
      onClose();
    } catch (error) {
      // A head office the server refused: back to where it is typed.
      if (Object.keys(fieldErrors(error)).length) {
        setStep(1);
      }

      toast.error(errorMessage(error));
    }
  };

  const titles = {
    1: __("Which one is your main business?", "foundhint-local-seo"),
    2: __("Do customers visit this location?", "foundhint-local-seo"),
    3: __("Confirm the other profiles", "foundhint-local-seo"),
  };
  const subs = {
    1: sprintf(
      /* translators: %d: Google profiles found. */
      _n(
        "FoundHint found %d Google profile. Your main business carries the brand schema on your home page, and the others link to it.",
        "FoundHint found %d Google profiles. Your main business carries the brand schema on your home page, and the others link to it.",
        profiles.length,
        "foundhint-local-seo",
      ),
      profiles.length,
    ),
    2: sprintf(
      /* translators: %s: the main business. */
      __("This decides how FoundHint describes %s.", "foundhint-local-seo"),
      mainName,
    ),
    3: __(
      "FoundHint suggested a role for each one from its website. Branches publish here, on their own page. Separate businesses publish on their own website.",
      "foundhint-local-seo",
    ),
  };
  const foot = {
    1: __(
      "You can change roles later from the Locations tab.",
      "foundhint-local-seo",
    ),
    2:
      visit === "yes"
        ? __(
            "Main business uses LocalBusiness schema (02).",
            "foundhint-local-seo",
          )
        : __(
            "Main business is described in 01 Organization schema.",
            "foundhint-local-seo",
          ),
    3: sprintf(
      /* translators: 1: branches, 2: separate businesses. */
      __("%1$d branches · %2$d separate", "foundhint-local-seo"),
      branches.length,
      others.length - branches.length,
    ),
  };

  const headField = (key, text, placeholder, required = false) => (
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
        value={head[key]}
        onChange={(event) =>
          setHead((current) => ({ ...current, [key]: event.target.value }))
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
    <Dialog open onOpenChange={(open) => (open ? null : onClose())}>
      <DialogContent className="fhint:grid fhint:max-h-[90vh] fhint:w-[min(640px,calc(100vw-32px))] fhint:max-w-none! fhint:grid-rows-[auto_minmax(0,1fr)_auto] fhint:gap-0 fhint:p-0">
        <div className="fhint:grid fhint:gap-1.5 fhint:border-b fhint:border-b-border fhint:px-6 fhint:pt-5 fhint:pb-4">
          <span className="fhint:text-[11.5px] fhint:font-bold fhint:tracking-[0.06em] fhint:text-muted-strong fhint:uppercase">
            {sprintf(
              /* translators: %d: the step, 1 to 3. */
              __("Location setup · Step %d of 3", "foundhint-local-seo"),
              step,
            )}
          </span>
          <DialogTitle className="fhint:text-[18px]">
            {titles[step]}
          </DialogTitle>
          <DialogDescription className={muted}>{subs[step]}</DialogDescription>
          <div
            aria-hidden="true"
            className="fhint:grid fhint:grid-cols-3 fhint:gap-1.5 fhint:pt-1"
          >
            {[1, 2, 3].map((index) => (
              <span
                key={index}
                className={cn(
                  "fhint:h-1",
                  index <= step ? "fhint:bg-primary" : "fhint:bg-border",
                )}
              />
            ))}
          </div>
        </div>

        <div className="fhint:grid fhint:content-start fhint:gap-3 fhint:overflow-y-auto fhint:px-6 fhint:py-5">
          {step === 1 && !manual ? (
            <>
              <div
                role="radiogroup"
                aria-label={__("Main business", "foundhint-local-seo")}
                className="fhint:grid fhint:gap-2"
              >
                {profiles.map((profile) => (
                  <label key={profile.id} className={card(main === profile.id)}>
                    <input
                      type="radio"
                      name={`${ids}-main`}
                      checked={main === profile.id}
                      onChange={() => setMain(profile.id)}
                      className="fhint:mt-[3px] fhint:accent-primary"
                    />
                    <span className="fhint:grid fhint:gap-0.5 fhint:text-[13px]">
                      <span className="fhint:flex fhint:flex-wrap fhint:items-center fhint:gap-1.5">
                        <strong className="fhint:text-[13.5px]">
                          {profile.name}
                        </strong>
                        {profile.primary && !setup.manual ? (
                          <span
                            className={cn(
                              pill,
                              "fhint:bg-muted fhint:text-muted-strong",
                            )}
                          >
                            {__("Current main", "foundhint-local-seo")}
                          </span>
                        ) : null}
                      </span>
                      <span className="fhint:text-muted-strong">
                        {profile.address}
                      </span>
                      <span className="fhint:flex fhint:flex-wrap fhint:gap-2 fhint:text-muted-strong">
                        {profile.domain ? <code>{profile.domain}</code> : null}
                        {profile.rating
                          ? sprintf(
                              /* translators: 1: rating, 2: reviews. */
                              _n(
                                "★ %1$s · %2$d review",
                                "★ %1$s · %2$d reviews",
                                profile.reviews,
                                "foundhint-local-seo",
                              ),
                              profile.rating,
                              profile.reviews,
                            )
                          : null}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setMain(MANUAL)}
                className={cn(
                  "fhint:cursor-pointer fhint:justify-self-start fhint:border-0 fhint:bg-transparent fhint:p-0 fhint:text-[13px] fhint:font-bold fhint:text-link-accent fhint:underline",
                  focus,
                )}
              >
                {__(
                  "My head office isn't on Google — enter manually",
                  "foundhint-local-seo",
                )}
              </button>
            </>
          ) : null}

          {step === 1 && manual ? (
            <>
              <div className="fhint:grid fhint:gap-4">
                {headField(
                  "name",
                  __("Head office name", "foundhint-local-seo"),
                  __("e.g. Smile Dental Ltd.", "foundhint-local-seo"),
                  true,
                )}
                {headField(
                  "address",
                  __("Address", "foundhint-local-seo"),
                  __("Street, city", "foundhint-local-seo"),
                )}
                {headField(
                  "website",
                  __("Website", "foundhint-local-seo"),
                  "https://",
                )}
              </div>
              <span className={muted}>
                {__(
                  "Every Google profile becomes a branch or a separate business, linked to this head office.",
                  "foundhint-local-seo",
                )}
              </span>
              <button
                type="button"
                onClick={() => setMain(currentMain?.id ?? profiles[0]?.id)}
                className={cn(
                  "fhint:cursor-pointer fhint:justify-self-start fhint:border-0 fhint:bg-transparent fhint:p-0 fhint:text-[13px] fhint:font-bold fhint:text-link-accent fhint:underline",
                  focus,
                )}
              >
                {__("Choose a Google profile instead", "foundhint-local-seo")}
              </button>
            </>
          ) : null}

          {step === 2 ? (
            <>
              <div className="fhint:flex fhint:items-center fhint:gap-3 fhint:border fhint:border-border fhint:bg-background fhint:px-4 fhint:py-3">
                <span
                  aria-hidden="true"
                  className="fhint:flex fhint:size-9 fhint:items-center fhint:justify-center fhint:bg-foreground fhint:text-[12px] fhint:font-bold fhint:text-background"
                >
                  {manual
                    ? "HQ"
                    : mainName
                        .split(/\s+/)
                        .slice(0, 2)
                        .map((word) => word.charAt(0).toUpperCase())
                        .join("")}
                </span>
                <span className="fhint:grid">
                  <strong className="fhint:text-[13.5px]">{mainName}</strong>
                  <span className={muted}>
                    {manual
                      ? head.address ||
                        __("Not on Google", "foundhint-local-seo")
                      : chosen?.address}
                  </span>
                </span>
              </div>
              <div
                role="radiogroup"
                aria-label={__("Do customers visit it?", "foundhint-local-seo")}
                className="fhint:grid fhint:gap-2"
              >
                {[
                  [
                    "yes",
                    __("Yes, customers visit", "foundhint-local-seo"),
                    "LocalBusiness",
                    __(
                      "Described as a local business with its address, opening hours and map pin.",
                      "foundhint-local-seo",
                    ),
                  ],
                  [
                    "no",
                    __("No, head office only", "foundhint-local-seo"),
                    "Organization",
                    __(
                      "Company details only, with no address or hours. Your branches carry the customer visits.",
                      "foundhint-local-seo",
                    ),
                  ],
                ].map(([key, text, code, body]) => (
                  <label key={key} className={card(visit === key)}>
                    <input
                      type="radio"
                      name={`${ids}-visit`}
                      checked={visit === key}
                      onChange={() => setVisit(key)}
                      className="fhint:mt-[3px] fhint:accent-primary"
                    />
                    <span className="fhint:grid fhint:gap-0.5">
                      <span className="fhint:flex fhint:flex-wrap fhint:items-center fhint:gap-2">
                        <strong className="fhint:text-[13.5px]">{text}</strong>
                        <code className="fhint:text-[11.5px] fhint:text-muted-strong">
                          {code}
                        </code>
                      </span>
                      <span className={muted}>{body}</span>
                    </span>
                  </label>
                ))}
              </div>
            </>
          ) : null}

          {step === 3 ? (
            others.length ? (
              <ul className="fhint:m-0 fhint:grid fhint:list-none fhint:gap-2 fhint:p-0">
                {others.map((profile) => (
                  <li
                    key={profile.id}
                    className="fhint:flex fhint:flex-wrap fhint:items-center fhint:gap-3 fhint:border fhint:border-border fhint:px-4 fhint:py-3"
                  >
                    <span className="fhint:grid fhint:min-w-0 fhint:flex-[1_1_240px] fhint:gap-0.5 fhint:text-[13px]">
                      <strong className="fhint:text-[13.5px]">
                        {profile.name}
                      </strong>
                      <span className="fhint:text-muted-strong">
                        {profile.address}
                      </span>
                      <span className="fhint:flex fhint:flex-wrap fhint:items-center fhint:gap-2">
                        {profile.domain ? <code>{profile.domain}</code> : null}
                        <span
                          className={cn(
                            pill,
                            "fhint:bg-muted fhint:text-muted-strong",
                          )}
                        >
                          {profile.suggest === "separate"
                            ? sprintf(
                                /* translators: %s: a website domain. */
                                __("Website is %s", "foundhint-local-seo"),
                                profile.domain,
                              )
                            : __(
                                "Same website as yours",
                                "foundhint-local-seo",
                              )}
                        </span>
                      </span>
                    </span>
                    <span
                      role="radiogroup"
                      aria-label={sprintf(
                        /* translators: %s: a location. */
                        __("Role for %s", "foundhint-local-seo"),
                        profile.name,
                      )}
                      className="fhint:flex"
                    >
                      {[
                        ["branch", __("Branch", "foundhint-local-seo")],
                        ["separate", __("Separate", "foundhint-local-seo")],
                      ].map(([key, text]) => {
                        const on = roles[profile.id] === key;

                        return (
                          <button
                            key={key}
                            type="button"
                            role="radio"
                            aria-checked={on}
                            onClick={() =>
                              setRoles((current) => ({
                                ...current,
                                [profile.id]: key,
                              }))
                            }
                            className={cn(
                              "fhint:flex fhint:cursor-pointer fhint:items-center fhint:gap-1.5 fhint:border fhint:px-3 fhint:py-1.5 fhint:text-[12.5px] fhint:font-bold",
                              on
                                ? "fhint:border-foreground fhint:bg-foreground fhint:text-background"
                                : "fhint:border-border fhint:bg-card fhint:text-foreground",
                              focus,
                            )}
                          >
                            {text}
                            {profile.suggest === key ? (
                              <span
                                className={cn(
                                  "fhint:text-[10.5px] fhint:font-bold",
                                  on
                                    ? "fhint:text-background/80"
                                    : "fhint:text-primary",
                                )}
                              >
                                {__("Suggested", "foundhint-local-seo")}
                              </span>
                            ) : null}
                          </button>
                        );
                      })}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={cn(muted, "fhint:m-0")}>
                {__(
                  "There are no other profiles. Your main business is your only location.",
                  "foundhint-local-seo",
                )}
              </p>
            )
          ) : null}
        </div>

        <div className="fhint:flex fhint:flex-wrap fhint:items-center fhint:gap-3 fhint:border-t fhint:border-t-border fhint:px-6 fhint:py-4">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              className={dialogButton}
            >
              {__("Back", "foundhint-local-seo")}
            </button>
          ) : null}
          <span className={cn(muted, "fhint:flex-1")}>{foot[step]}</span>
          <button type="button" onClick={onClose} className={dialogButton}>
            {__("Cancel", "foundhint-local-seo")}
          </button>
          <button
            type="button"
            disabled={nextOff || saveState.isLoading}
            onClick={() => (step < 3 ? setStep(step + 1) : finish())}
            className={cn(primaryAction, "fhint:disabled:opacity-50")}
          >
            {step < 3
              ? __("Continue", "foundhint-local-seo")
              : saveState.isLoading
                ? __("Saving…", "foundhint-local-seo")
                : __("Generate schema", "foundhint-local-seo")}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default LocationSetup;
