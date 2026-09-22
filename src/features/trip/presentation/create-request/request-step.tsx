import { ActionButton } from "../../../../components/ui/action-button/action-button";
import { InlineNotice } from "../../../../components/ui/inline-notice/inline-notice";
import { JalaliDatePicker } from "../../../../components/ui/date-picker/jalali-date-picker";
import {
  FieldErrors,
  FieldLabel,
  FormField,
  formControlClassName,
} from "../../../../components/ui/form-field/form-field";
import { FormGrid } from "../../../../components/ui/form-grid/form-grid";
import { SearchableCombobox } from "../../../../components/ui/searchable-combobox/searchable-combobox";
import { TimeSelect } from "../../../../components/ui/time-select/time-select";
import type {
  TripLocationReference,
  TripRequestTypeReference,
} from "../../application/trip-records";
import { tripMessages, type TripActionState } from "../trip-form-data";
import { LocationPicker } from "../location/location-picker";
import styles from "./create-trip.module.css";
import {
  CREATE_REQUEST_PURPOSE_SUGGESTIONS,
  typeExplanation,
} from "./create-wizard";

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
  locked = false,
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
  locked?: boolean;
}) {
  const isDisabled = pending || locked;

  return (
    <section
      className={styles.createSurface}
      hidden={hidden}
      aria-labelledby={`${prefix}-request`}
    >
      {locked && (
        <InlineNotice tone="info" role="status">
          اطلاعات اولیه درخواست ذخیره شده است. برای تغییر مسافران یا نوع درخواست،
          این پیش‌نویس را لغو کرده و درخواست جدیدی ثبت کنید.
        </InlineNotice>
      )}

      <div className={styles.requestBasics}>
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
              disabled={isDisabled}
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
          <FormField>
            <SearchableCombobox
              id={`${prefix}-purpose`}
              name="purpose"
              label="هدف سفر"
              suggestions={CREATE_REQUEST_PURPOSE_SUGGESTIONS}
              defaultValue={value("purpose")}
              disabled={isDisabled}
              invalid={fieldInvalid("purpose")}
              describedBy={fieldErrorId("purpose")}
            />
            {fieldInvalid("purpose") && state.error && (
              <FieldErrors
                id={`${prefix}-purpose-error`}
                messages={[tripMessages[state.error]]}
              />
            )}
          </FormField>
        </FormGrid>
        <input
          type="hidden"
          name="requestTypeCode"
          value={selectedType?.typeCode ?? ""}
          readOnly
        />
        {selectedType && (
          <p className={styles.hint}>
            {typeExplanation(selectedType.typeCode)}
          </p>
        )}
      </div>

      <fieldset className={styles.requestDateTimeFieldset}>
        <div className={styles.requestDateTimeGroup}>
          <JalaliDatePicker
            name="requestedTravelDay"
            label="تاریخ (شمسی)"
            defaultValue={value("requestedTravelDay")}
            disabled={isDisabled}
          />
          <TimeSelect
            id={`${prefix}-travel-time`}
            name="requestedTravelTime"
            label="ساعت"
            defaultValue={value("requestedTravelTime")}
            disabled={isDisabled}
          />
        </div>
      </fieldset>

      {(shareOrigin || shareDestination) && (
        <FormGrid columns={12}>
          {shareOrigin && (
            <FormField className={styles.requestLocationField}>
              <LocationPicker
                name="commonOriginLocationId"
                label="مبدأ"
                locations={locations}
                defaultValue={value("commonOriginLocationId")}
                disabled={isDisabled}
                required
                invalid={fieldInvalid("commonOriginLocationId")}
                describedBy={fieldErrorId("commonOriginLocationId")}
              />
            </FormField>
          )}
          {shareDestination && (
            <FormField className={styles.requestLocationField}>
              <LocationPicker
                name="commonDestinationLocationId"
                label="مقصد"
                locations={locations}
                defaultValue={value("commonDestinationLocationId")}
                disabled={isDisabled}
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
          توضیحات
        </FieldLabel>
        <textarea
          id={`${prefix}-request-description`}
          name="requestDescription"
          className={formControlClassName}
          rows={3}
          defaultValue={value("requestDescription")}
          disabled={isDisabled}
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
            {locked ? "لغو پیش‌نویس سفر" : "انصراف"}
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
