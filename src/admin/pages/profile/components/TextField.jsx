import { useId } from "react";
import { cn } from "cn";
import {
  errorText,
  help as helpClass,
  input,
  label as labelClass,
} from "../styles";

/**
 * A labelled text input with its help and its error.
 *
 * The error, when there is one, replaces nothing: it is added under the
 * field and tied to the input with `aria-describedby`, so a screen reader
 * hears it when the field is focused, and `role="alert"` so it is heard when
 * it appears.
 */
export function TextField({
  label,
  value,
  onChange,
  help,
  error,
  className,
  ...props
}) {
  const id = useId();
  const described = [help ? `${id}-help` : "", error ? `${id}-error` : ""]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={cn("fhint:grid fhint:content-start fhint:gap-1.5", className)}
    >
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      <input
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={described || undefined}
        className={input}
        {...props}
      />
      {help ? (
        <span id={`${id}-help`} className={helpClass}>
          {help}
        </span>
      ) : null}
      {error ? (
        <span id={`${id}-error`} role="alert" className={errorText}>
          {error}
        </span>
      ) : null}
    </div>
  );
}

export default TextField;
