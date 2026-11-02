import { useId, useRef, useState } from "react";
import { __ } from "@wordpress/i18n";
import { cn } from "cn";
import { chooseImages, hasMediaLibrary } from "@/lib/media";

// Google takes JPEG and PNG only; the library shows just those.
const TYPES = ["image/jpeg", "image/png"];

/**
 * A control that opens the WordPress Media Library — or, where it isn't on
 * the page, the file picker — and, when `droppable`, takes files dropped
 * onto it.
 *
 * With the library, the chosen images go to `onAttachments` (`{ id, url }`)
 * and nothing is uploaded again. Without it, a real `<input type="file">`
 * does the work, hidden but focusable and labelled. Dropped files always go
 * to `onFiles`, and the server checks every photo the same way.
 */
export function Picker({
  children,
  multiple,
  disabled,
  onFiles,
  onAttachments,
  className,
  droppable = false,
  draggingClassName,
  label,
  libraryTitle,
}) {
  const id = useId();
  const input = useRef(null);
  const [dragging, setDragging] = useState(false);
  const library = Boolean(onAttachments) && hasMediaLibrary();

  const take = (list) => {
    const files = [...(list ?? [])];

    if (files.length) {
      // One slot takes one photo: the first of several dropped.
      onFiles(multiple ? files : files.slice(0, 1));
    }
  };

  const openLibrary = async () => {
    const images = await chooseImages({
      title: libraryTitle ?? label,
      button: multiple
        ? __("Add to gallery", "foundhint-local-seo")
        : __("Use this photo", "foundhint-local-seo"),
      multiple,
      types: TYPES,
    });

    if (images.length) {
      onAttachments(multiple ? images : images.slice(0, 1));
    }
  };

  const dropHandlers =
    droppable && !disabled
      ? {
          onDragOver: (event) => {
            event.preventDefault();
            setDragging(true);
          },
          onDragLeave: () => setDragging(false),
          onDrop: (event) => {
            event.preventDefault();
            setDragging(false);
            take(event.dataTransfer?.files);
          },
        }
      : {};

  const look = cn(
    className,
    dragging && draggingClassName,
    disabled && "fhint:cursor-not-allowed fhint:opacity-60",
  );

  if (library) {
    return (
      <button
        type="button"
        disabled={disabled}
        aria-label={label}
        onClick={openLibrary}
        {...dropHandlers}
        className={cn(
          look,
          "fhint:focus-visible:ring-2 fhint:focus-visible:ring-ring fhint:focus-visible:ring-offset-1 fhint:focus-visible:outline-none",
        )}
      >
        {children}
      </button>
    );
  }

  return (
    <>
      <input
        ref={input}
        id={id}
        type="file"
        accept={TYPES.join(",")}
        multiple={multiple}
        disabled={disabled}
        aria-label={label}
        onChange={(event) => {
          const files = event.target.files;

          take(files);
          // Cleared so choosing the same file twice still fires a change.
          event.target.value = "";
        }}
        className="fhint:peer fhint:sr-only"
      />
      <label
        htmlFor={id}
        {...dropHandlers}
        className={cn(
          look,
          // The input is what takes focus; show it on the visible control.
          "fhint:peer-focus-visible:ring-2 fhint:peer-focus-visible:ring-ring fhint:peer-focus-visible:ring-offset-1",
        )}
      >
        {children}
      </label>
    </>
  );
}

export default Picker;
