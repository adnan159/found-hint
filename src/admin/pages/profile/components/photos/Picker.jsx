import { useId, useRef, useState } from "react";
import { cn } from "cn";

/**
 * A control that opens the file picker — and, when `droppable`, takes
 * files dropped onto it.
 *
 * A real `<input type="file">` does the work, hidden but still focusable and
 * labelled, so it is reachable from the keyboard and announced as what it is.
 * Dropping is an extra for a mouse; nothing here depends on it.
 *
 * Dropped files go to the same `onFiles` as chosen ones, and the server
 * checks them the same way: a PDF dropped on the logo is refused with the
 * same message as one picked.
 */
export function Picker({
  children,
  multiple,
  disabled,
  onFiles,
  className,
  droppable = false,
  draggingClassName,
  label,
}) {
  const id = useId();
  const input = useRef(null);
  const [dragging, setDragging] = useState(false);

  const take = (list) => {
    const files = [...(list ?? [])];

    if (files.length) {
      // One slot takes one photo: the first of several dropped.
      onFiles(multiple ? files : files.slice(0, 1));
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

  return (
    <>
      <input
        ref={input}
        id={id}
        type="file"
        accept="image/jpeg,image/png"
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
          className,
          dragging && draggingClassName,
          disabled && "fhint:cursor-not-allowed fhint:opacity-60",
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
