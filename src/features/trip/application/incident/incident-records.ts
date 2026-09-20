export type RecordAccidentCommand = {
  tripRequestId: number;
  vehicleAssignmentId: number | null;
  accidentDateTime: Date;
  location: string | null;
  description: string | null;
  damageAmount: string | null;
  driverFaultPercent: string | null;
  policeReportNo: string | null;
  hasInjury: boolean;
};

export type RecordViolationCommand = {
  tripRequestId: number;
  vehicleAssignmentId: number | null;
  violationDateTime: Date;
  violationType: string;
  location: string | null;
  amount: string;
  referenceNo: string | null;
  description: string | null;
};

export type IncidentFailure =
  | "INVALID_ID"
  | "INVALID_DATE"
  | "REQUEST_NOT_FOUND"
  | "REQUEST_TERMINAL"
  | "ASSIGNMENT_NOT_ON_REQUEST"
  | "LOCATION_TOO_LONG"
  | "INVALID_DAMAGE"
  | "INVALID_FAULT"
  | "POLICE_REPORT_TOO_LONG"
  | "VIOLATION_TYPE_REQUIRED"
  | "VIOLATION_TYPE_TOO_LONG"
  | "INVALID_AMOUNT"
  | "REFERENCE_TOO_LONG";

export type IncidentResult =
  | { success: true; id: number }
  | { success: false; error: IncidentFailure };
