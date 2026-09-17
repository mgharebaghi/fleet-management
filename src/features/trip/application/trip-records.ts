export type TripRequestTypeReference = {
  tripRequestTypeId: number;
  typeCode:
    | "COMMON_ORIGIN"
    | "COMMON_DESTINATION"
    | "COMMON_ORIGIN_DESTINATION"
    | string;
  typeName: string;
  description: string | null;
};

export type TripPersonReference = {
  personId: number;
  firstName: string;
  lastName: string;
  personnelNo: string | null;
  mobile: string | null;
  isActive: boolean;
};

export type TripLocationReference = {
  locationId: number;
  locationCode: string | null;
  locationName: string;
  locationType: string | null;
  address: string | null;
  isActive: boolean | null;
};

export type TripPassengerInput = {
  passengerPersonId: number;
  originLocationId: number;
  destinationLocationId: number;
  requestedPickupDateTime: Date | null;
  pickupOrder: number | null;
  dropoffOrder: number | null;
  status: string | null;
  description: string | null;
};

export type CreateTripRequestCommand = {
  tripRequestTypeId: number;
  requestDateTime: Date;
  requestedTravelDateTime: Date;
  purpose: string | null;
  description: string | null;
  passengers: TripPassengerInput[];
};

export type CreateTripRequestInput = CreateTripRequestCommand & {
  requestNo: string;
  status: "New";
};

export type TripRequestSummary = {
  tripRequestId: number;
  requestNo: string;
  requestTypeName: string;
  requestDateTime: Date;
  requestedTravelDateTime: Date;
  purpose: string | null;
  status: string;
  passengerCount: number;
  origins: string[];
  destinations: string[];
};

export type TripRequestList = {
  requests: TripRequestSummary[];
  totalCount: number;
  statuses: string[];
};

export type TripVehicleReference = {
  vehicleId: number;
  vehicleCode: string;
  plateNoLeftSide: string;
  plateNoCenterChar: string | null;
  plateNoRightSide: string | null;
  plateNoIranNo: string | null;
  brandName: string;
  modelName: string;
  vehicleTypeName: string | null;
  vehicleStatusName: string;
};

export type TripAssignmentReference = {
  assignmentId: number;
  fromDateTime: Date;
  toDateTime: Date | null;
  driverId: number;
  driverFirstName: string;
  driverLastName: string;
  driverPersonnelNo: string | null;
  driverIsActive: boolean;
  hasEligibleLicense: boolean;
  vehicle: TripVehicleReference;
};

export type TripRoutePoint = {
  routePointId: number;
  location: TripLocationReference;
  trafficZone: string | null;
  sequenceNo: number | null;
  distanceFromStartKm: string | null;
  description: string | null;
};

export type TripRoute = {
  routeId: number;
  tripId: number | null;
  tripExecutionId: number | null;
  routeName: string;
  alternativeNo: number | null;
  distanceKm: string | null;
  estimatedDurationMinute: number | null;
  isSelected: boolean;
  description: string | null;
  createdAt: Date;
  points: TripRoutePoint[];
};

export type TripExecutionRecord = {
  tripExecutionId: number;
  tripId: number;
  assignment: TripAssignmentReference;
  actualPickupDateTime: Date | null;
  actualDropoffDateTime: Date | null;
  startOdometer: string | null;
  endOdometer: string | null;
  status: string;
  passengerRating: number | null;
  passengerComment: string | null;
  surveyDateTime: Date | null;
  description: string | null;
  createdAt: Date | null;
  routes: TripRoute[];
};

export type TripPassengerRecord = TripPassengerInput & {
  tripId: number;
  passenger: TripPersonReference;
  origin: TripLocationReference;
  destination: TripLocationReference;
  routes: TripRoute[];
  executions: TripExecutionRecord[];
};

export type TripRequestDetails = {
  tripRequestId: number;
  requestNo: string;
  requestType: TripRequestTypeReference;
  requestDateTime: Date;
  requestedTravelDateTime: Date;
  purpose: string | null;
  status: string;
  description: string | null;
  createdAt: Date;
  passengers: TripPassengerRecord[];
};

export type NewTripRoutePoint = {
  locationId: number;
  trafficZone: string | null;
  sequenceNo: number | null;
  distanceFromStartKm: string | null;
  description: string | null;
};

export type NewTripRoute = {
  tripId: number;
  routeName: string;
  alternativeNo: number | null;
  distanceKm: string | null;
  estimatedDurationMinute: number | null;
  isSelected: boolean;
  description: string | null;
  points: NewTripRoutePoint[];
};

export type SaveTripExecutionInput = {
  tripId: number;
  tripExecutionId: number | null;
  vehicleDriverAssignmentId: number;
  actualPickupDateTime: Date | null;
  actualDropoffDateTime: Date | null;
  startOdometer: string | null;
  endOdometer: string | null;
  status: string;
  description: string | null;
};

export type SavePassengerSurveyInput = {
  tripExecutionId: number;
  passengerRating: number | null;
  passengerComment: string | null;
  surveyDateTime: Date | null;
};

export type TripFailure =
  | "INVALID_ID"
  | "REQUEST_SEQUENCE_EXHAUSTED"
  | "REQUEST_NO_DUPLICATE"
  | "REQUEST_TYPE_NOT_FOUND"
  | "REQUEST_NOT_FOUND"
  | "INVALID_REQUEST_STATUS"
  | "INVALID_REQUEST_TRANSITION"
  | "INVALID_DATE"
  | "PURPOSE_TOO_LONG"
  | "PASSENGER_REQUIRED"
  | "PERSON_NOT_FOUND"
  | "PERSON_INACTIVE"
  | "LOCATION_NOT_FOUND"
  | "LOCATION_INACTIVE"
  | "INVALID_ORDER"
  | "TRIP_STATUS_TOO_LONG"
  | "COMMON_ORIGIN_REQUIRED"
  | "COMMON_DESTINATION_REQUIRED"
  | "TRIP_NOT_FOUND"
  | "ROUTE_NAME_REQUIRED"
  | "ROUTE_NAME_TOO_LONG"
  | "INVALID_ROUTE_NUMBER"
  | "INVALID_DISTANCE"
  | "INVALID_DURATION"
  | "INVALID_SEQUENCE"
  | "TRAFFIC_ZONE_TOO_LONG"
  | "ASSIGNMENT_NOT_FOUND"
  | "ASSIGNMENT_NOT_ACTIVE"
  | "NO_ELIGIBLE_LICENSE"
  | "EXECUTION_NOT_FOUND"
  | "INVALID_EXECUTION_STATUS"
  | "INVALID_EXECUTION_TRANSITION"
  | "INVALID_EXECUTION_PERIOD"
  | "INVALID_ODOMETER"
  | "ODOMETER_DECREASE"
  | "INVALID_RATING";

export type TripResult =
  | { success: true; id: number }
  | { success: false; error: TripFailure };
