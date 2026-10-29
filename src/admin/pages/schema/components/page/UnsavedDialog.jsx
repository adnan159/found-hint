import { __ } from "@wordpress/i18n";
import { cn } from "cn";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { dialogButton } from "../styles";

/**
 * Save / Discard / Stay, asked before unsaved edits would be dropped.
 * Driven by `useUnsavedGuard`.
 */
export function UnsavedDialog({ open, onStay, onDiscard, onSave }) {
  return (
    <AlertDialog open={open} onOpenChange={(next) => (next ? null : onStay())}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {__("You have unsaved changes", "foundhint-local-seo")}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {__(
              "Save them before you leave this tab, discard them, or stay here.",
              "foundhint-local-seo",
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <button type="button" className={dialogButton} onClick={onStay}>
            {__("Stay", "foundhint-local-seo")}
          </button>
          <button type="button" className={dialogButton} onClick={onDiscard}>
            {__("Discard", "foundhint-local-seo")}
          </button>
          <button
            type="button"
            className={cn(
              dialogButton,
              "fhint:border-0 fhint:bg-[#FF6B35] fhint:text-white",
            )}
            onClick={onSave}
          >
            {__("Save", "foundhint-local-seo")}
          </button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default UnsavedDialog;
