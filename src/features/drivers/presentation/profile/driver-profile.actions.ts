"use server";



import { makeManageDrivers } from "../../composition/driver.factory";

import { type DriverActionState } from "../driver-form-data";
import { submitDriverAction } from "../driver-action-runner";

export async function defineDriverAction(_state: DriverActionState, data: FormData) {
  return submitDriverAction(data, v => makeManageDrivers().defineDriver(Number(v.personId)), id => `/drivers/${id}`);
}
