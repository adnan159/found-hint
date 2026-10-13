import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { __ } from "@wordpress/i18n";
import { ArrowLeftRightIcon } from "lucide-react";
import { pillButton } from "./styles";

/**
 * The menu that changes which location's profile is on screen.
 *
 * @param {Object}   props
 * @param {Object[]} props.locations Every location of the business.
 * @param {?Object}  props.location  The one on screen.
 * @param {Function} props.onSwitch  Called with the id chosen.
 */
export function LocationSwitcher({ locations, location, onSwitch }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className={pillButton}>
        <ArrowLeftRightIcon aria-hidden="true" className="fhint:size-3.5" />
        {__("Switch location", "foundhint-local-seo")}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="fhint:w-[300px] fhint:rounded-none"
      >
        <DropdownMenuGroup>
          <DropdownMenuLabel>
            {__("Show the profile of", "foundhint-local-seo")}
          </DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={String(location?.id ?? "")}
            onValueChange={(value) => onSwitch(Number(value))}
          >
            {locations.map((item) => (
              <DropdownMenuRadioItem
                key={item.id}
                value={String(item.id)}
                className="fhint:cursor-pointer fhint:items-start fhint:rounded-none"
              >
                <span className="fhint:grid fhint:min-w-0 fhint:gap-0.5">
                  <span className="fhint:font-bold">
                    {item.name}
                    {item.is_primary ? (
                      <span className="fhint:ml-2 fhint:text-[10px] fhint:font-extrabold fhint:tracking-[0.07em] fhint:text-muted-strong fhint:uppercase">
                        {__("Main", "foundhint-local-seo")}
                      </span>
                    ) : null}
                  </span>
                  {item.address ? (
                    <span className="fhint:text-[12.5px] fhint:text-muted-strong">
                      {item.address}
                    </span>
                  ) : null}
                </span>
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default LocationSwitcher;
