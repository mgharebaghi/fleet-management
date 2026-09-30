"use server";



import { makeManageDrivers } from "../../composition/driver.factory";

import { formValues, parseDate, type DriverActionState } from "../driver-form-data";
import { submitDriverAction } from "../driver-action-runner";

export async function addLicenseAction(driverId: number, _state: DriverActionState, data: FormData) {
  return submitDriverAction(data, v => makeManageDrivers().addLicense({ driverId, licenseType: v.licenseType ?? "", licenseNo: v.licenseNo ?? "", issueDate: parseDate(v.issueDate), expireDate: parseDate(v.expireDate), isActive: v.isActive === "true" }), () => `/drivers/${driverId}?tab=licenses`);
}

export async function updateLicenseAction(driverId: number, licenseId: number, _state: DriverActionState, data: FormData) {
  return submitDriverAction(data, v => makeManageDrivers().updateLicense({ licenseId, driverId, licenseType: v.licenseType ?? "", licenseNo: v.licenseNo ?? "", issueDate: parseDate(v.issueDate), expireDate: parseDate(v.expireDate), isActive: v.isActive === "true" }), () => `/drivers/${driverId}?tab=licenses`);
}

export async function deleteLicenseAction(driverId: number, _state: DriverActionState, data: FormData) {
  const values = formValues(data);
  if (!values) return { error: "INVALID_FORM" } satisfies DriverActionState;
  return submitDriverAction(data, () => makeManageDrivers().deleteLicense(driverId, Number(values.licenseId)), () => `/drivers/${driverId}?tab=licenses`);
}
