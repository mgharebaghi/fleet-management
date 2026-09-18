import { WizardProgress } from "../../../../components/ui/wizard-progress/wizard-progress";
import styles from "./create-trip.module.css";
import { CREATE_WIZARD_STEPS } from "./create-wizard";

export function TripCreateProgress({
  currentIndex,
}: {
  currentIndex: number;
}) {
  return (
    <div className={styles.createProgress}>
      <WizardProgress
        steps={CREATE_WIZARD_STEPS}
        currentIndex={currentIndex}
        ariaLabel="مراحل ثبت درخواست سفر"
      />
    </div>
  );
}
