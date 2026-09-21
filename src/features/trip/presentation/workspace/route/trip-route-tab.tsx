import { InlineNotice } from "@/components/ui/inline-notice/inline-notice";
import type {
  TripLocationReference,
  TripRequestDetails,
} from "../../../application/trip-records";
import { TripRouteDialog } from "../../trip-route-dialog";
import { RouteCard } from "../trip-route-card";
import styles from "../trip-workspace.module.css";
import { groupRoutesForDisplay } from "../trip-workspace-view";

export function RouteTab({
  details,
  locations,
  isPlanningFrozen,
}: {
  details: TripRequestDetails;
  locations: TripLocationReference[];
  isPlanningFrozen: boolean;
}) {
  const routeGroups = groupRoutesForDisplay(details.passengers);
  const hasExistingRoutes = routeGroups.length > 0;

  return (
    <section
      id="workspace-tab-route"
      className={styles.tabPanel}
      aria-label="مسیر"
      tabIndex={-1}
    >
      {!isPlanningFrozen && (
        <div className={styles.routeActionRow}>
          <TripRouteDialog
            key={routeGroups.length}
            tripRequestId={details.tripRequestId}
            passengers={details.passengers}
            locations={locations}
            triggerLabel={
              hasExistingRoutes
                ? "افزودن مسیر جایگزین"
                : "ثبت مسیر برنامه‌ریزی‌شده"
            }
          />
        </div>
      )}

      {routeGroups.length === 0 ? (
        <InlineNotice tone="info" role="status">
          هنوز مسیر اختیاری برای این سفر ثبت نشده است.
        </InlineNotice>
      ) : (
        <div className={styles.recordList}>
          {routeGroups.map(({ route, label }) => (
            <RouteCard
              key={route.routeId}
              route={route}
              label={label}
              tripRequestId={details.tripRequestId}
              passengers={details.passengers}
              locations={locations}
              isPlanningFrozen={isPlanningFrozen}
            />
          ))}
        </div>
      )}
    </section>
  );
}
