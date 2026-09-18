import { ActionButton } from "../../../../components/ui/action-button/action-button";
import { JalaliDatePicker } from "../../../../components/ui/date-picker/jalali-date-picker";
import {
  FieldErrors,
  FieldLabel,
  FormActions,
  FormField,
  formControlClassName,
} from "../../../../components/ui/form-field/form-field";
import { FormGrid } from "../../../../components/ui/form-grid/form-grid";
import { TimeSelect } from "../../../../components/ui/time-select/time-select";
import type {
  TripLocationReference,
  TripRequestTypeReference,
} from "../../application/trip-records";
import { tripMessages, type TripActionState } from "../trip-form-data";
import { LocationPicker } from "../location/location-picker";
import styles from "../trip-forms.module.css";
import { typeExplanation } from "./create-wizard";

export function RequestStep({
  hidden,
  prefix,
  pending,
  requestTypes,
  locations,
  selectedTypeId,
  typeRestoreNonce,
  selectedType,
  shareOrigin,
  shareDestination,
  state,
  value,
  fieldInvalid,
  fieldErrorId,
  onTypeChange,
  onNext,
}: {
  hidden: boolean;
  prefix: string;
  pending: boolean;
  requestTypes: TripRequestTypeReference[];
  locations: TripLocationReference[];
  selectedTypeId: string;
  typeRestoreNonce: number;
  selectedType: TripRequestTypeReference | undefined;
  shareOrigin: boolean;
  shareDestination: boolean;
  state: TripActionState;
  value: (name: string) => string;
  fieldInvalid: (name: string) => boolean;
  fieldErrorId: (name: string) => string | undefined;
  onTypeChange: (typeId: string) => void;
  onNext: () => void;
}) {
  return (
    <section
      className={styles.section}
      hidden={hidden}
      aria-labelledby={`${prefix}-request`}
    >
      <div className={styles.sectionHeading}>
        <div>
          <h2 id={`${prefix}-request`}>اطلاعات درخواست</h2>
        </div>
        <p>شمارهٔ درخواست خودکار و وضعیت اولیه «جدید» است.</p>
      </div>

      <FormGrid>
        <FormField>
          <FieldLabel htmlFor={`${prefix}-request-type`} required>
            نوع درخواست
          </FieldLabel>
          <select
            key={typeRestoreNonce}
            id={`${prefix}-request-type`}
            name="tripRequestTypeId"
            className={formControlClassName}
            defaultValue={selectedTypeId}
            disabled={pending}
            required
            aria-invalid={fieldInvalid("tripRequestTypeId")}
            aria-describedby={fieldErrorId("tripRequestTypeId")}
            onChange={(event) => onTypeChange(event.target.value)}
          >
            <option value="">انتخاب نوع درخواست</option>
            {requestTypes.map((type) => (
              <option
                key={type.tripRequestTypeId}
                value={type.tripRequestTypeId}
              >
                {type.typeName}
              </option>
            ))}
          </select>
          {fieldInvalid("tripRequestTypeId") && state.error && (
            <FieldErrors
              id={`${prefix}-tripRequestTypeId-error`}
              messages={[tripMessages[state.error]]}
            />
          )}
        </FormField>
        <input
          type="hidden"
          name="requestTypeCode"
          value={selectedType?.typeCode ?? ""}
          readOnly
        />
        <FormField>
          <FieldLabel htmlFor={`${prefix}-purpose`}>
            هدف سفر (اختیاری)
          </FieldLabel>
          <input
            id={`${prefix}-purpose`}
            name="purpose"
            className={formControlClassName}
            defaultValue={value("purpose")}
            disabled={pending}
            aria-invalid={fieldInvalid("purpose")}
            aria-describedby={fieldErrorId("purpose")}
          />
          {fieldInvalid("purpose") && state.error && (
            <FieldErrors
              id={`${prefix}-purpose-error`}
              messages={[tripMessages[state.error]]}
            />
          )}
        </FormField>
      </FormGrid>
      {selectedType && (
        <p className={styles.hint}>{typeExplanation(selectedType.typeCode)}</p>
      )}

      <div className={styles.dateRows}>
        <div className={styles.dateRow}>
          <JalaliDatePicker
            name="requestDay"
            label="تاریخ ثبت درخواست (شمسی)"
            defaultValue={value("requestDay")}
            disabled={pending}
          />
          <TimeSelect
            id={`${prefix}-request-time`}
            name="requestTime"
            label="ساعت ثبت"
            defaultValue={value("requestTime")}
            disabled={pending}
          />
        </div>
        <div className={styles.dateRow}>
          <JalaliDatePicker
            name="requestedTravelDay"
            label="تاریخ برنامه‌ریزی‌شده (شمسی)"
            defaultValue={value("requestedTravelDay")}
            disabled={pending}
          />
          <TimeSelect
            id={`${prefix}-travel-time`}
            name="requestedTravelTime"
            label="ساعت برنامه‌ریزی‌شده"
            defaultValue={value("requestedTravelTime")}
            disabled={pending}
          />
        </div>
      </div>

      {(shareOrigin || shareDestination) && (
        <FormGrid>
          {shareOrigin && (
            <FormField>
              <LocationPicker
                name="commonOriginLocationId"
                label="مبدأ مشترک"
                locations={locations}
                defaultValue={value("commonOriginLocationId")}
                disabled={pending}
                required
                invalid={fieldInvalid("commonOriginLocationId")}
                describedBy={fieldErrorId("commonOriginLocationId")}
              />
            </FormField>
          )}
          {shareDestination && (
            <FormField>
              <LocationPicker
                name="commonDestinationLocationId"
                label="مقصد مشترک"
                locations={locations}
                defaultValue={value("commonDestinationLocationId")}
                disabled={pending}
                required
                invalid={fieldInvalid("commonDestinationLocationId")}
                describedBy={fieldErrorId("commonDestinationLocationId")}
              />
            </FormField>
          )}
        </FormGrid>
      )}

      <FormField>
        <FieldLabel htmlFor={`${prefix}-request-description`}>
          توضیحات درخواست (اختیاری)
        </FieldLabel>
        <textarea
          id={`${prefix}-request-description`}
          name="requestDescription"
          className={formControlClassName}
          rows={3}
          defaultValue={value("requestDescription")}
          disabled={pending}
        />
      </FormField>

      <FormActions separated>
        <ActionButton type="button" disabled={pending} onClick={onNext}>
          بعدی
        </ActionButton>
      </FormActions>
    </section>
  );
}
