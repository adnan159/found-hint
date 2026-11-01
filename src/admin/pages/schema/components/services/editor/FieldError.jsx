import { fieldError } from "../../styles";

/**
 * A field's server error. Messages may come as a list; they are joined.
 */
export function FieldError({ id, messages }) {
  const text = Array.isArray(messages) ? messages.join(" ") : messages;

  if (!text) {
    return null;
  }

  return (
    <span id={id} role="alert" className={fieldError}>
      {text}
    </span>
  );
}

export default FieldError;
