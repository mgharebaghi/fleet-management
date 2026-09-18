import { WizardProgress } from "../../../../components/ui/wizard-progress/wizard-progress";
import { CREATE_WIZARD_STEPS } from "./create-wizard";

export function TripCreateProgress({
  currentIndex,
}: {
  currentIndex: number;
}) {
  return (
    <WizardProgress
      steps={CREATE_WIZARD_STEPS}
      currentIndex={currentIndex}
      ariaLabel="مراحل ثبت درخواست سفر"
    />
  );
}
