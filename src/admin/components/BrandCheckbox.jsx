import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "cn";

/**
 * The plugin's checkbox: the shadcn Checkbox with a firmer edge.
 *
 * Not a native `<input type="checkbox">`: WordPress's admin stylesheet
 * redraws those — its own blue tick, its own size, a negative top margin —
 * which ignored the brand colour and pushed each box out of line with the
 * row beside it. This one is a Base UI control the admin styles leave alone.
 *
 * @param {Object}   props
 * @param {boolean}  props.checked         Ticked.
 * @param {Function} props.onCheckedChange Receives the new state.
 */
export function BrandCheckbox({ className, ...props }) {
  return (
    <Checkbox
      className={cn(
        "fhint:size-[18px] fhint:border-[#b9b2af] fhint:bg-card",
        className,
      )}
      {...props}
    />
  );
}

export default BrandCheckbox;
