import { __, sprintf } from "@wordpress/i18n";
import { cn } from "cn";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { dialogButton } from "../../styles";

/** Remove this service for good, or keep it. */
export function RemoveDialog({ open, name, removing, onOpenChange, onRemove }) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {sprintf(
              /* translators: %s: service name. */
              __("Remove %s?", "foundhint-local-seo"),
              name,
            )}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {__(
              "The service is removed from FoundHint, including your profile's service list, and its schema stops printing. To keep it but hide it from your site, switch it off instead.",
              "foundhint-local-seo",
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <button
            type="button"
            className={dialogButton}
            onClick={() => onOpenChange(false)}
          >
            {__("Keep it", "foundhint-local-seo")}
          </button>
          <button
            type="button"
            disabled={removing}
            className={cn(
              dialogButton,
              "fhint:border-0 fhint:bg-[#C02718] fhint:text-white",
            )}
            onClick={onRemove}
          >
            {__("Remove service", "foundhint-local-seo")}
          </button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default RemoveDialog;
