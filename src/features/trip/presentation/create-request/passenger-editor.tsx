import { JalaliDatePicker } from "../../../../components/ui/date-picker/jalali-date-picker";
import {
  FieldLabel,
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
import styles from "./create-trip.module.css";

export function PassengerEditor({
  index,
  prefix,
  pending,
  people,
  locations,
  passengerCount,
  shareOrigin,
  shareDestination,
  value,
  fieldInvalid,
}: {
  index: number;
  prefix: string;
  pending: boolean;
  people: TripPersonReference[];
  locations: TripLocationReference[];
  passengerCount: number;
  shareOrigin: boolean;
  shareDestination: boolean;
  value: (name: string) => string;
  fieldInvalid: (name: string) => boolean;
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
    <article
      className={styles.passengerEditor}
      aria-labelledby={`${prefix}-passenger-${index}-title`}
    >
      <FormGrid>
        <FormField>
          <SearchableSelect
            name={`passenger.${index}.personId`}
            label="مسافر"
            options={personOptions}
            defaultValue={value(`passenger.${index}.personId`)}
            placeholder="انتخاب کنید"
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
              defaultValue={value(`passenger.${index}.originLocationId`)}
              disabled={pending}
              required
              invalid={fieldInvalid(`passenger.${index}.originLocationId`)}
            />
          </FormField>
        )}
        {!shareDestination && (
          <FormField>
            <LocationPicker
              name={`passenger.${index}.destinationLocationId`}
              label="مقصد"
              locations={locations}
              defaultValue={value(`passenger.${index}.destinationLocationId`)}
              disabled={pending}
              required
              invalid={fieldInvalid(
                `passenger.${index}.destinationLocationId`,
              )}
            />
          </FormField>
        )}
      </FormGrid>

      {shareOrigin && shareDestination && (
        <p className={styles.passengerInfo}>
          مبدأ و مقصد از اطلاعات درخواست استفاده می‌شود.
        </p>
      )}

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
          label="ساعت سوارشدن (اختیاری)"
          defaultValue={value(`passenger.${index}.pickupTime`)}
          disabled={pending}
        />
      </div>

      {passengerCount > 1 && (
        <FormGrid>
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
        </FormGrid>
      )}

      <FormField>
        <FieldLabel htmlFor={`${prefix}-trip-description-${index}`}>
          توضیحات این مسافر (اختیاری)
        </FieldLabel>
        <textarea
          id={`${prefix}-trip-description-${index}`}
          name={`passenger.${index}.description`}
          className={formControlClassName}
          rows={3}
          defaultValue={value(`passenger.${index}.description`)}
          disabled={pending}
        />
      </FormField>
    </article>
  );
}
