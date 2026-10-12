import { useId, useState } from "react";
import { __, _n, sprintf } from "@wordpress/i18n";
import { CircleAlertIcon, ExternalLinkIcon, HistoryIcon } from "lucide-react";
import { Link } from "react-router";
import Hint from "@/components/Hint";
import { cn } from "cn";
import { DESCRIPTION_MAX, hasLink } from "../model";
import {
  errorText,
  focus,
  help,
  input,
  label,
  linkButton,
  primaryButton,
  quietButton,
} from "../styles";
import CategorySearch from "./CategorySearch";
import TextField from "./TextField";

function formatWhen(value) {
  if (!value) {
    return "";
  }

  const parsed = new Date(`${String(value).replace(" ", "T")}Z`);

  return Number.isNaN(parsed.getTime())
    ? value
    : parsed.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
}

/**
 * Name, categories, description, website, phone, and Google's id for the
 * listing.
 *
 * Two of the design's controls are absent on purpose, because nothing stands
 * behind them yet: the "write it for me" button and the "suggested for your
 * business" strip. A button that does nothing is worse than a missing one.
 */
export function InfoSection({ model, onChange, errors, info, google, limits }) {
  const descriptionId = useId();
  const extraLabelId = useId();
  const mainLabelId = useId();
  const [historyOpen, setHistoryOpen] = useState(false);
  const [extraDraft, setExtraDraft] = useState("");
  const [copied, setCopied] = useState(false);

  const set = (key) => (value) => onChange({ ...model, [key]: value });

  const maxExtra = limits?.additional_categories ?? 9;
  const extra = model.secondary_categories;
  const extraFull = extra.length >= maxExtra;

  const description = model.description;
  const tooLong = description.length > DESCRIPTION_MAX;
  const linked = hasLink(description);
  const words = description.trim() ? description.trim().split(/\s+/).length : 0;

  const history = info?.history ?? [];
  const cid = info?.cid ?? "";

  const copyCid = () => {
    try {
      navigator.clipboard?.writeText(cid);
    } catch {
      // Copying is a convenience; the id is on screen to be selected by hand.
    }

    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <>
      <div className="fhint:grid fhint:grid-cols-[repeat(auto-fit,minmax(min(100%,260px),1fr))] fhint:gap-[18px]">
        <TextField
          label={__("Business name", "foundhint-local-seo")}
          value={model.name}
          onChange={set("name")}
          error={errors?.name}
          hint={__(
            "Exactly as it appears on your sign. Adding extra words like “best dentist” can get your listing suspended.",
            "foundhint-local-seo",
          )}
        />

        <div className="fhint:grid fhint:content-start fhint:gap-1.5">
          <div className="fhint:flex fhint:items-center fhint:gap-1.5">
            <span id={mainLabelId} className={label}>
              {__("Main category", "foundhint-local-seo")}
            </span>
            <Hint
              about={__("Main category", "foundhint-local-seo")}
              text={__(
                "The single thing you are best known for. It affects which searches you show up in more than anything else here.",
                "foundhint-local-seo",
              )}
            />
          </div>
          <CategorySearch
            labelledBy={mainLabelId}
            value={model.primary_category}
            invalid={Boolean(errors?.primary_category_id)}
            exclude={extra.map((item) => item.id)}
            placeholder={__(
              "Search Google's categories",
              "foundhint-local-seo",
            )}
            inputClassName={cn(input, "fhint:font-bold")}
            // Typing is a name with no id yet; choosing from the list is both.
            onType={(text) =>
              onChange({
                ...model,
                primary_category: text,
                primary_category_id: "",
              })
            }
            onChoose={(category) =>
              onChange({
                ...model,
                primary_category: category.name,
                primary_category_id: category.id,
              })
            }
          />
          {errors?.primary_category_id || errors?.primary_category ? (
            <span role="alert" className={errorText}>
              {errors.primary_category_id ?? errors.primary_category}
            </span>
          ) : null}
          {model.primary_category && !model.primary_category_id ? (
            <span className={cn(help, "fhint:text-notice-foreground")}>
              {__(
                "Choose one from the list. A category typed by hand is kept here but cannot be sent to Google.",
                "foundhint-local-seo",
              )}
            </span>
          ) : null}
        </div>
      </div>

      <div className="fhint:grid fhint:gap-2">
        <div className="fhint:flex fhint:items-baseline fhint:gap-2.5">
          <div className="fhint:flex fhint:items-center fhint:gap-1.5">
            <span id={extraLabelId} className={label}>
              {__("Extra categories", "foundhint-local-seo")}
            </span>
            <Hint
              about={__("Extra categories", "foundhint-local-seo")}
              text={__(
                "Add other things you genuinely do. Only pick categories that are true, because unrelated ones can hurt you.",
                "foundhint-local-seo",
              )}
            />
          </div>
          <span className="fhint:ml-auto fhint:text-[12.5px] fhint:font-bold fhint:text-muted-strong">
            {sprintf(
              /* translators: 1: how many extra categories are chosen, 2: how many Google allows. */
              __("%1$d of %2$d used", "foundhint-local-seo"),
              extra.length,
              maxExtra,
            )}
          </span>
        </div>
        <div
          className={cn(
            "fhint:flex fhint:flex-wrap fhint:items-center fhint:gap-1.5 fhint:border fhint:border-input fhint:p-[7px]",
            errors?.secondary_categories && "fhint:border-destructive",
          )}
        >
          {extra.map((category) => (
            <span
              key={category.id}
              className="fhint:inline-flex fhint:items-center fhint:gap-[7px] fhint:rounded-full fhint:border fhint:border-border fhint:bg-background fhint:py-[5px] fhint:pr-2 fhint:pl-3 fhint:text-[13px] fhint:font-semibold"
            >
              {category.name}
              <button
                type="button"
                onClick={() =>
                  onChange({
                    ...model,
                    secondary_categories: extra.filter(
                      (item) => item.id !== category.id,
                    ),
                  })
                }
                aria-label={sprintf(
                  /* translators: %s: a category name. */
                  __("Remove %s", "foundhint-local-seo"),
                  category.name,
                )}
                className={cn(
                  "fhint:cursor-pointer fhint:border-0 fhint:bg-transparent fhint:px-0.5 fhint:text-[15px] fhint:leading-none fhint:text-muted-strong",
                  focus,
                )}
              >
                ×
              </button>
            </span>
          ))}
          <CategorySearch
            labelledBy={extraLabelId}
            value={extraDraft}
            disabled={extraFull}
            exclude={[
              model.primary_category_id,
              ...extra.map((item) => item.id),
            ]}
            placeholder={
              extraFull
                ? sprintf(
                    /* translators: %d: how many extra categories Google allows. */
                    __("You have used all %d", "foundhint-local-seo"),
                    maxExtra,
                  )
                : __("Type a category and choose it", "foundhint-local-seo")
            }
            inputClassName="fhint:w-full fhint:border-0 fhint:bg-transparent fhint:p-1.5 fhint:text-[13px] fhint:outline-none"
            onType={setExtraDraft}
            onChoose={(category) => {
              onChange({
                ...model,
                secondary_categories: [...extra, category],
              });
              setExtraDraft("");
            }}
          />
        </div>
        {errors?.secondary_categories ? (
          <span role="alert" className={errorText}>
            {errors.secondary_categories}
          </span>
        ) : null}
      </div>

      <div className="fhint:grid fhint:gap-[7px]">
        <div className="fhint:flex fhint:flex-wrap fhint:items-center fhint:gap-2">
          <div className="fhint:flex fhint:items-center fhint:gap-1.5">
            <label htmlFor={descriptionId} className={label}>
              {__("Business description", "foundhint-local-seo")}
            </label>
            <Hint
              about={__("Business description", "foundhint-local-seo")}
              text={__(
                "Say what you do and where, in plain words. Please do not add web links, because Google rejects descriptions that have them.",
                "foundhint-local-seo",
              )}
            />
          </div>
          <span className="fhint:ml-auto fhint:flex fhint:flex-wrap fhint:items-center fhint:gap-[7px]">
            {history.length ? (
              <button
                type="button"
                onClick={() => setHistoryOpen((value) => !value)}
                aria-expanded={historyOpen}
                className={cn(
                  quietButton,
                  "fhint:px-2.5 fhint:py-1.5 fhint:font-bold",
                )}
              >
                <HistoryIcon aria-hidden="true" className="fhint:size-[13px]" />
                {__("History", "foundhint-local-seo")}
              </button>
            ) : null}
            <span
              className={cn(
                "fhint:text-[12.5px] fhint:font-bold",
                tooLong
                  ? "fhint:text-destructive"
                  : "fhint:text-muted-foreground",
              )}
            >
              {sprintf(
                /* translators: 1: characters typed, 2: the most allowed. */
                __("%1$d / %2$d characters", "foundhint-local-seo"),
                description.length,
                DESCRIPTION_MAX,
              )}
            </span>
            <span className={help}>
              {sprintf(
                /* translators: %d: number of words. */
                _n("%d word", "%d words", words, "foundhint-local-seo"),
                words,
              )}
            </span>
          </span>
        </div>
        <textarea
          id={descriptionId}
          rows={4}
          value={description}
          onChange={(event) => set("description")(event.target.value)}
          aria-invalid={
            tooLong || linked || errors?.description ? true : undefined
          }
          aria-describedby={`${descriptionId}-help`}
          className={cn(
            input,
            "fhint:resize-y fhint:p-[11px] fhint:text-[13.5px] fhint:leading-[1.55]",
          )}
        />
        <div id={`${descriptionId}-help`} className="fhint:grid fhint:gap-1.5">
          {linked ? (
            <span
              className={cn(
                errorText,
                "fhint:flex fhint:items-start fhint:gap-2",
              )}
            >
              <CircleAlertIcon
                aria-hidden="true"
                className="fhint:mt-px fhint:size-[15px] fhint:flex-none"
              />
              {__(
                "Your description has a web link in it. Google does not allow links here and will reject the update, so please remove it.",
                "foundhint-local-seo",
              )}
            </span>
          ) : null}
          {errors?.description && !linked ? (
            <span role="alert" className={errorText}>
              {errors.description}
            </span>
          ) : null}
        </div>
        {historyOpen ? (
          <ul className="fhint:m-0 fhint:list-none fhint:border fhint:border-border fhint:bg-muted fhint:p-0">
            {history.map((version) => (
              <li
                key={version.id}
                className="fhint:m-0 fhint:flex fhint:flex-wrap fhint:items-start fhint:gap-3 fhint:border-b fhint:border-b-[#e6e3e3] fhint:px-3.5 fhint:py-[11px] fhint:last:border-b-0"
              >
                <span className="fhint:w-[110px] fhint:flex-none fhint:text-[12.5px] fhint:font-bold fhint:text-muted-strong">
                  {formatWhen(version.created_at)}
                </span>
                <span className="fhint:min-w-[200px] fhint:flex-1 fhint:text-[12.5px] fhint:leading-[1.45] fhint:text-foreground-soft">
                  {version.description}
                </span>
                <button
                  type="button"
                  onClick={() => set("description")(version.description)}
                  className={linkButton}
                >
                  {__("Use this", "foundhint-local-seo")}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <div className="fhint:grid fhint:grid-cols-[repeat(auto-fit,minmax(min(100%,260px),1fr))] fhint:gap-[18px]">
        <TextField
          label={__("Website", "foundhint-local-seo")}
          type="url"
          inputMode="url"
          value={model.website}
          onChange={set("website")}
          error={errors?.website}
        />
        <TextField
          label={__("Phone number", "foundhint-local-seo")}
          type="tel"
          inputMode="tel"
          value={model.phone}
          onChange={set("phone")}
          error={errors?.phone}
        />
      </div>

      <div className="fhint:flex fhint:flex-wrap fhint:items-center fhint:gap-3 fhint:border fhint:border-border fhint:bg-muted fhint:px-[15px] fhint:py-[13px]">
        <div className="fhint:min-w-0 fhint:flex-1">
          <strong className="fhint:block fhint:text-[13px]">
            {__("Google CID", "foundhint-local-seo")}
          </strong>
          <span className="fhint:text-[12.5px] fhint:text-muted-strong">
            {cid
              ? __(
                  "Google's own ID for this listing on Maps. You cannot change it, but some directories and tools ask for it.",
                  "foundhint-local-seo",
                )
              : google?.mapped
                ? __(
                    "Google's ID for your listing on Maps. It appears here the next time your listing is read from Google.",
                    "foundhint-local-seo",
                  )
                : __(
                    "Google's ID for your listing on Maps. It appears here once you connect Google.",
                    "foundhint-local-seo",
                  )}
          </span>
        </div>
        {cid ? (
          <span className="fhint:flex fhint:flex-wrap fhint:items-center fhint:gap-[7px]">
            <code className="fhint:border fhint:border-border fhint:bg-card fhint:px-2.5 fhint:py-[7px] fhint:font-mono fhint:text-[12.5px]">
              {cid}
            </code>
            <button type="button" onClick={copyCid} className={quietButton}>
              <span aria-live="polite">
                {copied
                  ? __("Copied", "foundhint-local-seo")
                  : __("Copy", "foundhint-local-seo")}
              </span>
            </button>
            <a
              href={`https://maps.google.com/?cid=${encodeURIComponent(cid)}`}
              target="_blank"
              rel="noopener noreferrer"
              className={quietButton}
            >
              {__("Open in Maps", "foundhint-local-seo")}
              <ExternalLinkIcon aria-hidden="true" className="fhint:size-3" />
            </a>
          </span>
        ) : null}
        {!cid && !google?.mapped ? (
          <Link
            to="/google"
            className={cn(primaryButton, "fhint:no-underline")}
          >
            {__("Connect Google", "foundhint-local-seo")}
          </Link>
        ) : null}
      </div>
    </>
  );
}

export default InfoSection;
