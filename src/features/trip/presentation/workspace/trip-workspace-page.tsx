import { notFound } from "next/navigation";

import { PageShell } from "@/components/ui/page-shell/page-shell";
import type {
  TripAssignmentReference,
  TripLocationReference,
  TripPersonReference,
  TripRequestDetails,
} from "../../application/trip-records";
import { makeReadTrips } from "../../composition/trip.factory";
import { DriverVehicleTab } from "./assignment/trip-assignment-tab";
import { DetailsTab } from "./details/trip-details-tab";
import { WorkspaceIdentity } from "./identity/trip-workspace-identity";
import { NextActionPanel } from "./next-action-panel";
import { PassengersTab } from "./passengers/trip-passengers-tab";
import { RouteTab } from "./route/trip-route-tab";
import { StatusCompletionTab } from "./status/trip-status-tab";
import { TripWorkspaceFocus } from "./trip-workspace-focus";
import { TripWorkspaceTabs } from "./trip-workspace-tabs";
import styles from "./trip-workspace.module.css";
import {
  projectTripWorkspace,
  workspaceSectionForTab,
  type TripWorkspaceView,
  type WorkspaceSectionId,
} from "./trip-workspace-view";

function ActiveTabPanel({
  section,
  details,
  view,
  people,
  locations,
  assignments,
  isPlanningFrozen,
  requestIsTerminal,
}: {
  section: WorkspaceSectionId;
  details: TripRequestDetails;
  view: TripWorkspaceView;
  people: TripPersonReference[];
  locations: TripLocationReference[];
  assignments: TripAssignmentReference[];
  isPlanningFrozen: boolean;
  requestIsTerminal: boolean;
}) {
  switch (section) {
    case "passengers":
      return (
        <PassengersTab
          details={details}
          view={view}
          people={people}
          locations={locations}
          isPlanningFrozen={isPlanningFrozen}
        />
      );
    case "assignment":
      return (
        <DriverVehicleTab
          details={details}
          assignments={assignments}
          isPlanningFrozen={isPlanningFrozen}
        />
      );
    case "route":
      return (
        <RouteTab
          details={details}
          locations={locations}
          isPlanningFrozen={isPlanningFrozen}
        />
      );
    case "completion":
      return (
        <StatusCompletionTab
          details={details}
          view={view}
          requestIsTerminal={requestIsTerminal}
        />
      );
    default:
      return <DetailsTab details={details} view={view} />;
  }
}

export async function TripWorkspacePage({
  tripRequestId,
  requestedTab,
}: {
  tripRequestId: number;
  requestedTab?: string;
}) {
  const reader = makeReadTrips();
  const details = await reader.details(tripRequestId);
  if (!details) notFound();
  const view = projectTripWorkspace(details);
  const section = workspaceSectionForTab(requestedTab);
  const requestIsTerminal =
    details.status === "Completed" || details.status === "Cancelled";
  const isPlanningFrozen =
    requestIsTerminal || details.status === "InProgress";
  const people =
    section === "passengers" && !isPlanningFrozen
      ? await reader.availablePeople()
      : [];
  const locations =
    section === "route" || (section === "passengers" && !isPlanningFrozen)
      ? await reader.availableLocations()
      : [];
  const assignments =
    section === "assignment" && !isPlanningFrozen
      ? await reader.assignmentsActiveAt(details.requestedTravelDateTime)
      : [];

  return (
    <PageShell>
      <TripWorkspaceFocus sectionId={section} />
      <div className={styles.workspace}>
        <WorkspaceIdentity view={view} backHref="/trips/requests" />
        <div className={styles.workspaceBody}>
          <TripWorkspaceTabs
            tripRequestId={details.tripRequestId}
            activeSection={section}
            tripRequestStatus={details.status}
          >
            <ActiveTabPanel
              section={section}
              details={details}
              view={view}
              people={people}
              locations={locations}
              assignments={assignments}
              isPlanningFrozen={isPlanningFrozen}
              requestIsTerminal={requestIsTerminal}
            />
          </TripWorkspaceTabs>
          <NextActionPanel details={details} view={view} />
        </div>
      </div>
    </PageShell>
  );
}
