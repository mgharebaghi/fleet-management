import { ActionButton } from "../../../../components/ui/action-button/action-button";

export function PhaseSubmitButton({
  pending,
  enabled,
  label,
}: {
  pending: boolean;
  enabled: boolean;
  label: string;
}) {
  return (
    <ActionButton
      type="submit"
      disabled={pending || !enabled}
      pending={pending}
    >
      {pending ? "در حال ثبت…" : label}
    </ActionButton>
  );
}
