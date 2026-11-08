import { __, sprintf } from "@wordpress/i18n";
import { cn } from "cn";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { errorText, focus } from "@/pages/profile/styles";
import SoonTag from "../SoonTag";
import { sourceItems } from "../../lib/autoReply";

const warn = "fhint:border-[#E8A317]";

/**
 * One cell of "How to reply": My templates, AI reply (coming soon) or
 * Don't reply — and, for My templates, which of that rating and kind's
 * templates to send.
 *
 * @param {Object}   props
 * @param {string}   props.name      "5 stars, with a comment", for labels.
 * @param {string}   props.source    template | off.
 * @param {number}   props.pick      The chosen template's id, 0 for none.
 * @param {Object[]} props.templates That rating and kind's templates.
 * @param {string}   props.error     The server's message for this cell.
 * @param {Function} props.onChange  `{ source }` or `{ pick }`.
 * @param {Function} props.onAdd     Write a template for this cell.
 */
export function RuleCell({
  name,
  source,
  pick,
  templates,
  error,
  onChange,
  onAdd,
}) {
  const items = sourceItems();
  const chosen = templates.some((template) => template.id === pick);
  const none = source === "template" && !templates.length;
  const unpicked = source === "template" && templates.length > 0 && !chosen;

  return (
    <span className="fhint:grid fhint:gap-1.5">
      <Select
        items={items}
        value={source}
        onValueChange={(value) => value && onChange({ source: value })}
      >
        <SelectTrigger
          aria-label={name}
          className={cn(
            "fhint:w-full",
            source === "off" && "fhint:text-muted-strong",
            (none || error) && warn,
          )}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {items.map((item) => (
            <SelectItem
              key={item.value}
              value={item.value}
              disabled={item.soon}
            >
              {item.label}
              {item.soon ? <SoonTag /> : null}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {source === "template" && templates.length ? (
        <Select
          items={templates.map((t) => ({ value: t.id, label: t.name }))}
          value={chosen ? pick : null}
          onValueChange={(value) => value && onChange({ pick: value })}
        >
          <SelectTrigger
            aria-label={sprintf(
              /* translators: %s: a rating and kind, e.g. "5 stars, with a comment". */
              __("Template for %s", "foundhint-local-seo"),
              name,
            )}
            className={cn("fhint:w-full", unpicked && warn)}
          >
            <SelectValue
              placeholder={__("Choose a template", "foundhint-local-seo")}
            />
          </SelectTrigger>
          <SelectContent>
            {templates.map((template) => (
              <SelectItem key={template.id} value={template.id}>
                {template.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : null}

      {none ? (
        <span className="fhint:text-[12px] fhint:text-[#8a5a00]">
          {__("No templates yet.", "foundhint-local-seo")}{" "}
          <button
            type="button"
            onClick={onAdd}
            className={cn(
              "fhint:cursor-pointer fhint:border-0 fhint:bg-transparent fhint:p-0 fhint:font-bold fhint:text-[#D8521F] fhint:underline",
              focus,
            )}
          >
            {__("Add one", "foundhint-local-seo")}
          </button>
        </span>
      ) : null}

      {error && !none ? <span className={errorText}>{error}</span> : null}
    </span>
  );
}

export default RuleCell;
