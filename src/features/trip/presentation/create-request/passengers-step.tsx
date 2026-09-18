import { ActionButton } from "../../../../components/ui/action-button/action-button";
import { JalaliDatePicker } from "../../../../components/ui/date-picker/jalali-date-picker";
import {
  FieldLabel,
  FormActions,
  FormField,
  formControlClassName,
} from "../../../../components/ui/form-field/form-field";
import { FormGrid } from "../../../../components/ui/form-grid/form-grid";
import { SearchableSelect } from "../../../../components/ui/searchable-select/searchable-select";
import { TechnicalValue } from "../../../../components/ui/technical-value/technical-value";
import { TimeSelect } from "../../../../components/ui/time-select/time-select";
import type {
  TripLocationReference,
  TripPersonReference,
} from "../../application/trip-records";
import { LocationPicker } from "../location/location-picker";
import styles from "../trip-forms.module.css";

export function PassengersStep({
  hidden,
  prefix,
  pending,
  people,
  locations,
  passengerCount,
  shareOrigin,
  shareDestination,
  value,
  fieldInvalid,
  onAddPassenger,
  onRemoveLastPassenger,
  onBack,
  onReview,
}: {
  hidden: boolean;
  prefix: string;
  pending: boolean;
  people: TripPersonReference[];
  locations: TripLocationReference[];
  passengerCount: number;
  shareOrigin: boolean;
  shareDestination: boolean;
  value: (name: string) => string;
  fieldInvalid: (name: string) => boolean;
  onAddPassenger: () => void;
  onRemoveLastPassenger: () => void;
  onBack: () => void;
  onReview: () => void;
}) {
  const personOptions = people.map((person) => ({
    value: String(person.personId),
    label: `${person.firstName} ${person.lastName} ${person.personnelNo ?? ""}`,
    searchText: `${person.firstName} ${person.lastName} ${person.personnelNo ?? ""} ${person.mobile ?? ""}`,
    content: (
      <span>
        {person.firstName} {person.lastName}
        {person.personnelNo && (
          <>
            {" — "}
            <TechnicalValue>{person.personnelNo}</TechnicalValue>
          </>
        )}
      </span>
    ),
  }));

  return (
    <section
      className={styles.section}
      hidden={hidden}
      aria-labelledby={`${prefix}-passengers`}
    >
      <div className={styles.sectionHeading}>
        <div>
          <h2 id={`${prefix}-passengers`}>مسافران</h2>
        </div>
        <ActionButton
          type="button"
          variant="secondary"
          size="sm"
          disabled={pending}
          onClick={onAddPassenger}
        >
          افزودن مسافر
        </ActionButton>
      </div>
      <p className={styles.hint}>
        اگر زمان سوارشدن هر مسافر خالی بماند، همان زمان برنامه‌ریزی‌شدهٔ
        درخواست استفاده می‌شود.
      </p>

      <input
        type="hidden"
        name="passengerCount"
        value={passengerCount}
        readOnly
      />

      <div className={styles.passengerList}>
        {Array.from({ length: passengerCount }, (_, index) => (
          <article className={styles.passengerCard} key={index}>
            <div className={styles.passengerHeader}>
              <h3>مسافر {index + 1}</h3>
              {passengerCount > 1 && index === passengerCount - 1 && (
                <ActionButton
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={pending}
                  onClick={onRemoveLastPassenger}
                >
                  حذف
                </ActionButton>
              )}
            </div>
            <FormGrid>
              <FormField>
                <SearchableSelect
                  name={`passenger.${index}.personId`}
                  label="مسافر"
                  options={personOptions}
                  defaultValue={value(`passenger.${index}.personId`)}
                  placeholder="انتخاب مسافر"
                  searchPlaceholder="جستجوی نام، شماره پرسنلی یا موبایل…"
                  disabled={pending}
                  required
                  invalid={fieldInvalid(`passenger.${index}.personId`)}
                />
              </FormField>
              {!shareOrigin && (
                <FormField>
                  <LocationPicker
                    name={`passenger.${index}.originLocationId`}
                    label="مبدأ"
                    locations={locations}
                    defaultValue={value(
                      `passenger.${index}.originLocationId`,
                    )}
                    disabled={pending}
                    required
                    invalid={fieldInvalid(
                      `passenger.${index}.originLocationId`,
                    )}
                  />
                </FormField>
              )}
              {!shareDestination && (
                <FormField>
                  <LocationPicker
                    name={`passenger.${index}.destinationLocationId`}
                    label="مقصد"
                    locations={locations}
                    defaultValue={value(
                      `passenger.${index}.destinationLocationId`,
                    )}
                    disabled={pending}
                    required
                    invalid={fieldInvalid(
                      `passenger.${index}.destinationLocationId`,
                    )}
                  />
                </FormField>
              )}
              {passengerCount > 1 && (
                <>
                  <FormField>
                    <FieldLabel htmlFor={`${prefix}-pickup-order-${index}`}>
                      ترتیب سوارشدن (اختیاری)
                    </FieldLabel>
                    <input
                      id={`${prefix}-pickup-order-${index}`}
                      name={`passenger.${index}.pickupOrder`}
                      className={formControlClassName}
                      inputMode="numeric"
                      dir="ltr"
                      defaultValue={value(`passenger.${index}.pickupOrder`)}
                      disabled={pending}
                    />
                  </FormField>
                  <FormField>
                    <FieldLabel htmlFor={`${prefix}-dropoff-order-${index}`}>
                      ترتیب پیاده‌شدن (اختیاری)
                    </FieldLabel>
                    <input
                      id={`${prefix}-dropoff-order-${index}`}
                      name={`passenger.${index}.dropoffOrder`}
                      className={formControlClassName}
                      inputMode="numeric"
                      dir="ltr"
                      defaultValue={value(`passenger.${index}.dropoffOrder`)}
                      disabled={pending}
                    />
                  </FormField>
                </>
              )}
            </FormGrid>
            <div className={styles.dateRow}>
              <JalaliDatePicker
                name={`passenger.${index}.pickupDay`}
                label="تاریخ درخواست‌شدهٔ سوارشدن (اختیاری)"
                defaultValue={value(`passenger.${index}.pickupDay`)}
                disabled={pending}
              />
              <TimeSelect
                id={`${prefix}-pickup-time-${index}`}
                name={`passenger.${index}.pickupTime`}
                label="ساعت سوارشدن (تهران، اختیاری)"
                defaultValue={value(`passenger.${index}.pickupTime`)}
                disabled={pending}
              />
            </div>
            <FormField>
              <FieldLabel htmlFor={`${prefix}-trip-description-${index}`}>
                توضیحات این مسافر (اختیاری)
              </FieldLabel>
              <textarea
                id={`${prefix}-trip-description-${index}`}
                name={`passenger.${index}.description`}
                className={formControlClassName}
                rows={2}
                defaultValue={value(`passenger.${index}.description`)}
                disabled={pending}
              />
            </FormField>
          </article>
        ))}
      </div>

      <FormActions separated>
        <ActionButton type="button" disabled={pending} onClick={onReview}>
          مرور و ثبت
        </ActionButton>
        <ActionButton
          type="button"
          variant="secondary"
          disabled={pending}
          onClick={onBack}
        >
          قبلی
        </ActionButton>
      </FormActions>
    </section>
  );
}
