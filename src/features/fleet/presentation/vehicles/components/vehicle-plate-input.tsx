"use client";

import { formControlClassName } from "../../../../../components/ui/form-field/form-field";
import { vehicleLabels, vehiclePlatePartCaptions } from "./vehicle-form-messages";
import styles from "./vehicle-form.module.css";

type PlatePartName = keyof typeof vehiclePlatePartCaptions;

type PlatePartProps = {
  name: PlatePartName;
  defaultValue: string;
  error?: string;
  direction?: "ltr" | "rtl";
};

export function PlatePartInput({
  name,
  defaultValue,
  error,
  direction = "ltr",
}: PlatePartProps) {
  return (
    <div className={styles.platePartField}>
      <span className={styles.platePartCaption} aria-hidden="true">
        {vehiclePlatePartCaptions[name]}
      </span>

      <input
        className={`${formControlClassName} ${styles.platePartInput}`}
        id={name}
        name={name}
        type="text"
        dir={direction}
        defaultValue={defaultValue}
        aria-label={vehicleLabels[name]}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${name}-error` : undefined}
      />
    </div>
  );
}

export const platePartNames = [
  "plateNoLeftSide",
  "plateNoCenterChar",
  "plateNoRightSide",
  "plateNoIranNo",
] as const;
