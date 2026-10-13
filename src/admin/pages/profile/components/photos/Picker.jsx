import { useId, useRef } from "react";
import { cn } from "cn";

/**
 * A button that opens the file picker.
 *
 * A real `<input type="file">` does the work, hidden but still focusable and
 * labelled, so it is reachable from the keyboard and announced as what it is.
 */
export function Picker({ children, multiple, disabled, onFiles, className }) {
  const id = useId();
  const input = useRef(null);

  return (
    <>
      <input
        ref={input}
        id={id}
        type="file"
        accept="image/jpeg,image/png"
        multiple={multiple}
        disabled={disabled}
        onChange={(event) => {
          const files = [...(event.target.files ?? [])];

          // Cleared so choosing the same file twice still fires a change.
          event.target.value = "";

          if (files.length) {
            onFiles(files);
          }
        }}
        className="fhint:peer fhint:sr-only"
      />
      <label
        htmlFor={id}
        className={cn(
          className,
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
