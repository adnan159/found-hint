import { __ } from "@wordpress/i18n";
import { AlertTriangleIcon, CheckIcon, InfoIcon } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import NoticeBar from "@/components/NoticeBar";
import PageHeader from "@/components/PageHeader";
import RequestError from "@/components/RequestError";
import SectionCard from "@/components/SectionCard";
import { messageForCode } from "@/lib/errors";
import { useGetSchemaQuery } from "@/store/api/schemaApi";
import {
  useGetSettingsQuery,
  useUpdateSettingsMutation,
} from "@/store/api/settingsApi";

/**
 * What this site publishes about the business, and who publishes it.
 *
 * The preview is the graph the front end would print, read from the same
 * cache — not a second rendering that could quietly disagree with what
 * search engines actually see.
 */
const MODE_LABELS = {
  auto: () => __("Automatic", "found-hint"),
  plugin: () => __("FoundHint publishes it", "found-hint"),
  seo_plugin: () => __("My SEO plugin publishes it", "found-hint"),
  disabled: () => __("Nobody publishes it", "found-hint"),
};

const MODE_HINTS = {
  auto: () =>
    __(
      "FoundHint publishes the markup unless it finds another plugin already doing it.",
      "found-hint",
    ),
  plugin: () =>
    __(
      "Always publish, even if something else might be publishing too.",
      "found-hint",
    ),
  seo_plugin: () =>
    __(
      "Never publish. Use this when your SEO plugin already describes the business.",
      "found-hint",
    ),
  disabled: () =>
    __("No local business markup is published from this site.", "found-hint"),
};

function StatusBanner({ schema }) {
  const { ownership, isPublishable, blockers } = schema;

  if (!ownership) {
    return null;
  }

  if (!ownership.should_publish) {
    return (
      <NoticeBar>
        {ownership.deferring_to_plugin
          ? __(
              "FoundHint is not publishing this markup, because a plugin known to publish it is active.",
              "found-hint",
            )
          : __(
              "FoundHint is not publishing this markup, because of the setting below.",
              "found-hint",
            )}
      </NoticeBar>
    );
  }

  if (!isPublishable) {
    return (
      <Alert variant="destructive" role="alert">
        <AlertTitle>
          {__("Nothing is being published", "found-hint")}
        </AlertTitle>
        <AlertDescription>
          <ul className="fhint:flex fhint:flex-col fhint:gap-1">
            {blockers.map((code) => (
              <li key={code}>{messageForCode(code)}</li>
            ))}
          </ul>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div
      role="status"
      className="fhint:flex fhint:items-center fhint:gap-2 fhint:border fhint:border-border fhint:bg-card fhint:px-4 fhint:py-3 fhint:text-[13px]"
    >
      <CheckIcon
        aria-hidden="true"
        className="fhint:size-4 fhint:text-success"
      />
      {__("This markup is published on your site.", "found-hint")}
    </div>
  );
}

export default function SchemaPage() {
  const { data: schema, isLoading, error } = useGetSchemaQuery(0);
  const { data: settingsData } = useGetSettingsQuery();
  const [updateSettings, { isLoading: isSaving }] = useUpdateSettingsMutation();

  if (isLoading || !schema) {
    return (
      <>
        <PageHeader title={__("Schema", "found-hint")} />
        <Skeleton className="fhint:h-[60vh] fhint:w-full" />
      </>
    );
  }

  const ownership = schema.ownership ?? {};
  const mode = settingsData?.settings?.schema_mode ?? ownership.mode ?? "auto";

  const onModeChange = async (next) => {
    if (!next || next === mode) {
      return;
    }

    try {
      await updateSettings({ schema_mode: next }).unwrap();
      toast.success(__("Saved.", "found-hint"));
    } catch {
      // Shown inline.
    }
  };

  const json = schema.graph ? JSON.stringify(schema.graph, null, 2) : "";

  return (
    <>
      <PageHeader
        title={__("Schema", "found-hint")}
        description={__(
          "The structured data that tells search engines what your business is, where it is, and when it is open.",
          "found-hint",
        )}
      />

      <RequestError error={error} />

      <StatusBanner schema={schema} />

      <SectionCard
        id="schema-owner"
        title={__("Who publishes it", "found-hint")}
        description={__(
          "Two descriptions of the same business on one page is worse than one — search engines pick one and ignore the other.",
          "found-hint",
        )}
      >
        <Field>
          <FieldLabel htmlFor="schema-mode">
            {__("Publishing", "found-hint")}
          </FieldLabel>
          <Select value={mode} onValueChange={onModeChange} disabled={isSaving}>
            <SelectTrigger id="schema-mode">
              {/* Base UI's Value renders the raw value unless given a
                  function. Every other select here happens to use values
                  that read as labels, so this is the first place it shows. */}
              <SelectValue>
                {(value) => (MODE_LABELS[value] ? MODE_LABELS[value]() : value)}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {(ownership.modes ?? Object.keys(MODE_LABELS)).map((value) => (
                <SelectItem key={value} value={value}>
                  {MODE_LABELS[value] ? MODE_LABELS[value]() : value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldDescription>
            {MODE_HINTS[mode] ? MODE_HINTS[mode]() : ""}
          </FieldDescription>
        </Field>

        {ownership.detected?.length ? (
          <div className="fhint:mt-5 fhint:flex fhint:flex-col fhint:gap-2">
            <span className="fhint:text-[11px] fhint:font-extrabold fhint:tracking-[0.1em] fhint:text-muted-foreground fhint:uppercase">
              {__("Also installed", "found-hint")}
            </span>
            {ownership.detected.map((plugin) => (
              <div
                key={plugin.id}
                className="fhint:flex fhint:items-start fhint:gap-2 fhint:text-[13px]"
              >
                {plugin.emits_local_business === true ? (
                  <AlertTriangleIcon
                    aria-hidden="true"
                    className="fhint:mt-0.5 fhint:size-4 fhint:shrink-0"
                  />
                ) : (
                  <InfoIcon
                    aria-hidden="true"
                    className="fhint:mt-0.5 fhint:size-4 fhint:shrink-0 fhint:text-muted-foreground"
                  />
                )}
                <span>
                  <span className="fhint:font-bold">{plugin.name}</span>{" "}
                  <span className="fhint:text-muted-strong">
                    {plugin.emits_local_business === true
                      ? __(
                          "— publishes local business markup of its own.",
                          "found-hint",
                        )
                      : plugin.emits_local_business === false
                        ? __(
                            "— does not publish local business markup.",
                            "found-hint",
                          )
                        : __(
                            "— may publish local business markup, depending on how it is set up. Check your page source if you are not sure.",
                            "found-hint",
                          )}
                  </span>
                </span>
              </div>
            ))}
          </div>
        ) : null}
      </SectionCard>

      {schema.recommendations?.length ? (
        <SectionCard
          id="schema-improve"
          title={__("What would make this better", "found-hint")}
          description={__(
            "None of these stop the markup being published. They just leave less for a search engine to work with.",
            "found-hint",
          )}
        >
          <ul className="fhint:flex fhint:flex-col fhint:gap-1.5 fhint:text-[13px]">
            {schema.recommendations.map((code) => (
              <li key={code} className="fhint:text-muted-strong">
                {messageForCode(code)}
              </li>
            ))}
          </ul>
        </SectionCard>
      ) : null}

      <SectionCard
        id="schema-preview"
        title={__("What gets published", "found-hint")}
        description={__(
          "Exactly what appears in your pages' head, read from the same cache the front end uses.",
          "found-hint",
        )}
        action={
          <Button
            type="button"
            variant="outline"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(json);
                toast.success(__("Copied.", "found-hint"));
              } catch {
                toast.error(
                  __("Could not copy. Select the text instead.", "found-hint"),
                );
              }
            }}
          >
            {__("Copy", "found-hint")}
          </Button>
        }
      >
        {/* Rendered as text, never as markup. The one place the plugin
            shows JSON-LD, and it goes through JSON.stringify on data the
            server produced — there is no innerHTML anywhere near it. */}
        <pre className="fhint:max-h-[520px] fhint:overflow-auto fhint:border fhint:border-border fhint:bg-muted fhint:p-4 fhint:text-[12.5px] fhint:leading-relaxed">
          <code>{json}</code>
        </pre>
      </SectionCard>
    </>
  );
}
