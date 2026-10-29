import TitleBar from "./header/TitleBar";

/**
 * The profile's own title row. Which business and location it shows is the
 * bar at the top of every page (`components/location-bar`).
 */
export function ProfileHeader({
  meta,
  onPublish,
  publishDisabled,
  publishHint,
  onRefresh,
  isRefreshing,
  refreshDisabled,
}) {
  return (
    <header className="fhint:-mx-4 fhint:-mt-6 fhint:flex fhint:flex-col">
      <TitleBar
        meta={meta}
        onPublish={onPublish}
        publishDisabled={publishDisabled}
        publishHint={publishHint}
        onRefresh={onRefresh}
        isRefreshing={isRefreshing}
        refreshDisabled={refreshDisabled}
      />
    </header>
  );
}

export default ProfileHeader;
