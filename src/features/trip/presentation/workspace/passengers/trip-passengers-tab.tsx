import { DataTable } from "@/components/ui/data-table/data-table";
import { RecordDetailsButton } from "../../../../../components/ui/record-details-button/record-details-button";
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
} from "../../passenger/trip-passenger-dialog";
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
      <DataTable caption="فهرست مسافران سفر">
        <thead>
          <tr>
            <th scope="col">مسافر</th>
            <th scope="col">مسیر و زمان سوارشدن</th>
            <th scope="col">ترتیب و وضعیت اجرا</th>
            <th scope="col">عملیات</th>
          </tr>
        </thead>
        <tbody>
          {passengers.map((item) => {
            const trip = details.passengers.find((p) => p.tripId === item.tripId);
            return (
              <tr key={item.tripId}>
                <td>
                  <PassengerIdentity item={item} />
                  <PassengerStatus item={item} />
                </td>
                <td>
                  <PassengerRoute item={item} />
                  <div>{formatTripDateTime(item.pickupAt)}</div>
                </td>
                <td>
                  <span className={styles.passengerOrder}>{item.pickupOrder ?? "—"} / {item.dropoffOrder ?? "—"}</span>
                  <div>{presentPlanningExecutionStatusLabel(item)}</div>
                </td>
                  <td>
                    <div className={styles.passengerActions}>
                      <RecordDetailsButton title={item.personName} fields={[["مبدأ", item.originName], ["مقصد", item.destinationName], ["زمان سوارشدن", formatTripDateTime(item.pickupAt)]]} description={item.description} />
                      {!isPlanningFrozen && trip && <>
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
                      </>}
                    </div>
                  </td>
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
            <RecordDetailsButton title={item.personName} fields={[["مبدأ", item.originName], ["مقصد", item.destinationName], ["زمان سوارشدن", formatTripDateTime(item.pickupAt)]]} description={item.description} />
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
