import { useId } from "react";
import Hint from "@/components/Hint";
import { cn } from "cn";
import {
  errorText,
  help as helpClass,
  input,
  label as labelClass,
} from "../styles";

/**
 * A labelled text input with its hint and its error.
 *
 * `hint` is the field's standing advice and rides beside the label in a
 * tooltip; `help` is text that has to stay on screen, so it sits under the
 * input as before.
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
  hint,
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
      <div className="fhint:flex fhint:items-center fhint:gap-1.5">
        <label htmlFor={id} className={labelClass}>
          {label}
        </label>
        {hint ? <Hint about={label} text={hint} /> : null}
      </div>
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
