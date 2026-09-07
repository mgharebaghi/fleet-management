import type { HTMLInputTypeAttribute, ReactNode } from "react";

import {
  FieldErrors,
  FieldLabel,
  FormField,
  formControlClassName,
} from "../../../../../components/ui/form-field/form-field";
import { SearchableSelect } from "../../../../../components/ui/searchable-select/searchable-select";
import type { SearchableSelectOption } from "../../../../../components/ui/searchable-select/searchable-select-options";
import type { CatalogEntry } from "../../../application/catalogs/catalog-entry";
import type { VehicleModel } from "../../../application/catalogs/vehicle-model";
import type { NewVehicle } from "../../../application/vehicles/vehicle";
import { normalizeVehicleSearchText } from "../../../application/vehicles/vehicle-text";
import styles from "./vehicle-form-fields.module.css";

export type VehicleFieldName = keyof NewVehicle;

export type FieldSpan = 2 | 3 | 4 | 6;

type FieldFrameProps = {
  span: FieldSpan;
  children: ReactNode;
};

/**
 * Shared by Create and Update: the same fields, validation codes and
 * layout apply to both, so the field renderers live in one place instead
 * of risking the two forms drifting apart.
 */
export function FieldFrame({ span, children }: FieldFrameProps) {
  return <FormField className={styles[`span${span}`]}>{children}</FormField>;
}

export function FieldError({ id, message }: { id: string; message?: string }) {
  return <FieldErrors id={id} messages={message ? [message] : []} />;
}

type TextFieldProps = {
  name: VehicleFieldName;
  label: string;
  span: FieldSpan;
  defaultValue: string;
  error?: string;
  inputMode?: "numeric" | "decimal";
  placeholder?: string;
  direction?: "ltr" | "rtl";
  type?: HTMLInputTypeAttribute;
};

export function VehicleTextField({
  name,
  label,
  span,
  defaultValue,
  error,
  inputMode,
  placeholder,
  direction = "ltr",
  type = "text",
}: TextFieldProps) {
  const errorId = `${name}-error`;

  return (
    <FieldFrame span={span}>
      <FieldLabel htmlFor={name}>{label}</FieldLabel>

      <input
        className={formControlClassName}
        id={name}
        name={name}
        type={type}
        dir={direction}
        inputMode={inputMode}
        placeholder={placeholder}
        defaultValue={defaultValue}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
      />

      <FieldError id={errorId} message={error} />
    </FieldFrame>
  );
}

type SelectFieldProps = {
  name: VehicleFieldName;
  label: string;
  span: FieldSpan;
  defaultValue: string;
  placeholder: string;
  options: SearchableSelectOption[];
  error?: string;
};

export function VehicleSelectField({
  name,
  label,
  span,
  defaultValue,
  placeholder,
  options,
  error,
}: SelectFieldProps) {
  const errorId = `${name}-error`;

  return (
    <FieldFrame span={span}>
      <SearchableSelect
        name={name}
        label={label}
        options={options}
        defaultValue={defaultValue}
        placeholder={placeholder}
        normalizeQuery={normalizeVehicleSearchText}
        invalid={Boolean(error)}
        describedBy={error ? errorId : undefined}
      />

      <FieldError id={errorId} message={error} />
    </FieldFrame>
  );
}

export function buildModelOptions(
  models: VehicleModel[],
): SearchableSelectOption[] {
  return models.map((model) => {
    const text = `${model.brand.name} — ${model.name}${model.isActive ? "" : " (غیرفعال)"}`;
    return {
      value: String(model.id),
      label: text,
      searchText: `${model.brand.name} ${model.name}`,
      content: <span>{text}</span>,
    };
  });
}

export function buildStatusOptions(
  statuses: CatalogEntry[],
): SearchableSelectOption[] {
  return statuses.map((status) => ({
    value: String(status.id),
    label: status.name,
    searchText: status.name,
    content: <span>{status.name}</span>,
  }));
}
