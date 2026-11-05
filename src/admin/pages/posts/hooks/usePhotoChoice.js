import { errorMessage, fieldErrors } from "@/lib/errors";
import {
  usePostPhotoFromLibraryMutation,
  useUploadPostPhotoMutation,
} from "@/store/api/postsApi";

/**
 * Turning a chosen photo into the link a post uses: a dropped or picked
 * file is uploaded; a Media Library photo is used as it is. Either way the
 * server answers with the link (Google's own, when this site is not public
 * and the photo went on the listing's gallery).
 *
 * @param {string}   locationName Google location resource name.
 * @param {Function} onChange     `{ media_url, attachment_id, reachable, viaGallery }`.
 */
export function usePhotoChoice(locationName, onChange) {
  const [upload, uploadState] = useUploadPostPhotoMutation();
  const [fromLibrary, libraryState] = usePostPhotoFromLibraryMutation();
  const error = uploadState.error ?? libraryState.error;

  const take = async (request) => {
    uploadState.reset();
    libraryState.reset();

    try {
      const result = await request.unwrap();

      onChange({
        media_url: result.url,
        attachment_id: result.attachment_id,
        reachable: result.reachable,
        viaGallery: result.via_gallery,
      });
    } catch {
      // Shown under the photo field.
    }
  };

  return {
    busy: uploadState.isLoading || libraryState.isLoading,
    message: fieldErrors(error).file ?? (error ? errorMessage(error) : ""),
    onFiles: ([file]) => (file ? take(upload({ file, locationName })) : null),
    onAttachments: ([image]) =>
      image
        ? take(fromLibrary({ attachmentId: image.id, locationName }))
        : null,
  };
}

export default usePhotoChoice;
