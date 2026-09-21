import { ActionButton } from "../../../../components/ui/action-button/action-button";
import { InlineNotice } from "../../../../components/ui/inline-notice/inline-notice";
import type {
  TripLocationReference,
  TripPersonReference,
} from "../../application/trip-records";
import { TripPassengerSwitcher } from "../trip-passenger-switcher";
import styles from "./create-trip.module.css";
import { PassengerEditor } from "./passenger-editor";

export function PassengersStep({
  hidden,
  prefix,
  pending,
  people,
  locations,
  passengerCount,
  activePassengerIndex,
  passengerSnapshots,
  shareOrigin,
  shareDestination,
  value,
  fieldInvalid,
  onSelectPassenger,
  onAddPassenger,
  onRemoveLastPassenger,
  onBack,
  onReview,
  locked = false,
}: {
  hidden: boolean;
  prefix: string;
  pending: boolean;
  people: TripPersonReference[];
  locations: TripLocationReference[];
  passengerCount: number;
  activePassengerIndex: number;
  passengerSnapshots: Record<number, Record<string, string>>;
  shareOrigin: boolean;
  shareDestination: boolean;
  value: (name: string) => string;
  fieldInvalid: (name: string) => boolean;
  onSelectPassenger: (index: number) => void;
  onAddPassenger: () => void;
  onRemoveLastPassenger: () => void;
  onBack: () => void;
  onReview: () => void;
  locked?: boolean;
}) {
  const snapshotValue = (name: string) => {
    const activePrefix = `passenger.${activePassengerIndex}.`;
    if (name.startsWith(activePrefix)) {
      const fromSnapshot = passengerSnapshots[activePassengerIndex]?.[name];
      if (fromSnapshot !== undefined) return fromSnapshot;
    }
    return value(name);
  };

  const hiddenPassengerFields = Array.from(
    { length: passengerCount },
    (_, index) => index,
  )
    .filter((index) => index !== activePassengerIndex)
    .flatMap((index) => {
      const snapshot = passengerSnapshots[index] ?? {};
      return Object.entries(snapshot).map(([name, fieldValue]) => (
        <input
          type="hidden"
          key={`${index}-${name}`}
          name={name}
          value={fieldValue}
          readOnly
        />
      ));
    });

  const isDisabled = pending || locked;

  return (
    <section
      className={styles.createSurface}
      hidden={hidden}
      aria-labelledby={`${prefix}-passengers`}
    >
      {locked && (
        <InlineNotice tone="info" role="status">
          اطلاعات اولیه درخواست ذخیره شده است. برای تغییر مسافران یا نوع درخواست،
          این پیش‌نویس را لغو کرده و درخواست جدیدی ثبت کنید.
        </InlineNotice>
      )}

      <div className={styles.passengerStepHeader}>
        <div className={styles.createSurfaceHeading}>
          <div>
            <h2 id={`${prefix}-passengers`}>مسافران</h2>
            <p>
              اطلاعات هر مسافر را جداگانه ثبت کنید. فقط یک فرم در هر زمان
              باز است.
            </p>
          </div>
        </div>
        <div className={styles.passengerControls}>
          <TripPassengerSwitcher
            passengerCount={passengerCount}
            activeIndex={activePassengerIndex}
            onSelect={onSelectPassenger}
            onAdd={onAddPassenger}
            disabled={isDisabled}
            addLabel="+ افزودن مسافر"
          />
          {passengerCount > 1 &&
            activePassengerIndex === passengerCount - 1 && (
              <ActionButton
                type="button"
                variant="secondary"
                size="sm"
                disabled={isDisabled}
                onClick={onRemoveLastPassenger}
              >
                حذف مسافر
              </ActionButton>
            )}
        </div>
      </div>

      <input
        type="hidden"
        name="passengerCount"
        value={passengerCount}
        readOnly
      />
      {hiddenPassengerFields}

      <PassengerEditor
        key={`${prefix}-passenger-editor-${activePassengerIndex}`}
        index={activePassengerIndex}
        prefix={prefix}
        pending={isDisabled}
        people={people}
        locations={locations}
        passengerCount={passengerCount}
        shareOrigin={shareOrigin}
        shareDestination={shareDestination}
        value={snapshotValue}
        fieldInvalid={fieldInvalid}
      />

      <div className={styles.createActions}>
        <ActionButton
          type="button"
          variant="secondary"
          disabled={pending}
          onClick={onBack}
        >
          قبلی
        </ActionButton>
        <div className={styles.createActionsEnd}>
          <ActionButton
            type="button"
            disabled={pending}
            pending={pending}
            onClick={onReview}
          >
            بعدی: مرور و تأیید
          </ActionButton>
        </div>
      </div>
    </section>
  );
}
