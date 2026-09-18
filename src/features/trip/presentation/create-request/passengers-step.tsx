import { ActionButton } from "../../../../components/ui/action-button/action-button";
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

  return (
    <section
      className={styles.createSurface}
      hidden={hidden}
      aria-labelledby={`${prefix}-passengers`}
    >
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
        <TripPassengerSwitcher
          passengerCount={passengerCount}
          activeIndex={activePassengerIndex}
          onSelect={onSelectPassenger}
          onAdd={onAddPassenger}
          disabled={pending}
          addLabel="+ افزودن مسافر"
        />
      </div>

      <input
        type="hidden"
        name="passengerCount"
        value={passengerCount}
        readOnly
      />
      {hiddenPassengerFields}

      <div className={styles.passengerEditorHeading}>
        <h3 id={`${prefix}-passenger-${activePassengerIndex}-title`}>
          اطلاعات مسافر {activePassengerIndex + 1}
        </h3>
        {passengerCount > 1 &&
          activePassengerIndex === passengerCount - 1 && (
            <ActionButton
              type="button"
              variant="secondary"
              size="sm"
              disabled={pending}
              onClick={onRemoveLastPassenger}
            >
              حذف مسافر
            </ActionButton>
          )}
      </div>

      <PassengerEditor
        key={`${prefix}-passenger-editor-${activePassengerIndex}`}
        index={activePassengerIndex}
        prefix={prefix}
        pending={pending}
        people={people}
        locations={locations}
        passengerCount={passengerCount}
        shareOrigin={shareOrigin}
        shareDestination={shareDestination}
        value={snapshotValue}
        fieldInvalid={fieldInvalid}
      />

      <p className={styles.hint}>
        اگر زمان سوارشدن هر مسافر خالی بماند، همان زمان برنامه‌ریزی‌شدهٔ
        درخواست استفاده می‌شود.
      </p>

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
          <ActionButton type="button" disabled={pending} onClick={onReview}>
            بعدی
          </ActionButton>
        </div>
      </div>
    </section>
  );
}
