import { InlineNotice } from "@/components/ui/inline-notice/inline-notice";
import { StatusBadge } from "@/components/ui/status-badge/status-badge";
import { TechnicalValue } from "@/components/ui/technical-value/technical-value";
import { VehiclePlate } from "@/components/ui/vehicle-plate/vehicle-plate";
import type { TripAssignmentReference } from "../../../application/trip-records";
import styles from "../trip-workspace.module.css";

export function CompletedSummary() {
  return (
    <div className={styles.emptyStateBlock}>
      <InlineNotice tone="info" role="status">
        پروندهٔ این سفر با موفقیت تکمیل شده است.
      </InlineNotice>
    </div>
  );
}

export function TripCrewSection({
  uniqueAssignments,
}: {
  uniqueAssignments: TripAssignmentReference[];
}) {
  return (
    <section className={styles.workspaceSection} aria-label="راننده و خودرو">
      <h3 className={styles.sectionHeading}>راننده و خودرو</h3>
      {uniqueAssignments.length === 0 ? (
        <p className={styles.muted}>اطلاعات راننده و خودرو ثبت‌نشده است.</p>
      ) : (
        <div className={styles.executionList}>
          {uniqueAssignments.map((assignment) => (
            <article
              key={assignment.assignmentId}
              className={styles.executionRow}
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
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
