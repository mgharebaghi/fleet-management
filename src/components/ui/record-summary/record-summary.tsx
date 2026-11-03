import type { ReactNode } from "react";
import { FormField, FieldHint } from "../form-field/form-field";
import { FormGrid } from "../form-grid/form-grid";
export function RecordSummary({ fields, columns = 2, fieldClassName }: { fields: Array<[string, ReactNode]>; columns?: 2 | 12; fieldClassName?: string }) {
  return <FormGrid columns={columns}>{fields.map(([label, value]) => <FormField key={label} className={fieldClassName}><FieldHint>{label}</FieldHint><p>{value ?? "ثبت نشده"}</p></FormField>)}</FormGrid>;
}
