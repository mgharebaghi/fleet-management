import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { VehicleReference } from "../application/driver-records";
import { driverMessages } from "./driver-form-data";
import { buildAssignmentVehicleOptions } from "./assignment-vehicle-options";

const vehicle = (id: number, code: string): VehicleReference => ({
  vehicleId: id,
  vehicleCode: code,
  plate: "12 ب 345",
  isActive: true,
  brandName: "پژو",
  modelName: "۲۰۷",
  vehicleTypeName: null,
  plateNoLeftSide: "12",
  plateNoCenterChar: "ب",
  plateNoRightSide: "345",
  plateNoIranNo: "11",
});

describe("assignment vehicle options", () => {
  const vehicles = [vehicle(1, "BUSY"), vehicle(2, "FREE"), vehicle(3, "PAST")];
  const options = buildAssignmentVehicleOptions(vehicles, [{ vehicleId: 1, assignmentId: 9 }]);

  it("disables a vehicle that has a current assignment and keeps free vehicles selectable", () => {
    expect(options[0]?.disabled).toBe(true);
    expect(options[1]?.disabled).toBeUndefined();
    expect(options[2]?.disabled).toBeUndefined();
    expect(renderToStaticMarkup(options[0]?.content)).toContain("در دسترس نیست");
    expect(renderToStaticMarkup(options[1]?.content)).not.toContain("در دسترس نیست");
    expect(options[0]?.searchText).toContain("پژو");
    expect(options[1]?.searchText).toContain("12");
  });

  it("keeps the vehicle of the assignment being edited selectable", () => {
    const editing = buildAssignmentVehicleOptions(vehicles, [{ vehicleId: 1, assignmentId: 9 }], 9);
    expect(editing[0]?.disabled).toBeUndefined();
  });

  it("uses the current-assignment rejection message", () => {
    expect(driverMessages.VEHICLE_CURRENTLY_ASSIGNED).toBe("این خودرو در حال حاضر به رانندهٔ دیگری تخصیص دارد و در دسترس نیست.");
  });
});
