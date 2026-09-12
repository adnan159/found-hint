import { __ } from "@wordpress/i18n";

const NotFound = () => {
  return (
    <div className="fhint:p-6 fhint:space-y-2">
      <h1 className="fhint:text-xl fhint:font-semibold">
        {__("Page not found", "found-hint")}
      </h1>
    </div>
  );
};

export default NotFound;
