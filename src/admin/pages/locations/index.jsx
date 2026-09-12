import { __ } from "@wordpress/i18n";

const Locations = () => {
  return (
    <div className="fhint:space-y-2">
      <h1 className="fhint:text-xl fhint:font-semibold">
        {__("Locations", "found-hint")}
      </h1>
      <p className="fhint:text-muted-foreground fhint:text-sm">
        {__(
          "Scaffold page — content lands as each module is built.",
          "found-hint",
        )}
      </p>
    </div>
  );
};

export default Locations;
