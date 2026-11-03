"use client";
import { ActionButton } from "../../../../../components/ui/action-button/action-button";
import { ActionLink } from "../../../../../components/ui/action-link/action-link";
import { ConfirmedSubmitButton } from "../../../../../components/ui/confirmed-submit/confirmed-submit-button";
import { FormActions } from "../../../../../components/ui/form-field/form-field";
export function MaintenanceFormActions({ formId, editing, name, cancelHref, createLabel, pending }: { formId: string; editing: boolean; name: string; cancelHref: string; createLabel: string; pending: boolean }) {
  return <FormActions separated>{editing ? <ConfirmedSubmitButton formId={formId} titleId={`${formId}-confirm`} dialogTitle="ذخیره تغییرات" recordName={name} message="تغییرات این مورد ذخیره شود؟" label="ذخیره تغییرات" pendingLabel="در حال ذخیره…" confirmLabel="تأیید و ذخیره" pending={pending} /> : <ActionButton type="submit" pending={pending}>{pending ? "در حال ثبت…" : createLabel}</ActionButton>}<ActionLink href={cancelHref}>انصراف</ActionLink></FormActions>;
}
