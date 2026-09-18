import { ActionButton } from "../../../../components/ui/action-button/action-button";
import { JalaliDatePicker } from "../../../../components/ui/date-picker/jalali-date-picker";
import {
  FieldErrors,
  FieldLabel,
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
import styles from "./create-trip.module.css";
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
  onCancel,
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
  onCancel?: () => void;
}) {
  return (
    <section
      className={styles.createSurface}
      hidden={hidden}
      aria-labelledby={`${prefix}-request`}
    >
      <div className={styles.createSurfaceHeading}>
        <div>
          <h2 id={`${prefix}-request`}>اطلاعات اصلی</h2>
          <p>شمارهٔ درخواست خودکار و وضعیت اولیه «جدید» است.</p>
        </div>
      </div>

      <FormGrid>
        <FormField>
          <FieldLabel htmlFor={`${prefix}-request-type`} required>
            نوع درخواست سفر
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
            <option value="">لطفاً انتخاب کنید</option>
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
          <FieldLabel htmlFor={`${prefix}-purpose`}>هدف سفر (اختیاری)</FieldLabel>
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
            label="تاریخ درخواست (شمسی)"
            defaultValue={value("requestDay")}
            disabled={pending}
          />
          <TimeSelect
            id={`${prefix}-request-time`}
            name="requestTime"
            label="ساعت درخواست"
            defaultValue={value("requestTime")}
            disabled={pending}
          />
        </div>
        <div className={styles.dateRow}>
          <JalaliDatePicker
            name="requestedTravelDay"
            label="تاریخ پیشنهادی سفر (شمسی)"
            defaultValue={value("requestedTravelDay")}
            disabled={pending}
          />
          <TimeSelect
            id={`${prefix}-travel-time`}
            name="requestedTravelTime"
            label="ساعت پیشنهادی سفر"
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
                label="مبدأ"
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
                label="مقصد"
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
          توضیحات (اختیاری)
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

      <div className={styles.createActions}>
        {onCancel ? (
          <ActionButton
            type="button"
            variant="secondary"
            disabled={pending}
            onClick={onCancel}
          >
            انصراف
          </ActionButton>
        ) : (
          <span />
        )}
        <div className={styles.createActionsEnd}>
          <ActionButton type="button" disabled={pending} onClick={onNext}>
            بعدی
          </ActionButton>
        </div>
      </div>
    </section>
  );
}
