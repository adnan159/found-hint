import { CalendarIcon, FileTextIcon, TagIcon } from "lucide-react";
import { cn } from "cn";

/** Each post type's icon and tint, as in the design. */
export const TYPE_STYLE = {
  update: {
    Icon: FileTextIcon,
    tile: "fhint:bg-[#eaeef6] fhint:text-[#33558f]",
  },
  event: {
    Icon: CalendarIcon,
    tile: "fhint:bg-[#efebf8] fhint:text-[#6a4fb3]",
  },
  offer: { Icon: TagIcon, tile: "fhint:bg-[#fdeee6] fhint:text-[#c2551f]" },
};

/** A tinted square with the post type's icon. Decorative: the type is also said in words. */
export function TypeIcon({ type, className, iconClassName }) {
  const { Icon, tile } = TYPE_STYLE[type] ?? TYPE_STYLE.update;

  return (
    <span
      aria-hidden="true"
      className={cn(
        "fhint:grid fhint:flex-none fhint:place-items-center",
        tile,
        className,
      )}
    >
      <Icon className={cn("fhint:size-4", iconClassName)} />
    </span>
  );
}

export default TypeIcon;
