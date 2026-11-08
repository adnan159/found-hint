import { cn } from "cn";
import { errorText, help, label } from "@/pages/profile/styles";

/** One labelled input with its counter and error. */
export function Field({
  id,
  title,
  required,
  count,
  max,
  error,
  hint,
  children,
}) {
  return (
    <div className="fhint:grid fhint:gap-1.5">
      <span className="fhint:flex fhint:items-baseline fhint:gap-2">
        <label htmlFor={id} className={label}>
          {title}
          {required ? (
            <span aria-hidden="true" className="fhint:text-destructive">
              {" *"}
            </span>
          ) : null}
        </label>
        {max ? (
          <span
            className={cn(
              "fhint:ml-auto fhint:text-[12px] fhint:font-semibold",
              count > max
                ? "fhint:text-destructive"
                : "fhint:text-muted-strong",
            )}
          >
            {`${count.toLocaleString()} / ${max.toLocaleString()}`}
          </span>
        ) : null}
      </span>
      {children}
      {hint && !error ? <span className={help}>{hint}</span> : null}
      {error ? (
        <span id={`${id}-error`} role="alert" className={errorText}>
          {error}
        </span>
      ) : null}
    </div>
  );
}

/** The aria props every composer input shares. */
export function invalidProps(id, field, errors) {
  return {
    "aria-invalid": errors[field] ? true : undefined,
    "aria-describedby": errors[field] ? `${id}-${field}-error` : undefined,
  };
}

export default Field;
