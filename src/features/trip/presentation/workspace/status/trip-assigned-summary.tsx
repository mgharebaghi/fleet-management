import { StatusBadge } from "@/components/ui/status-badge/status-badge";
import { TechnicalValue } from "@/components/ui/technical-value/technical-value";
import { VehiclePlate } from "@/components/ui/vehicle-plate/vehicle-plate";
import type {
  TripAssignmentReference,
  TripRequestDetails,
} from "../../../application/trip-records";
import { formatTripDateTime } from "../../trip-format";
import styles from "../trip-workspace.module.css";

export function AssignedOperationalSummary({
  details,
  uniqueAssignments,
}: {
  details: TripRequestDetails;
  uniqueAssignments: TripAssignmentReference[];
}) {
  return (
    <section className={styles.workspaceSection}>
      <div className={styles.sectionHeader}>
        <div>
          <h3>خلاصهٔ عملیاتی سفر آمادهٔ شروع</h3>
          <p>مشخصات راننده، خودرو و زمان‌بندی حرکت پیش از شروع عملیات</p>
        </div>
      </div>

      <div className={styles.operationalSummaryGrid}>
        {/* بخش ۱: مسافر / مسافران */}
        <section className={styles.operationalSectionCard}>
          <div className={styles.operationalCardHeader}>
            <h4>
              {details.passengers.length > 1 ? "مسافران" : "مسافر"}
            </h4>
            <StatusBadge label="آمادهٔ شروع" tone="warning" />
          </div>
          <div className={styles.operationalPassengerList}>
            {details.passengers.map((trip) => (
              <div
                key={trip.tripId}
                className={styles.operationalPassengerItem}
              >
                <div className={styles.operationalPassengerMain}>
                  <strong>
                    {trip.passenger.firstName} {trip.passenger.lastName}
                  </strong>
                  {trip.passenger.personnelNo && (
                    <span className={styles.muted}>
                      پرسنلی:{" "}
                      <TechnicalValue>
                        {trip.passenger.personnelNo}
                      </TechnicalValue>
                    </span>
                  )}
                </div>
                <dl className={styles.compactFacts}>
                  <div>
                    <dt>زمان حرکت درخواستی</dt>
                    <dd>
                      {formatTripDateTime(
                        trip.requestedPickupDateTime ??
                          details.requestedTravelDateTime,
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt>مسیر</dt>
                    <dd>
                      {trip.origin.locationName} ←{" "}
                      {trip.destination.locationName}
                    </dd>
                  </div>
                </dl>
              </div>
            ))}
          </div>
        </section>

        {/* بخش ۲: راننده و خودرو */}
        <section className={styles.operationalSectionCard}>
          <div className={styles.operationalCardHeader}>
            <h4>راننده و خودرو</h4>
            <StatusBadge label="تخصیص ثبت‌شده" tone="positive" />
          </div>
          {uniqueAssignments.length === 0 ? (
            <p className={styles.muted}>تخصیص ثبت‌نشده است.</p>
          ) : (
            uniqueAssignments.map((assignment) => (
              <div
                key={assignment.assignmentId}
                className={styles.operationalAssignmentItem}
              >
                <dl className={styles.compactFacts}>
                  <div>
                    <dt>راننده</dt>
                    <dd>
                      {assignment.driverFirstName}{" "}
                      {assignment.driverLastName}
                    </dd>
                  </div>
                  <div>
                    <dt>شماره پرسنلی راننده</dt>
                    <dd>
                      <TechnicalValue>
                        {assignment.driverPersonnelNo ?? "—"}
                      </TechnicalValue>
                    </dd>
                  </div>
                  <div>
                    <dt>وضعیت گواهینامه</dt>
                    <dd>
                      <StatusBadge
                        label={
                          assignment.hasEligibleLicense
                            ? "گواهینامه واجد شرایط"
                            : "فاقد گواهینامه واجد شرایط"
                        }
                        tone={
                          assignment.hasEligibleLicense
                            ? "positive"
                            : "negative"
                        }
                      />
                    </dd>
                  </div>
                  <div>
                    <dt>خودرو</dt>
                    <dd>
                      {assignment.vehicle.brandName}{" "}
                      {assignment.vehicle.modelName}
                    </dd>
                  </div>
                  <div>
                    <dt>پلاک خودرو</dt>
                    <dd>
                      <VehiclePlate vehicle={assignment.vehicle} />
                    </dd>
                  </div>
                  <div>
                    <dt>کد خودرو</dt>
                    <dd>
                      <TechnicalValue>
                        {assignment.vehicle.vehicleCode}
                      </TechnicalValue>
                    </dd>
                  </div>
                </dl>
              </div>
            ))
          )}
        </section>
      </div>
    </section>
  );
}
