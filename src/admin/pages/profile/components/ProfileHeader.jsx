import BusinessBar from "./header/BusinessBar";
import TitleBar from "./header/TitleBar";

/**
 * The two bars at the top of the profile: which business and location the
 * screen is showing, and the page's own title row beneath it.
 *
 * The business bar needs the profile, so it is left out until `meta` has
 * loaded.
 */
export function ProfileHeader({
  info,
  meta,
  onSwitch,
  onPublish,
  publishDisabled,
  publishHint,
}) {
  return (
    <header className="fhint:-mx-4 fhint:-mt-6 fhint:flex fhint:flex-col">
      {meta ? (
        <BusinessBar info={info} meta={meta} onSwitch={onSwitch} />
      ) : null}
      <TitleBar
        meta={meta}
        onPublish={onPublish}
        publishDisabled={publishDisabled}
        publishHint={publishHint}
      />
    </header>
  );
}

export default ProfileHeader;
