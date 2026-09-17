"use client";

import { useActionState, useId, useState } from "react";

import { ActionButton } from "@/components/ui/action-button/action-button";
import { JalaliDatePicker } from "@/components/ui/date-picker/jalali-date-picker";
import {
  FieldLabel,
  FormActions,
  FormField,
  formControlClassName,
} from "@/components/ui/form-field/form-field";
import { FormGrid } from "@/components/ui/form-grid/form-grid";
import { InlineNotice } from "@/components/ui/inline-notice/inline-notice";
import { SearchableSelect } from "@/components/ui/searchable-select/searchable-select";
import { TimeSelect } from "@/components/ui/time-select/time-select";
import type {
  TripAssignmentReference,
  TripExecutionRecord,
  TripLocationReference,
  TripPassengerRecord,
} from "../application/trip-records";
import {
  addTripRouteAction,
  changeTripRequestStatusAction,
  savePassengerSurveyAction,
  saveTripExecutionAction,
} from "./trip.actions";
import { tripMessages } from "./trip-form-data";
import {
  executionStatusLabel,
  executionStatusTargets,
  requestStatusLabel,
  requestStatusTargets,
} from "./trip-status";
import styles from "./trip-forms.module.css";

function tehranInputs(date: Date | null) {
  if (!date) return { day: "", time: "" };
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Tehran",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(date)
      .map((part) => [part.type, part.value]),
  );
  return {
    day: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${parts.hour}:${parts.minute}`,
  };
}

function assignmentLabel(assignment: TripAssignmentReference) {
  return `${assignment.driverFirstName} ${assignment.driverLastName} — ${assignment.vehicle.brandName} ${assignment.vehicle.modelName} — ${assignment.vehicle.vehicleCode}`;
}

export function TripRequestStatusForm({
  tripRequestId,
  status,
  hasStartedExecution,
}: {
  tripRequestId: number;
  status: string;
  hasStartedExecution: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    changeTripRequestStatusAction.bind(null, tripRequestId),
    {},
  );
  const prefix = useId();
  const targets = requestStatusTargets(status).filter(
    (target) => !(target === "Cancelled" && hasStartedExecution),
  );
  if (targets.length === 0) return null;

  return (
    <form
      action={formAction}
      noValidate
      aria-label="تغییر وضعیت درخواست سفر"
      className={styles.detailForm}
    >
      <h3>مرحلهٔ بعدی درخواست</h3>
      {state.error && (
        <InlineNotice tone="danger" role="alert">
          {tripMessages[state.error]}
        </InlineNotice>
      )}
      <FormGrid>
        <FormField>
          <FieldLabel htmlFor={`${prefix}-request-status`} required>
            وضعیت جدید
          </FieldLabel>
          <select
            id={`${prefix}-request-status`}
            name="requestStatus"
            className={formControlClassName}
            defaultValue=""
            disabled={pending}
          >
            <option value="">انتخاب مرحله</option>
            {targets.map((target) => (
              <option value={target} key={target}>
                {requestStatusLabel(target)}
              </option>
            ))}
          </select>
        </FormField>
      </FormGrid>
      <FormActions>
        <ActionButton type="submit" pending={pending} disabled={pending}>
          {pending ? "در حال ثبت…" : "ثبت تغییر وضعیت"}
        </ActionButton>
      </FormActions>
    </form>
  );
}

export function TripRouteForm({
  tripRequestId,
  passengers,
  locations,
}: {
  tripRequestId: number;
  passengers: TripPassengerRecord[];
  locations: TripLocationReference[];
}) {
  const [state, formAction, pending] = useActionState(
    addTripRouteAction.bind(null, tripRequestId),
    {},
  );
  const prefix = useId();
  const [pointCount, setPointCount] = useState(
    Math.max(1, Number(state.values?.pointCount ?? 1) || 1),
  );
  const value = (name: string) => state.values?.[name] ?? "";
  const tripOptions = passengers.map((trip) => ({
    value: String(trip.tripId),
    label: `${trip.passenger.firstName} ${trip.passenger.lastName} ${trip.origin.locationName} ${trip.destination.locationName}`,
    searchText: `${trip.passenger.firstName} ${trip.passenger.lastName} ${trip.origin.locationName} ${trip.destination.locationName}`,
    content: (
      <span>
        {trip.passenger.firstName} {trip.passenger.lastName} —{" "}
        {trip.origin.locationName} ← {trip.destination.locationName}
      </span>
    ),
  }));
  const locationOptions = locations.map((location) => ({
    value: String(location.locationId),
    label: `${location.locationName} ${location.locationCode ?? ""}`,
    searchText: `${location.locationName} ${location.locationCode ?? ""} ${location.address ?? ""}`,
    content: location.locationName,
  }));

  return (
    <form
      action={formAction}
      noValidate
      aria-label="ثبت مسیر برنامه‌ریزی‌شده"
      aria-busy={pending}
      className={styles.detailForm}
    >
      <h3>افزودن مسیر برنامه‌ریزی‌شده</h3>
      {state.error && (
        <InlineNotice tone="danger" role="alert">
          {tripMessages[state.error]}
        </InlineNotice>
      )}
      <FormGrid>
        <FormField>
          <SearchableSelect
            name="tripId"
            label="سفر مسافر"
            options={tripOptions}
            defaultValue={value("tripId")}
            placeholder="انتخاب سفر مسافر"
            searchPlaceholder="جستجوی مسافر، مبدأ یا مقصد…"
            required
            disabled={pending}
          />
        </FormField>
        <FormField>
          <FieldLabel htmlFor={`${prefix}-route-name`} required>
            نام مسیر
          </FieldLabel>
          <input
            id={`${prefix}-route-name`}
            name="routeName"
            className={formControlClassName}
            defaultValue={value("routeName")}
            disabled={pending}
          />
        </FormField>
        <FormField>
          <FieldLabel htmlFor={`${prefix}-alternative`}>
            شمارهٔ مسیر جایگزین
          </FieldLabel>
          <input
            id={`${prefix}-alternative`}
            name="alternativeNo"
            className={formControlClassName}
            inputMode="numeric"
            dir="ltr"
            defaultValue={value("alternativeNo")}
            disabled={pending}
          />
        </FormField>
        <FormField>
          <FieldLabel htmlFor={`${prefix}-distance`}>
            مسافت (کیلومتر)
          </FieldLabel>
          <input
            id={`${prefix}-distance`}
            name="distanceKm"
            className={formControlClassName}
            inputMode="decimal"
            dir="ltr"
            defaultValue={value("distanceKm")}
            disabled={pending}
          />
        </FormField>
        <FormField>
          <FieldLabel htmlFor={`${prefix}-duration`}>
            مدت تخمینی (دقیقه)
          </FieldLabel>
          <input
            id={`${prefix}-duration`}
            name="estimatedDurationMinute"
            className={formControlClassName}
            inputMode="numeric"
            dir="ltr"
            defaultValue={value("estimatedDurationMinute")}
            disabled={pending}
          />
        </FormField>
        <FormField>
          <FieldLabel htmlFor={`${prefix}-selected`}>
            وضعیت انتخاب
          </FieldLabel>
          <select
            id={`${prefix}-selected`}
            name="isSelected"
            className={formControlClassName}
            defaultValue={value("isSelected") || "false"}
            disabled={pending}
          >
            <option value="false">مسیر جایگزین</option>
            <option value="true">مسیر انتخاب‌شده</option>
          </select>
        </FormField>
      </FormGrid>
      <FormField>
        <FieldLabel htmlFor={`${prefix}-route-description`}>
          توضیحات مسیر
        </FieldLabel>
        <textarea
          id={`${prefix}-route-description`}
          name="routeDescription"
          className={formControlClassName}
          rows={2}
          defaultValue={value("routeDescription")}
          disabled={pending}
        />
      </FormField>

      <div className={styles.passengerHeader}>
        <h3>نقاط مسیر</h3>
        <ActionButton
          type="button"
          variant="secondary"
          size="sm"
          disabled={pending || pointCount >= 50}
          onClick={() => setPointCount((count) => count + 1)}
        >
          افزودن نقطه
        </ActionButton>
      </div>
      <input type="hidden" name="pointCount" value={pointCount} readOnly />
      <div className={styles.pointList}>
        {Array.from({ length: pointCount }, (_, index) => (
          <div className={styles.point} key={index}>
            <div className={styles.passengerHeader}>
              <strong>نقطه {index + 1}</strong>
              {pointCount > 1 && index === pointCount - 1 && (
                <ActionButton
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={pending}
                  onClick={() =>
                    setPointCount((count) => Math.max(1, count - 1))
                  }
                >
                  حذف
                </ActionButton>
              )}
            </div>
            <FormGrid>
              <FormField>
                <SearchableSelect
                  name={`point.${index}.locationId`}
                  label="مکان"
                  options={locationOptions}
                  defaultValue={value(`point.${index}.locationId`)}
                  placeholder="انتخاب مکان"
                  searchPlaceholder="جستجوی مکان…"
                  required
                  disabled={pending}
                />
              </FormField>
              <FormField>
                <FieldLabel htmlFor={`${prefix}-sequence-${index}`}>
                  ترتیب
                </FieldLabel>
                <input
                  id={`${prefix}-sequence-${index}`}
                  name={`point.${index}.sequenceNo`}
                  className={formControlClassName}
                  inputMode="numeric"
                  dir="ltr"
                  defaultValue={
                    value(`point.${index}.sequenceNo`) || String(index + 1)
                  }
                  disabled={pending}
                />
              </FormField>
              <FormField>
                <FieldLabel htmlFor={`${prefix}-point-distance-${index}`}>
                  فاصله از شروع (کیلومتر)
                </FieldLabel>
                <input
                  id={`${prefix}-point-distance-${index}`}
                  name={`point.${index}.distanceFromStartKm`}
                  className={formControlClassName}
                  inputMode="decimal"
                  dir="ltr"
                  defaultValue={value(
                    `point.${index}.distanceFromStartKm`,
                  )}
                  disabled={pending}
                />
              </FormField>
              <FormField>
                <FieldLabel htmlFor={`${prefix}-traffic-${index}`}>
                  محدودهٔ ترافیکی
                </FieldLabel>
                <input
                  id={`${prefix}-traffic-${index}`}
                  name={`point.${index}.trafficZone`}
                  className={formControlClassName}
                  defaultValue={value(`point.${index}.trafficZone`)}
                  disabled={pending}
                />
              </FormField>
            </FormGrid>
            <FormField>
              <FieldLabel htmlFor={`${prefix}-point-description-${index}`}>
                توضیحات نقطه
              </FieldLabel>
              <input
                id={`${prefix}-point-description-${index}`}
                name={`point.${index}.description`}
                className={formControlClassName}
                defaultValue={value(`point.${index}.description`)}
                disabled={pending}
              />
            </FormField>
          </div>
        ))}
      </div>
      <FormActions separated>
        <ActionButton type="submit" disabled={pending} pending={pending}>
          {pending ? "در حال ثبت…" : "ثبت مسیر"}
        </ActionButton>
      </FormActions>
    </form>
  );
}

export function TripExecutionForm({
  tripRequestId,
  trip,
  assignments,
  execution = null,
}: {
  tripRequestId: number;
  trip: TripPassengerRecord;
  assignments: TripAssignmentReference[];
  execution?: TripExecutionRecord | null;
}) {
  const action = saveTripExecutionAction.bind(
    null,
    tripRequestId,
    trip.tripId,
    execution?.tripExecutionId ?? null,
  );
  const [state, formAction, pending] = useActionState(action, {});
  const prefix = useId();
  const pickup = tehranInputs(execution?.actualPickupDateTime ?? null);
  const dropoff = tehranInputs(execution?.actualDropoffDateTime ?? null);
  const value = (name: string, fallback = "") =>
    state.values?.[name] ?? fallback;
  const options = assignments.map((assignment) => ({
    value: String(assignment.assignmentId),
    label: assignmentLabel(assignment),
    searchText: `${assignmentLabel(assignment)} ${assignment.driverPersonnelNo ?? ""}`,
    disabled: !assignment.hasEligibleLicense,
    content: (
      <span>
        {assignmentLabel(assignment)}
        {!assignment.hasEligibleLicense && " — گواهینامه معتبر ندارد"}
      </span>
    ),
  }));
  const statusOptions = execution
    ? [
        execution.status,
        ...executionStatusTargets(execution.status).filter(
          (target) =>
            !(
              target === "Cancelled" &&
              execution.actualPickupDateTime !== null
            ),
        ),
      ]
    : ["Planned"];

  return (
    <form
      action={formAction}
      noValidate
      aria-label={
        execution ? "اصلاح اجرای سفر" : "ثبت برنامهٔ اجرا"
      }
      aria-busy={pending}
      className={styles.detailForm}
    >
      <h3>
        {trip.passenger.firstName} {trip.passenger.lastName}
      </h3>
      {state.error && (
        <InlineNotice tone="danger" role="alert">
          {tripMessages[state.error]}
        </InlineNotice>
      )}
      <FormField>
        <SearchableSelect
          name="assignmentId"
          label="تخصیص خودرو و راننده در زمان سفر"
          options={options}
          defaultValue={value(
            "assignmentId",
            execution ? String(execution.assignment.assignmentId) : "",
          )}
          placeholder="انتخاب تخصیص"
          searchPlaceholder="جستجوی راننده، خودرو یا شمارهٔ پرسنلی…"
          required
          disabled={pending}
        />
      </FormField>
      {execution ? (
        <>
          <div className={styles.dateRows}>
            <div className={styles.dateRow}>
              <JalaliDatePicker
                name="actualPickupDay"
                label="تاریخ واقعی حرکت/سوارشدن (شمسی)"
                defaultValue={value("actualPickupDay", pickup.day)}
                disabled={pending}
              />
              <TimeSelect
                id={`${prefix}-actual-pickup-time`}
                name="actualPickupTime"
                label="ساعت واقعی حرکت (تهران)"
                defaultValue={value("actualPickupTime", pickup.time)}
                disabled={pending}
              />
            </div>
            <div className={styles.dateRow}>
              <JalaliDatePicker
                name="actualDropoffDay"
                label="تاریخ واقعی بازگشت/پیاده‌شدن (شمسی)"
                defaultValue={value("actualDropoffDay", dropoff.day)}
                disabled={pending}
              />
              <TimeSelect
                id={`${prefix}-actual-dropoff-time`}
                name="actualDropoffTime"
                label="ساعت واقعی بازگشت (تهران)"
                defaultValue={value("actualDropoffTime", dropoff.time)}
                disabled={pending}
              />
            </div>
          </div>
          <FormGrid>
            <FormField>
              <FieldLabel htmlFor={`${prefix}-start-odometer`}>
                کیلومتر شروع
              </FieldLabel>
              <input
                id={`${prefix}-start-odometer`}
                name="startOdometer"
                className={formControlClassName}
                inputMode="decimal"
                dir="ltr"
                defaultValue={value(
                  "startOdometer",
                  execution.startOdometer ?? "",
                )}
                disabled={pending}
              />
            </FormField>
            <FormField>
              <FieldLabel htmlFor={`${prefix}-end-odometer`}>
                کیلومتر پایان
              </FieldLabel>
              <input
                id={`${prefix}-end-odometer`}
                name="endOdometer"
                className={formControlClassName}
                inputMode="decimal"
                dir="ltr"
                defaultValue={value(
                  "endOdometer",
                  execution.endOdometer ?? "",
                )}
                disabled={pending}
              />
            </FormField>
            <FormField>
              <FieldLabel htmlFor={`${prefix}-execution-status`} required>
                وضعیت اجرا
              </FieldLabel>
              <select
                id={`${prefix}-execution-status`}
                name="executionStatus"
                className={formControlClassName}
                defaultValue={value("executionStatus", execution.status)}
                disabled={pending}
              >
                {statusOptions.map((status) => (
                  <option value={status} key={status}>
                    {executionStatusLabel(status)}
                  </option>
                ))}
              </select>
            </FormField>
          </FormGrid>
          <FormField>
            <FieldLabel htmlFor={`${prefix}-execution-description`}>
              توضیحات عملیاتی قبض برگشتی
            </FieldLabel>
            <textarea
              id={`${prefix}-execution-description`}
              name="executionDescription"
              className={formControlClassName}
              rows={3}
              defaultValue={value(
                "executionDescription",
                execution.description ?? "",
              )}
              disabled={pending}
            />
          </FormField>
        </>
      ) : (
        <FormField>
          <input type="hidden" name="executionStatus" value="Planned" />
          <p className={styles.hint}>
            رکورد اجرا ابتدا با وضعیت «برنامه‌ریزی‌شده» ساخته می‌شود. اطلاعات
            واقعی پس از شروع و بازگشت قبض ثبت خواهد شد.
          </p>
        </FormField>
      )}
      <p className={styles.hint}>
        {execution
          ? "اطلاعات کاغذ برگشتی را کارکنان در این فرم ثبت می‌کنند؛ راننده به سامانه دسترسی عملیاتی نیاز ندارد."
          : "این برنامه‌ریزی به تخصیص موجود راننده و خودرو ارجاع می‌دهد و سابقهٔ تخصیص را تغییر نمی‌دهد."}
      </p>
      <FormActions separated>
        <ActionButton
          type="submit"
          disabled={pending || options.length === 0}
          pending={pending}
        >
          {pending
            ? "در حال ثبت…"
            : execution
              ? "ذخیره اصلاحات اجرا"
              : "ثبت برنامهٔ اجرا"}
        </ActionButton>
      </FormActions>
    </form>
  );
}

export function PassengerSurveyForm({
  tripRequestId,
  execution,
}: {
  tripRequestId: number;
  execution: TripExecutionRecord;
}) {
  const [state, formAction, pending] = useActionState(
    savePassengerSurveyAction.bind(
      null,
      tripRequestId,
      execution.tripExecutionId,
    ),
    {},
  );
  const prefix = useId();
  const survey = tehranInputs(execution.surveyDateTime);
  const value = (name: string, fallback = "") =>
    state.values?.[name] ?? fallback;

  return (
    <form
      action={formAction}
      noValidate
      aria-label={`ثبت نظرسنجی اجرای ${execution.tripExecutionId}`}
      aria-busy={pending}
      className={styles.detailForm}
    >
      {state.error && (
        <InlineNotice tone="danger" role="alert">
          {tripMessages[state.error]}
        </InlineNotice>
      )}
      <FormGrid>
        <FormField>
          <FieldLabel htmlFor={`${prefix}-rating`}>امتیاز مسافر</FieldLabel>
          <input
            id={`${prefix}-rating`}
            name="passengerRating"
            className={formControlClassName}
            inputMode="numeric"
            dir="ltr"
            defaultValue={value(
              "passengerRating",
              execution.passengerRating?.toString() ?? "",
            )}
            disabled={pending}
          />
        </FormField>
      </FormGrid>
      <div className={styles.dateRow}>
        <JalaliDatePicker
          name="surveyDay"
          label="تاریخ نظرسنجی (شمسی)"
          defaultValue={value("surveyDay", survey.day)}
          disabled={pending}
        />
        <TimeSelect
          id={`${prefix}-survey-time`}
          name="surveyTime"
          label="ساعت نظرسنجی (تهران)"
          defaultValue={value("surveyTime", survey.time)}
          disabled={pending}
        />
      </div>
      <FormField>
        <FieldLabel htmlFor={`${prefix}-comment`}>نظر مسافر</FieldLabel>
        <textarea
          id={`${prefix}-comment`}
          name="passengerComment"
          className={formControlClassName}
          rows={3}
          defaultValue={value(
            "passengerComment",
            execution.passengerComment ?? "",
          )}
          disabled={pending}
        />
      </FormField>
      <FormActions separated>
        <ActionButton type="submit" disabled={pending} pending={pending}>
          {pending ? "در حال ثبت…" : "ذخیره نظرسنجی"}
        </ActionButton>
      </FormActions>
    </form>
  );
}
