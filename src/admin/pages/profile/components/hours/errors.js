// The errors of one day, with the day's own prefix taken off.
export function errorsUnder(errors, prefix) {
  const found = {};

  for (const [key, message] of Object.entries(errors ?? {})) {
    if (key === prefix) {
      found[""] = message;
    } else if (key.startsWith(`${prefix}.`)) {
      found[key.slice(prefix.length + 1)] = message;
    }
  }

  return found;
}

// The one message a day shows under its row.
export const firstOf = (errors) => Object.values(errors)[0];
