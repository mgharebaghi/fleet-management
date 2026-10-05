import { ActionButton } from "../../../../components/ui/action-button/action-button";
import { FormActions } from "../../../../components/ui/form-field/form-field";

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
    <FormActions separated>
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
    </FormActions>
  );
}
