import { describe, expect, it } from "vitest";

import {
  assertsSurveyNotRequiredForRequestCompletion,
  completionSurveyIntroText,
  completionSurveyProgressLine,
  hasExecutionDescription,
  presentPlanningExecutionStatusLabel,
  presentTripPassengerStatus,
} from "./trip-workspace-passenger-display";

describe("trip workspace passenger display", () => {
  it("preserves nullable Trip passenger status without conflating execution", () => {
    expect(presentTripPassengerStatus(null)).toBe("ثبت نشده");
    expect(presentTripPassengerStatus("Confirmed")).toBe("Confirmed");
    expect(
      presentPlanningExecutionStatusLabel({
        executionStatus: "Completed",
        hasPlan: true,
      }),
    ).toBe("تکمیل‌شده");
    expect(
      presentPlanningExecutionStatusLabel({
        executionStatus: null,
        hasPlan: false,
      }),
    ).toBe("نیازمند برنامه‌ریزی");
  });

  it("keeps personnel/mobile reachable via roster item fields", () => {
    const item = {
      personnelNo: "10234",      nationalCode: null,      mobile: "09121234567",
      passengerStatus: null,
      executionStatus: null,
      hasPlan: true,
    };
    expect(item.personnelNo).toBe("10234");
    expect(item.mobile).toBe("09121234567");
    expect(presentTripPassengerStatus(item.passengerStatus)).toBe("ثبت نشده");
    expect(
      presentPlanningExecutionStatusLabel({
        executionStatus: item.executionStatus,
        hasPlan: item.hasPlan,
      }),
    ).toBe("برنامه ثبت شده");
  });

  it("does not state survey is required for request completion", () => {
    const line = completionSurveyProgressLine(1, 3);
    expect(line).toContain(completionSurveyIntroText);
    expect(assertsSurveyNotRequiredForRequestCompletion(line)).toBe(true);
    expect(
      assertsSurveyNotRequiredForRequestCompletion(
        "برای تکمیل نهایی، نظرسنجی مسافران را ثبت کنید.",
      ),
    ).toBe(false);
  });

  it("treats execution description as visible when present", () => {
    expect(hasExecutionDescription(null)).toBe(false);
    expect(hasExecutionDescription("   ")).toBe(false);
    expect(hasExecutionDescription("ثبت از برگه")).toBe(true);
  });
});
