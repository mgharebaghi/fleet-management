import { ActionButton } from "../../../../components/ui/action-button/action-button";
import styles from "./create-trip.module.css";

export function CreateWizardNavigation({
  onBack,
  onPrimary,
  primaryLabel,
  pending = false,
  primaryDisabled = false,
}: {
  onBack?: () => void;
  onPrimary: () => void;
  primaryLabel: string;
  pending?: boolean;
  primaryDisabled?: boolean;
}) {
  return (
    <div className={styles.wizardFooter}>
      <div className={styles.wizardNav}>
        {onBack && (
          <ActionButton
            type="button"
            variant="secondary"
            disabled={pending}
            onClick={onBack}
          >
            بازگشت
          </ActionButton>
        )}
        <ActionButton
          type="button"
          disabled={pending || primaryDisabled}
          pending={pending}
          onClick={onPrimary}
        >
          {primaryLabel}
        </ActionButton>
      </div>
    </div>
  );
}
