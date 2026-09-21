import { DataTable } from "@/components/ui/data-table/data-table";
import {
  RecordCard,
  RecordCardDetail,
  RecordCardDetails,
  RecordCardHeader,
  RecordCardList,
} from "@/components/ui/record-cards/record-cards";
import { StatusBadge } from "@/components/ui/status-badge/status-badge";
import { TechnicalValue } from "@/components/ui/technical-value/technical-value";
import type {
  TripLocationReference,
  TripPersonReference,
  TripRequestDetails,
} from "../../../application/trip-records";
import { formatTripDateTime } from "../../trip-format";
import { tripRequestStatusTone } from "../../trip-list-status-tone";
import {
  AddPassengerButton,
  DeletePassengerButton,
  EditPassengerButton,
} from "../../trip-passenger-dialog";
import styles from "../trip-workspace.module.css";
import {
  presentPlanningExecutionStatusLabel,
  presentTripPassengerStatus,
} from "../trip-workspace-passenger-display";
import type { TripWorkspaceView } from "../trip-workspace-view";

type PassengerItem = TripWorkspaceView["passengers"][number];

function PassengerIdentity({ item }: { item: PassengerItem }) {
  return (
    <span className={styles.passengerIdentityBlock}>
      <strong className={styles.passengerName}>{item.personName}</strong>
      {(item.personnelNo || item.mobile) && (
        <span className={styles.passengerIdentity}>
          {item.personnelNo && (
            <span>
              پرسنلی <TechnicalValue>{item.personnelNo}</TechnicalValue>
            </span>
          )}
          {item.mobile && (
            <span>
              موبایل <TechnicalValue>{item.mobile}</TechnicalValue>
            </span>
          )}
        </span>
      )}
      {item.description && (
        <span className={styles.passengerDescription}>{item.description}</span>
      )}
    </span>
  );
}

function PassengerRoute({ item }: { item: PassengerItem }) {
  return (
    <span className={styles.passengerRoute}>
      <span>{item.originName}</span>
      <span aria-hidden="true">←</span>
      <span>{item.destinationName}</span>
    </span>
  );
}

function PassengerStatus({ item }: { item: PassengerItem }) {
  return (
    <StatusBadge
      label={presentTripPassengerStatus(item.passengerStatus)}
      tone={tripRequestStatusTone(item.passengerStatus ?? "")}
    />
  );
}

function PassengerTable({
  passengers,
  details,
  people,
  locations,
  isPlanningFrozen,
}: {
  passengers: PassengerItem[];
  details: TripRequestDetails;
  people: TripPersonReference[];
  locations: TripLocationReference[];
  isPlanningFrozen: boolean;
}) {
  return (
    <div className={styles.passengerTable}>
      <DataTable caption="فهرست مسافران سفر" minWidth={680}>
        <thead>
          <tr>
            <th scope="col">مسافر</th>
            <th scope="col">مسیر</th>
            <th scope="col">زمان درخواست سوارشدن</th>
            <th scope="col">ترتیب (سوار / پیاده)</th>
            <th scope="col">وضعیت مسافر</th>
            <th scope="col">برنامه‌ریزی / اجرا</th>
            {!isPlanningFrozen && <th scope="col">عملیات</th>}
          </tr>
        </thead>
        <tbody>
          {passengers.map((item) => {
            const trip = details.passengers.find((p) => p.tripId === item.tripId);
            return (
              <tr key={item.tripId}>
                <td>
                  <PassengerIdentity item={item} />
                </td>
                <td>
                  <PassengerRoute item={item} />
                </td>
                <td className={styles.passengerDateTime}>
                  {formatTripDateTime(item.pickupAt)}
                </td>
                <td className={styles.passengerOrder}>
                  {item.pickupOrder ?? "—"} / {item.dropoffOrder ?? "—"}
                </td>
                <td>
                  <PassengerStatus item={item} />
                </td>
                <td className={styles.passengerPlanningStatus}>
                  {presentPlanningExecutionStatusLabel(item)}
                </td>
                {!isPlanningFrozen && trip && (
                  <td>
                    <div className={styles.passengerActions}>
                      <EditPassengerButton
                        tripRequestId={details.tripRequestId}
                        passenger={trip}
                        people={people}
                        locations={locations}
                      />
                      <DeletePassengerButton
                        tripRequestId={details.tripRequestId}
                        trip={trip}
                      />
                    </div>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </DataTable>
    </div>
  );
}

function PassengerCards({
  passengers,
  details,
  people,
  locations,
  isPlanningFrozen,
}: {
  passengers: PassengerItem[];
  details: TripRequestDetails;
  people: TripPersonReference[];
  locations: TripLocationReference[];
  isPlanningFrozen: boolean;
}) {
  return (
    <RecordCardList>
      {passengers.map((item) => {
        const trip = details.passengers.find((p) => p.tripId === item.tripId);
        return (
          <RecordCard key={item.tripId}>
            <RecordCardHeader
              title={<PassengerIdentity item={item} />}
              badge={<PassengerStatus item={item} />}
            />
            <RecordCardDetails>
              <RecordCardDetail label="مسیر">
                <PassengerRoute item={item} />
              </RecordCardDetail>
              <RecordCardDetail label="زمان درخواست سوارشدن">
                {formatTripDateTime(item.pickupAt)}
              </RecordCardDetail>
              <RecordCardDetail label="ترتیب سوار / پیاده">
                {item.pickupOrder ?? "—"} / {item.dropoffOrder ?? "—"}
              </RecordCardDetail>
              <RecordCardDetail label="برنامه‌ریزی / اجرا">
                {presentPlanningExecutionStatusLabel(item)}
              </RecordCardDetail>
            </RecordCardDetails>
            {!isPlanningFrozen && trip && (
              <div className={styles.passengerCardActions}>
                <EditPassengerButton
                  tripRequestId={details.tripRequestId}
                  passenger={trip}
                  people={people}
                  locations={locations}
                />
                <DeletePassengerButton
                  tripRequestId={details.tripRequestId}
                  trip={trip}
                />
              </div>
            )}
          </RecordCard>
        );
      })}
    </RecordCardList>
  );
}

export function PassengersTab({
  details,
  view,
  people,
  locations,
  isPlanningFrozen,
}: {
  details: TripRequestDetails;
  view: TripWorkspaceView;
  people: TripPersonReference[];
  locations: TripLocationReference[];
  isPlanningFrozen: boolean;
}) {
  return (
    <section
      id="workspace-tab-passengers"
      className={styles.tabPanel}
      aria-label="مسافران"
      tabIndex={-1}
    >
      {!isPlanningFrozen && (
        <div className={styles.passengerHeaderActions}>
          <div />
          <AddPassengerButton
            tripRequestId={details.tripRequestId}
            people={people}
            locations={locations}
            commonOriginId={details.passengers[0]?.originLocationId}
            commonDestinationId={details.passengers[0]?.destinationLocationId}
          />
        </div>
      )}
      <PassengerTable
        passengers={view.passengers}
        details={details}
        people={people}
        locations={locations}
        isPlanningFrozen={isPlanningFrozen}
      />
      <PassengerCards
        passengers={view.passengers}
        details={details}
        people={people}
        locations={locations}
        isPlanningFrozen={isPlanningFrozen}
      />
    </section>
  );
}
