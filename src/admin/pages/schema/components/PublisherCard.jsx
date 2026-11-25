import { __ } from "@wordpress/i18n";
import { AlertTriangleIcon, InfoIcon } from "lucide-react";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import SectionCard from "@/components/SectionCard";
import { MODE_HINTS, MODE_LABELS } from "../lib/modes";

/**
 * "Who publishes it": FoundHint, the site's SEO plugin, or nobody — and
 * which other installed plugins may print local business markup too.
 *
 * @param {Object}   props
 * @param {Object}   props.ownership    Ownership block of the /schema response.
 * @param {string}   props.mode         The saved mode.
 * @param {Function} props.onModeChange Saves a new mode.
 * @param {boolean}  props.isSaving     A save is in flight.
 */
export function PublisherCard({ ownership, mode, onModeChange, isSaving }) {
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

export default PublisherCard;
