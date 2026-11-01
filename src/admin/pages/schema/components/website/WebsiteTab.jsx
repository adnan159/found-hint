import { useEffect, useState } from "react";
import { __, sprintf } from "@wordpress/i18n";
import { toast } from "sonner";
import { cn } from "cn";
import { Switch } from "@/components/ui/switch";
import { errorMessage, fieldErrors } from "@/lib/errors";
import {
  useGetSchemaPagesQuery,
  useGetWebsiteSchemaQuery,
  useSaveWebsiteSchemaMutation,
} from "@/store/api/schemaManagerApi";
import PanelHeading from "../shared/PanelHeading";
import SaveBar from "../shared/SaveBar";
import { caption, fieldError, input, muted, panel } from "../styles";

const ROWS = () => [
  {
    key: "website",
    label: __("Your website", "foundhint-local-seo"),
    type: "WebSite",
    desc: __(
      "Your site name, so Google can show it above your link.",
      "foundhint-local-seo",
    ),
    where: __("Home page", "foundhint-local-seo"),
  },
  {
    key: "webpage",
    label: __("Each page", "foundhint-local-seo"),
    type: "WebPage",
    desc: __(
      "Title and description of every page, read from your page settings.",
      "foundhint-local-seo",
    ),
    where: __("Every page", "foundhint-local-seo"),
  },
  {
    key: "about",
    label: __("About page", "foundhint-local-seo"),
    type: "AboutPage",
    desc: __("Marks the page that tells your story.", "foundhint-local-seo"),
    page: true,
  },
  {
    key: "contact",
    label: __("Contact page", "foundhint-local-seo"),
    type: "ContactPage",
    desc: __(
      "Marks the page with your phone, address and booking details.",
      "foundhint-local-seo",
    ),
    page: true,
  },
  {
    key: "breadcrumbs",
    label: __("Breadcrumbs", "foundhint-local-seo"),
    type: "BreadcrumbList",
    desc: __(
      "The path to each page, shown under your link in Google.",
      "foundhint-local-seo",
    ),
    where: __("Every page except Home", "foundhint-local-seo"),
  },
];

// Which owner key covers each row (Settings → Who publishes it).
const OWNER = {
  website: "WebSite",
  webpage: "WebPage",
  about: "WebPage",
  contact: "WebPage",
  breadcrumbs: "BreadcrumbList",
};

/**
 * 05 Website structure (design C): what the site is, what each page is for,
 * and how pages connect — each row on or off, About and Contact on the page
 * chosen (suggested from its address until confirmed).
 *
 * @param {Object}   props
 * @param {boolean}  props.live          FoundHint prints on the site.
 * @param {Function} props.onDirtyChange Report unsaved changes.
 * @param {Object}   props.saveRef       Save / discard for the guard.
 */
export function WebsiteTab({ live, onDirtyChange, saveRef }) {
  const { data: state } = useGetWebsiteSchemaQuery();
  const [save, saveState] = useSaveWebsiteSchemaMutation();
  const [draft, setDraft] = useState({});
  const { data: pageData } = useGetSchemaPagesQuery({ search: "" });
  const pages = pageData?.pages ?? [];
  const errors = fieldErrors(saveState.error);
  const dirty = Object.keys(draft).length > 0;

  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);

  if (!state) {
    return null;
  }

  const row = (key) => ({ ...state[key], ...(draft[key] ?? {}) });
  const set = (key, changes) => {
    saveState.reset();
    setDraft((current) => ({
      ...current,
      [key]: { ...(current[key] ?? {}), ...changes },
    }));
  };

  const onSave = async () => {
    try {
      await save(draft).unwrap();
      setDraft({});
      toast.success(__("Website structure saved.", "foundhint-local-seo"));
    } catch (error) {
      toast.error(
        Object.keys(fieldErrors(error)).length
          ? __("Some rows need attention.", "foundhint-local-seo")
          : errorMessage(error),
      );
    }
  };

  if (saveRef) {
    saveRef.current = { save: onSave, discard: () => setDraft({}) };
  }

  return (
    <section className={cn(panel, "fhint:min-w-0")}>
      <PanelHeading
        title={__("Website structure", "foundhint-local-seo")}
        description={__(
          "Tells Google what your site is, what each page is for and how pages connect.",
          "foundhint-local-seo",
        )}
      />

      <ul className="fhint:m-0 fhint:list-none fhint:p-0">
        {ROWS().map((item) => {
          const value = row(item.key);
          const on = Boolean(value.enabled);
          const postId = value.post_id || (on ? value.suggested : 0) || 0;
          const owner = state.owners?.[OWNER[item.key]];
          const error = errors[`${item.key}.post_id`];

          return (
            <li
              key={item.key}
              className="fhint:flex fhint:flex-wrap fhint:items-center fhint:gap-4 fhint:border-b fhint:border-b-border fhint:px-5 fhint:py-4"
            >
              <span className="fhint:grid fhint:min-w-0 fhint:flex-[1_1_300px] fhint:gap-0.5">
                <span className="fhint:flex fhint:flex-wrap fhint:items-center fhint:gap-2">
                  <strong className="fhint:text-[14px]">{item.label}</strong>
                  <code className={caption}>{item.type}</code>
                </span>
                <span className={muted}>
                  {item.desc}
                  {item.key === "website" && state.website?.default_name
                    ? ` ${sprintf(
                        /* translators: %s: the website's name. */
                        __("Its name: %s.", "foundhint-local-seo"),
                        state.website.name || state.website.default_name,
                      )}`
                    : ""}
                </span>
                {owner && owner !== "fhint" ? (
                  <span className="fhint:text-[12px] fhint:font-bold fhint:text-warning-foreground">
                    {__(
                      "Your SEO plugin publishes this type (Settings → Who publishes it), so FoundHint leaves it out.",
                      "foundhint-local-seo",
                    )}
                  </span>
                ) : null}
                {item.page && on && !value.post_id && value.suggested ? (
                  <span className="fhint:text-[12px] fhint:text-muted-strong">
                    {__(
                      "Found by its address. Save to confirm it.",
                      "foundhint-local-seo",
                    )}
                  </span>
                ) : null}
              </span>

              <span className="fhint:grid fhint:min-w-[200px] fhint:gap-1">
                <span className="fhint:text-[11.5px] fhint:font-bold fhint:tracking-[0.06em] fhint:text-muted-strong fhint:uppercase">
                  {__("Added to", "foundhint-local-seo")}
                </span>
                {item.page ? (
                  <>
                    <select
                      value={postId || ""}
                      disabled={!on}
                      onChange={(event) =>
                        set(item.key, {
                          post_id: Number(event.target.value) || 0,
                        })
                      }
                      aria-label={sprintf(
                        /* translators: %s: e.g. "About page". */
                        __("Page for %s", "foundhint-local-seo"),
                        item.label,
                      )}
                      aria-invalid={Boolean(error)}
                      className={cn(
                        input(error ? "missing" : on ? "open" : "locked"),
                        "fhint:pr-8!",
                      )}
                    >
                      <option value="">
                        {__("Choose a page", "foundhint-local-seo")}
                      </option>
                      {pages.map((page) => (
                        <option key={page.id} value={page.id}>
                          {page.title}
                        </option>
                      ))}
                    </select>
                    {error ? (
                      <span role="alert" className={fieldError}>
                        {error}
                      </span>
                    ) : null}
                  </>
                ) : (
                  <span className="fhint:text-[13px]">
                    {on ? item.where : __("Not added", "foundhint-local-seo")}
                  </span>
                )}
              </span>

              <Switch
                checked={on}
                onCheckedChange={(next) =>
                  set(
                    item.key,
                    item.page && next && !value.post_id && value.suggested
                      ? { enabled: next, post_id: value.suggested }
                      : { enabled: next },
                  )
                }
                aria-label={sprintf(
                  /* translators: %s: e.g. "WebSite". */
                  __("%s schema", "foundhint-local-seo"),
                  item.type,
                )}
              />
            </li>
          );
        })}
      </ul>

      <SaveBar
        dirty={dirty}
        saving={saveState.isLoading}
        status="active"
        live={live}
        onSave={onSave}
      />
    </section>
  );
}

export default WebsiteTab;
