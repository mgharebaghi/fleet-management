"use client";

import { ActionButton } from "@/components/ui/action-button/action-button";
import { FormActions } from "@/components/ui/form-field/form-field";
import { StatusBadge } from "@/components/ui/status-badge/status-badge";
import { VehiclePlate } from "@/components/ui/vehicle-plate/vehicle-plate";
import type {
  CreateWizardAssignments,
  CreateWizardPassenger,
  CreateWizardRoute,
} from "./create-wizard";
import styles from "./create-trip.module.css";

type PlanningStepProps = {
  hidden: boolean;
  passengers: CreateWizardPassenger[];
  assignmentsByPassenger: CreateWizardAssignments;
  selectedAssignments: Record<number, number>;
  routes: CreateWizardRoute[];
  onBack: () => void;
  onNext: () => void;
};

export function PlanningStep({
  hidden,
  passengers,
  assignmentsByPassenger,
  selectedAssignments,
  routes,
  onBack,
  onNext,
}: PlanningStepProps) {
  if (hidden) return null;
  const planned = passengers.map((passenger) => ({
    passenger,
    assignment: (assignmentsByPassenger[passenger.key] ?? []).find(
      (item) => item.assignmentId === selectedAssignments[passenger.key],
    ),
    routes: routes.filter((route) => route.passengerKey === passenger.key),
  }));
  const allAssigned = planned.every((item) => item.assignment);

  return (
    <div className={styles.stepContainer}>
      <div className={styles.stepHeader}>
        <div>
          <h2>برنامه‌ریزی و برگه مأموریت</h2>
          <p className={styles.stepDescription}>
            برنامهٔ در انتظار ثبت را بررسی کنید. شماره درخواست و برگه مأموریت پس از ثبت نهایی ساخته می‌شوند.
          </p>
        </div>
        <StatusBadge label={allAssigned ? "برنامه‌ریزی کامل" : "نیازمند تخصیص"} tone={allAssigned ? "positive" : "warning"} />
      </div>

      <section className={styles.planningSection}>
        <div className={styles.sectionHeader}>
          <h3>خلاصه برنامه مسافران</h3>
          <p>{passengers.length} مسافر · هنوز هیچ رکوردی در پایگاه داده ایجاد نشده است.</p>
        </div>
        <div className={styles.planningPassengerList}>
          {planned.map(({ passenger, assignment, routes: passengerRoutes }) => (
            <article key={passenger.key} className={styles.planningPassengerCard}>
              <div className={styles.cardHeader}>
                <div>
                  <strong>{passenger.personName}</strong>
                  <span className={styles.passengerRouteText}>{passenger.originName} ← {passenger.destinationName}</span>
                </div>
                <StatusBadge label={assignment ? "انتخاب‌شده" : "بدون تخصیص"} tone={assignment ? "positive" : "warning"} />
              </div>
              {assignment && (
                <div className={styles.planningAssignmentGrid}>
                  <div className={styles.detailBlock}>
                    <span className={styles.detailLabel}>راننده</span>
                    <strong>{assignment.driverFirstName} {assignment.driverLastName}</strong>
                  </div>
                  <div className={styles.detailBlock}>
                    <span className={styles.detailLabel}>خودرو و پلاک</span>
                    <div className={styles.vehicleDetailContent}>
                      <strong>{assignment.vehicle.brandName} {assignment.vehicle.modelName}</strong>
                      <div className={styles.plateWrapper}>
                        <VehiclePlate vehicle={assignment.vehicle} />
                      </div>
                    </div>
                  </div>
                  <div className={styles.detailBlock}>
                    <span className={styles.detailLabel}>مسیر برنامه‌ریزی‌شده</span>
                    <span>{passengerRoutes.length ? passengerRoutes.map((route) => route.routeName).join("، ") : "بدون مسیر اختیاری"}</span>
                  </div>
                </div>
              )}
            </article>
          ))}
        </div>
      </section>

      <section className={styles.planningSection}>
        <div className={styles.sectionHeader}>
          <h3>برگه مأموریت</h3>
          <p>پس از ثبت نهایی درخواست و تولید شناسه‌های سفر، مشاهده و چاپ برگه مأموریت در صفحه جزئیات در دسترس خواهد بود.</p>
        </div>
      </section>

      <div className={styles.stepActions}>
        <FormActions>
          <ActionButton type="button" variant="secondary" onClick={onBack}>قبلی: مسیر سفر</ActionButton>
          <ActionButton type="button" disabled={!allAssigned} onClick={onNext}>بعدی: مرور و تأیید نهایی</ActionButton>
        </FormActions>
      </div>
    </div>
  );
}
