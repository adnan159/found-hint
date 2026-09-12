/**
 * The accent-tinted band used for plan limits and similar "heads up"
 * messages.
 *
 * Deliberately not an Alert: an Alert reads as a problem, and being on the
 * free plan is not a problem. The colours come from the notice tokens in
 * index.css rather than literal hex values.
 */
export function NoticeBar({ children, action }) {
  return (
    <div
      role="status"
      className="fhint:flex fhint:flex-wrap fhint:items-center fhint:gap-3 fhint:border fhint:border-notice-border fhint:bg-notice fhint:px-4 fhint:py-3.5 fhint:text-sm fhint:text-notice-foreground"
    >
      <span>{children}</span>
      {action ? <span className="fhint:ml-auto">{action}</span> : null}
    </div>
  );
}

export default NoticeBar;
