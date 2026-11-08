import { __, sprintf } from "@wordpress/i18n";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { errorText, label } from "@/pages/profile/styles";

/**
 * With "New and unanswered": how many older reviews may be answered a day.
 * Every reply notifies its reviewer, so a large backlog goes out a little
 * each day. New reviews are never held back.
 *
 * @param {Object}   props
 * @param {number}   props.value    25 | 50 | 100 | 200, or 0 for no limit.
 * @param {number}   props.today    Older reviews answered today.
 * @param {string}   props.error    The server's message.
 * @param {Function} props.onChange Receives the number.
 */
export function DailyLimit({ value, today = 0, error, onChange }) {
  const items = [25, 50, 100, 200]
    .map((n) => ({
      value: n,
      label: sprintf(
        /* translators: %d: older reviews answered a day. */
        __("%d a day", "foundhint-local-seo"),
        n,
      ),
    }))
    .concat({ value: 0, label: __("No limit", "foundhint-local-seo") });

  return (
    <div className="fhint:grid fhint:gap-1.5">
      <label htmlFor="fhint-auto-reply-limit" className={label}>
        {__("Older reviews per day", "foundhint-local-seo")}
      </label>
      <Select
        items={items}
        value={value}
        onValueChange={(next) => (next === null ? null : onChange(next))}
      >
        <SelectTrigger id="fhint-auto-reply-limit" className="fhint:w-48">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {items.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <span className="fhint:text-[12.5px] fhint:text-muted-strong">
        {sprintf(
          /* translators: %d: older reviews answered today. */
          __(
            "Each reply notifies the reviewer, so older reviews go out a few at a time. New reviews are always answered first. %d answered today.",
            "foundhint-local-seo",
          ),
          today,
        )}
      </span>
      {error ? <span className={errorText}>{error}</span> : null}
    </div>
  );
}

export default DailyLimit;
