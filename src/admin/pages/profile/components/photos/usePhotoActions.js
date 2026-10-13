import { useState } from "react";
import { errorMessage, fieldErrors } from "@/lib/errors";
import {
  useAddPhotoMutation,
  usePublishPhotoMutation,
  useRemovePhotoMutation,
} from "@/store/api/profileApi";

/**
 * Choosing, removing and sending photos.
 *
 * Everything goes one file at a time: each is its own request, so a refusal
 * names the file it belongs to and Google is not handed a burst of writes.
 *
 * @param {number}   locationId The location the photos belong to.
 * @param {Function} onChanged  Called when the profile should be read again.
 */
export function usePhotoActions(locationId, onChanged) {
  const [addPhoto] = useAddPhotoMutation();
  const [removePhoto] = useRemovePhotoMutation();
  const [publishPhoto] = usePublishPhotoMutation();

  const [busy, setBusy] = useState(false);
  const [sending, setSending] = useState(null);
  const [problems, setProblems] = useState([]);

  const add = (role) => async (files) => {
    setBusy(true);
    setProblems([]);

    const refused = [];

    // One at a time: each is a file being stored, and a failure names its file.
    for (const file of files) {
      try {
        await addPhoto({ file, role, locationId }).unwrap();
      } catch (error) {
        refused.push({
          name: file.name,
          message: fieldErrors(error).file ?? errorMessage(error),
        });
      }
    }

    setProblems(refused);
    setBusy(false);
  };

  const remove = async (photos) => {
    setBusy(true);
    setProblems([]);

    for (const photo of photos) {
      try {
        await removePhoto({ id: photo.id, locationId }).unwrap();
      } catch (error) {
        setProblems([{ name: "", message: errorMessage(error) }]);
        break;
      }
    }

    setBusy(false);
  };

  const upload = async (queue) => {
    setBusy(true);
    setProblems([]);

    let failed = 0;

    // In order and one at a time, so each photo reports for itself and
    // Google is not handed a burst of writes.
    for (const photo of queue) {
      setSending(photo.id);

      try {
        await publishPhoto({ id: photo.id, locationId }).unwrap();
      } catch {
        failed += 1;
      }
    }

    setSending(null);
    setBusy(false);

    // A refusal comes back as an error, not as the profile, so the reason
    // Google gave is read back from the server.
    if (failed) {
      onChanged?.();
    }
  };

  return { busy, sending, problems, add, remove, upload };
}

export default usePhotoActions;
