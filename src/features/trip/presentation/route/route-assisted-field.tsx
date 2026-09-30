"use client";

import { FieldLabel, FormField, formControlClassName } from "../../../../components/ui/form-field/form-field";
import type { AssistedField } from "./route-plan-assist";
import editorStyles from "./route-plan-editor.module.css";

export function RouteAssistedField({ id, name, label, inputMode, field, disabled, onChange, onAccept }: {
  id: string;
  name: string;
  label: string;
  inputMode: "numeric" | "decimal";
  field: AssistedField;
  disabled?: boolean;
  onChange: (value: string) => void;
  onAccept: () => void;
}) {
  return <FormField>
    <FieldLabel htmlFor={id}>{label}</FieldLabel>
    <input id={id} name={name} className={formControlClassName} inputMode={inputMode} dir="ltr" value={field.value} disabled={disabled} onChange={event => onChange(event.target.value)} />
    {field.suggestion && <p className={editorStyles.suggestion}>
      <button type="button" className={editorStyles.textButton} onClick={onAccept}>
        استفاده از مقدار پیشنهادی ({field.suggestion})
      </button>
    </p>}
  </FormField>;
}
