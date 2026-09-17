import { __ } from "@wordpress/i18n";
import { cn } from "cn";
import { Spinner } from "@/components/ui/spinner";

/**
 * The "Continue with Google" button.
 *
 * Google's sign-in branding guidelines allow a custom button, and set the
 * terms: their own mark, unaltered and in its four colours; one of their
 * approved labels ("Continue with Google" here); at least 40px tall with
 * the mark at 18px; and enough contrast around it. That is why this is a
 * plain element rather than the plugin's `Button` — the house style is a
 * square orange button, and dressing Google's mark in it would breach the
 * guidelines while also looking like something it is not.
 *
 * The one deliberate departure is the corner radius: Google's rectangular
 * variant is 4px, this plugin is square throughout, and their guidelines
 * do allow a square shape. Everything else follows the spec.
 *
 * It is a real sign-in entry point — pressing it leaves for Google's own
 * page — so it is also used for "Reconnect", which starts the same flow.
 */
export function GoogleSignInButton({
  onClick,
  disabled,
  isBusy,
  label,
  className,
  describedBy,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-describedby={describedBy}
      className={cn(
        // 40px tall, 12px side padding, the mark 18px with a 10px gap: the
        // proportions Google's guidelines specify.
        "fhint:inline-flex fhint:h-10 fhint:cursor-pointer fhint:items-center fhint:gap-2.5 fhint:border fhint:border-[#747775] fhint:bg-white fhint:px-3 fhint:text-[14px] fhint:font-medium fhint:text-[#1f1f1f]",
        "fhint:hover:bg-[#f7f8f8] fhint:focus-visible:ring-[3px] fhint:focus-visible:ring-ring/50 fhint:focus-visible:outline-none",
        "fhint:disabled:cursor-not-allowed fhint:disabled:opacity-60",
        className,
      )}
    >
      {isBusy ? <Spinner className="fhint:size-[18px]" /> : <GoogleMark />}
      {label || __("Continue with Google", "found-hint")}
    </button>
  );
}

/**
 * Google's "G", exactly as their branding assets draw it.
 *
 * Inline rather than an image file so it stays crisp at any size and needs
 * no extra request; the paths and the four colours are theirs and must not
 * be recoloured, rotated or redrawn.
 *
 * @return {JSX.Element} The mark.
 */
function GoogleMark() {
  return (
    <svg
      aria-hidden="true"
      width="18"
      height="18"
      viewBox="0 0 48 48"
      className="fhint:size-[18px] fhint:shrink-0"
    >
      <path
        fill="#4285F4"
        d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z"
      />
      <path
        fill="#34A853"
        d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z"
      />
      <path
        fill="#FBBC05"
        d="M11.69 28.18C11.25 26.86 11 25.45 11 24s.25-2.86.69-4.18v-5.7H4.34C2.85 17.09 2 20.45 2 24s.85 6.91 2.34 9.88l7.35-5.7z"
      />
      <path
        fill="#EA4335"
        d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z"
      />
    </svg>
  );
}

export default GoogleSignInButton;
