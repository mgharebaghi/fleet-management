"use client";

import { useState } from "react";

import { ActionButton } from "@/components/ui/action-button/action-button";
import { FormActions } from "@/components/ui/form-field/form-field";
import { InlineNotice } from "@/components/ui/inline-notice/inline-notice";
import { SearchableSelect } from "@/components/ui/searchable-select/searchable-select";
import { StatusBadge } from "@/components/ui/status-badge/status-badge";
import { TechnicalValue } from "@/components/ui/technical-value/technical-value";
import { VehiclePlate } from "@/components/ui/vehicle-plate/vehicle-plate";
import {
  assignmentIneligibilityReasons,
  isAssignmentEligible,
} from "../../application/trip-assignment-eligibility";
import type { TripAssignmentReference } from "../../application/trip-records";
import { assignmentIneligibilityMessages } from "../trip-form-data";
import { TripPassengerSwitcher } from "../passenger/trip-passenger-switcher";
import type {
  CreateWizardAssignments,
  CreateWizardPassenger,
} from "./create-wizard";
import styles from "./create-trip.module.css";

function assignmentLabel(assignment: TripAssignmentReference) {
  return `${assignment.driverFirstName} ${assignment.driverLastName} — ${assignment.vehicle.brandName} ${assignment.vehicle.modelName} — ${assignment.vehicle.vehicleCode}`;
}

type AssignmentStepProps = {
  hidden: boolean;
  passengers: CreateWizardPassenger[];
  assignmentsByPassenger: CreateWizardAssignments;
  selectedAssignments: Record<number, number>;
  onSelectionChange: (passengerKey: number, assignmentId: number) => void;
  onBack: () => void;
  onNext: () => void;
};

export function AssignmentStep({
  hidden,
  passengers,
  assignmentsByPassenger,
  selectedAssignments,
  onSelectionChange,
  onBack,
  onNext,
}: AssignmentStepProps) {
  const [activePassengerIndex, setActivePassengerIndex] = useState(0);
  const [stepNotice, setStepNotice] = useState<string | null>(null);
  if (hidden) return null;

  const passenger = passengers[activePassengerIndex] ?? passengers[0];
  const assignments = passenger
    ? assignmentsByPassenger[passenger.key] ?? []
    : [];
  const scheduledDateTime = new Date(passenger?.requestedPickupAt ?? "");
  const eligible = assignments.filter((assignment) =>
    isAssignmentEligible(assignment, scheduledDateTime),
  );
  const ineligible = assignments.filter(
    (assignment) => !isAssignmentEligible(assignment, scheduledDateTime),
  );
  const selectedId = passenger
    ? selectedAssignments[passenger.key]
    : undefined;
  const selected = assignments.find(
    (assignment) => assignment.assignmentId === selectedId,
  );

  function handleNext() {
    const missingIndex = passengers.findIndex(
      (item) => !selectedAssignments[item.key],
    );
    if (missingIndex >= 0) {
      setActivePassengerIndex(missingIndex);
      setStepNotice(
        `لطفاً برای ${passengers[missingIndex].personName} راننده و خودرو انتخاب کنید.`,
      );
      return;
    }
    setStepNotice(null);
    onNext();
  }

  return (
    <div className={styles.stepContainer}>
      <div className={styles.stepHeader}>
        <div>
          <h2>راننده و خودرو</h2>
          <p className={styles.stepDescription}>
            برای هر مسافر یک تخصیص واجد شرایط انتخاب کنید. انتخاب‌ها تا ثبت نهایی فقط در همین فرم نگه‌داری می‌شوند.
          </p>
        </div>
        <StatusBadge
          label={`${Object.keys(selectedAssignments).length} از ${passengers.length} انتخاب‌شده`}
          tone={passengers.every((item) => selectedAssignments[item.key]) ? "positive" : "info"}
        />
      </div>

      {passengers.length > 1 && (
        <TripPassengerSwitcher
          passengerCount={passengers.length}
          activeIndex={activePassengerIndex}
          onSelect={(index) => {
            setStepNotice(null);
            setActivePassengerIndex(index);
          }}
          tabLabel={(index) => passengers[index]?.personName ?? `مسافر ${index + 1}`}
          tabBadge={(index) =>
            selectedAssignments[passengers[index]?.key] ? "انتخاب‌شده" : "نیازمند تخصیص"
          }
          ariaLabel="مسافران برای تخصیص"
        />
      )}

      {stepNotice && <InlineNotice tone="danger" role="alert">{stepNotice}</InlineNotice>}

      {passenger && (
        <section className={styles.assignmentPanel}>
          <div className={styles.assignmentContext}>
            <div>
              <span className={styles.detailLabel}>مسافر</span>
              <strong>{passenger.personName}</strong>
              {passenger.personnelNo && (
                <span className={styles.muted}>پرسنلی: <TechnicalValue>{passenger.personnelNo}</TechnicalValue></span>
              )}
            </div>
            <div>
              <span className={styles.detailLabel}>مسیر درخواست</span>
              <strong>{passenger.originName} ← {passenger.destinationName}</strong>
            </div>
            <div>
              <span className={styles.detailLabel}>زمان برنامه‌ریزی‌شده</span>
              <strong>{passenger.requestedPickupLabel}</strong>
            </div>
          </div>

          <SearchableSelect
            key={`${passenger.key}-${selectedId ?? "none"}`}
            name={`assignment.${passenger.key}`}
            label="تخصیص واجد شرایط"
            options={eligible.map((assignment) => ({
              value: String(assignment.assignmentId),
              label: assignmentLabel(assignment),
              searchText: `${assignmentLabel(assignment)} ${assignment.driverPersonnelNo ?? ""}`,
              content: <span>{assignmentLabel(assignment)}</span>,
            }))}
            defaultValue={selectedId ? String(selectedId) : ""}
            placeholder="انتخاب راننده و خودرو…"
            searchPlaceholder="جستجوی راننده، خودرو، پلاک یا کد…"
            disabled={eligible.length === 0}
            required
            onValueChange={(value) => {
              setStepNotice(null);
              onSelectionChange(passenger.key, Number(value));
            }}
          />

          {eligible.length === 0 && (
            <InlineNotice tone="info">در این زمان تخصیص واجد شرایطی یافت نشد.</InlineNotice>
          )}

          {selected && (
            <div className={styles.selectedAssignmentCard}>
              <div className={styles.cardHeader}>
                <div>
                  <span className={styles.mutedLabel}>انتخاب فعلی</span>
                  <h3>{selected.driverFirstName} {selected.driverLastName}</h3>
                </div>
                <StatusBadge label="آماده ثبت نهایی" tone="positive" />
              </div>
              <div className={styles.assignmentDetailsGrid}>
                <div className={styles.detailBlock}>
                  <span className={styles.detailLabel}>خودرو</span>
                  <strong>{selected.vehicle.brandName} {selected.vehicle.modelName}</strong>
                </div>
                <div className={styles.detailBlock}>
                  <span className={styles.detailLabel}>پلاک</span>
                  <div className={styles.plateWrapper}>
                    <VehiclePlate vehicle={selected.vehicle} />
                  </div>
                </div>
                <div className={styles.detailBlock}>
                  <span className={styles.detailLabel}>وضعیت</span>
                  <span>{selected.vehicle.vehicleStatusName}</span>
                </div>
              </div>
            </div>
          )}

          {ineligible.length > 0 && (
            <details className={styles.ineligibleDetails}>
              <summary>{ineligible.length} تخصیص غیرقابل‌انتخاب</summary>
              <ul className={styles.ineligibleList}>
                {ineligible.map((item) => (
                  <li key={item.assignmentId}>
                    <strong>{assignmentLabel(item)}</strong>
                    <span>{assignmentIneligibilityReasons(item, scheduledDateTime).map((reason) => assignmentIneligibilityMessages[reason]).join(" · ")}</span>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </section>
      )}

      <div className={styles.stepActions}>
        <FormActions>
          <ActionButton type="button" variant="secondary" onClick={onBack}>قبلی</ActionButton>
          <ActionButton type="button" onClick={handleNext}>بعدی: مسیر سفر</ActionButton>
        </FormActions>
      </div>
    </div>
  );
}
