import { __ } from "@wordpress/i18n";
import { TriangleAlertIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { errorMessage } from "@/lib/errors";

/**
 * A failed request, stated in one sentence.
 *
 * `role="alert"` so it is announced: a save that silently fails is the
 * worst outcome for someone who cannot see the screen change.
 */
export function RequestError({ error, title }) {
  if (!error) {
    return null;
  }

  return (
    <Alert variant="destructive" role="alert">
      <TriangleAlertIcon />
      <AlertTitle>{title || __("That did not save", "found-hint")}</AlertTitle>
      <AlertDescription>{errorMessage(error)}</AlertDescription>
    </Alert>
  );
}

export default RequestError;
