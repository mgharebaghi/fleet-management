import { InlineNotice } from "@/components/ui/inline-notice/inline-notice";
import { StatusBadge } from "@/components/ui/status-badge/status-badge";
import { TechnicalValue } from "@/components/ui/technical-value/technical-value";
import { VehiclePlate } from "@/components/ui/vehicle-plate/vehicle-plate";
import type { TripAssignmentReference } from "../../../application/trip-records";
import styles from "../trip-workspace.module.css";

export function CompletedSummary({
  uniqueAssignments,
}: {
  uniqueAssignments: TripAssignmentReference[];
}) {
  return (
    <>
      <div className={styles.emptyStateBlock}>
        <InlineNotice tone="info" role="status">
          پروندهٔ این سفر با موفقیت تکمیل شده است.
        </InlineNotice>
      </div>

      <section className={styles.workspaceSection}>
        <div className={styles.sectionHeader}>
          <div>
            <h3>مشخصات راننده و خودرو</h3>
            <p>اطلاعات راننده و خودروی مجری سفر</p>
          </div>
        </div>
        {uniqueAssignments.length === 0 ? (
          <p className={styles.muted}>اطلاعات راننده و خودرو ثبت‌نشده است.</p>
        ) : (
          <div className={styles.stack}>
            {uniqueAssignments.map((assignment) => (
              <article
                key={assignment.assignmentId}
                className={styles.operationalSectionCard}
              >
                <div className={styles.operationalCardHeader}>
                  <h4>راننده و خودرو</h4>
                  <StatusBadge label="تکمیل‌شده" tone="positive" />
                </div>
                <div className={styles.operationalAssignmentItem}>
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
              </article>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
