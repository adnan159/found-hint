import { __ } from "@wordpress/i18n";
import { AlertTriangleIcon, InfoIcon } from "lucide-react";
import { toast } from "sonner";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import SectionCard from "@/components/SectionCard";
import {
  useGetSettingsQuery,
  useUpdateSettingsMutation,
} from "@/store/api/settingsApi";

/**
 * "Who publishes it" — the free plugin's own control over its LocalBusiness
 * markup when an SEO plugin may publish one too. Kept working in the
 * Settings tab until FoundHint Pro's per-type owners replace it
 * (docs/SCHEMA-PLAN.md Step 5).
 */
const MODE_LABELS = {
  auto: () => __("Automatic", "foundhint-local-seo"),
  plugin: () => __("FoundHint publishes it", "foundhint-local-seo"),
  seo_plugin: () => __("My SEO plugin publishes it", "foundhint-local-seo"),
  disabled: () => __("Nobody publishes it", "foundhint-local-seo"),
};

const MODE_HINTS = {
  auto: () =>
    __(
      "FoundHint publishes the markup unless it finds another plugin already doing it.",
      "foundhint-local-seo",
    ),
  plugin: () =>
    __(
      "Always publish, even if something else might be publishing too.",
      "foundhint-local-seo",
    ),
  seo_plugin: () =>
    __(
      "Never publish. Use this when your SEO plugin already describes the business.",
      "foundhint-local-seo",
    ),
  disabled: () =>
    __(
      "No local business markup is published from this site.",
      "foundhint-local-seo",
    ),
};

export function WhoPublishes({ ownership = {} }) {
  const { data: settingsData } = useGetSettingsQuery();
  const [updateSettings, { isLoading: isSaving }] = useUpdateSettingsMutation();
  const mode = settingsData?.settings?.schema_mode ?? ownership.mode ?? "auto";

  const onModeChange = async (next) => {
    if (!next || next === mode) {
      return;
    }

    try {
      await updateSettings({ schema_mode: next }).unwrap();
      toast.success(__("Saved.", "foundhint-local-seo"));
    } catch {
      // Shown inline.
    }
  };

  return (
    <SectionCard
      id="schema-owner"
      title={__("Who publishes it", "foundhint-local-seo")}
      description={__(
        "Two descriptions of the same business on one page is worse than one — search engines pick one and ignore the other.",
        "foundhint-local-seo",
      )}
    >
      <Field>
        <FieldLabel htmlFor="schema-mode">
          {__("Publishing", "foundhint-local-seo")}
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
            {__("Also installed", "foundhint-local-seo")}
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
                        "foundhint-local-seo",
                      )
                    : plugin.emits_local_business === false
                      ? __(
                          "— does not publish local business markup.",
                          "foundhint-local-seo",
                        )
                      : __(
                          "— may publish local business markup, depending on how it is set up. Check your page source if you are not sure.",
                          "foundhint-local-seo",
                        )}
                </span>
              </span>
            </div>
          ))}
        </div>
      ) : null}
    </SectionCard>
  );
}

export default WhoPublishes;
