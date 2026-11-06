import {
  BadgeInfoIcon,
  Building2Icon,
  ClockIcon,
  HashIcon,
  ListChecksIcon,
  MapPinIcon,
  PhoneIcon,
} from "lucide-react";

/**
 * The icon in each field group's title bar — the Business Profile's own
 * where the two screens share a section (business info, address, hours).
 */
export const GROUP_ICONS = {
  info: Building2Icon,
  identity: BadgeInfoIcon,
  contact: PhoneIcon,
  address: MapPinIcon,
  reach: ClockIcon,
  code: HashIcon,
  extras: ListChecksIcon,
};
