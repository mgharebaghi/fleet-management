# Trip feature

The Trip feature is available from `/trips`. It uses the existing SQL Server
contract without migrations or schema changes and follows the same
Application/Infrastructure/Composition/Presentation boundaries as the rest of
FleetManagement.

## Data model

- `trip.TripRequest` is the request header.
- Every passenger is a separate `trip.Trip` linked to one existing
  `person.People` row and its own `common.Location` origin/destination.
  Requested pickup time, pickup/drop-off order, optional Trip status and
  description remain passenger-specific.
- `trip.TripExecution` belongs to one Trip and references an existing
  `driver.VehicleDriverAssignment`; Trip never creates, closes or rewrites
  driver assignment history. A Trip may have many executions over time; at
  most one non-terminal (`Planned` or `InProgress`) execution is active.
- Planned routes belong to a Trip. Actual/execution-owned routes can belong
  to a TripExecution in the contract, but the staff UI only creates planned
  Trip-owned routes. Deviation, stops and actual times stay on the paper
  mission sheet and are reconciled after return into TripExecution fields,
  not into a second Route graph. If an execution-owned Route row already
  exists it is shown read-only. The application never writes both parent FKs
  on one Route row. Selecting a planned route deselects other selected
  Trip-owned routes for that passenger.
- Passenger rating, comment and survey time are stored on the related
  TripExecution. The schema represents one current survey payload per
  execution, not survey history. No 1–5 scale is confirmed in the database
  contract, so the UI does not invent a star selector.
- `trip.VehicleTrip` has no foreign keys to the Trip request/execution graph
  and is unused.
- `driver.Accident` and `driver.VehicleViolation` may link to a TripRequest
  and a persisted assignment. Stops, signatures, stamp, delay and route
  deviation stay paper-only.

There is no approved physical Journey/run grouping across passengers. Each
passenger remains one Trip.

## Locations

Origin and destination remain required Location foreign keys. When the catalog
is empty, staff create a Location inline without leaving the request form.
Optional code, type, address, coordinates and description follow the current
column lengths and `decimal(9,6)` coordinates. Duplicate checks are
application-level only:

- normalized nonempty code is a strong duplicate
- normalized name + address prevents an obvious duplicate
- an inactive exact match is reported separately

There is no database UNIQUE on Location; concurrent or external writers can
still race.

## Request numbers and lifecycle

Request numbers are generated as `TR-{JalaliYear}-{Sequence}`:

- The year comes from the request date in the Tehran timezone.
- The sequence is four digits, starts at `0001`, and resets each Jalali year.
- Allocation takes a year-scoped application lock
  (`FleetManagement.Trip.RequestNo.{year}`) inside the create transaction.
  Other Trip writes are not globally serialized.
- Application still pre-checks duplicates before insertion.

SQL Server has no unique constraint for `TripRequest.RequestNo`. An external
writer that bypasses the application can still race the pre-check.

TripRequest statuses are stored in English and displayed in Persian:

```
New → Assigned → InProgress → Completed
  └───────────────┐
Assigned ─────────┴→ Cancelled
```

- `Assigned` requires a persisted Planned (or later non-cancelled) execution
  for every passenger, not merely candidate assignments.
- `InProgress` requires a started execution.
- `Completed` requires remaining child executions to be Completed.
- Cancellation is accepted only from `New` or `Assigned` before any execution
  starts. Cancelling the request also cancels remaining Planned children.

TripExecution statuses are:

```
Planned → InProgress → Completed
   └────────→ Cancelled
```

- Planned/Cancelled executions cannot carry actual start data.
- InProgress requires actual pickup and cannot carry actual dropoff.
- Completed requires both actual times.
- Assignment is immutable after actual start.
- `trip.Trip.Status` remains nullable and has no invented lifecycle.

## Dispatch eligibility

At the passenger's Tehran trip time the application requires:

- active driver (`person.People.IsActive`)
- active vehicle (`fleet.Vehicle.IsActive`)
- half-open assignment window
- an eligible driver licence on that Tehran day

Inactive drivers and vehicles are never shown as eligible. VehicleStatus names
are not hard-coded. Insurance is **not** enforced: the audited catalog only
contains third-party (`ثالث`) policies and no established Trip blocking rule
was found.

## Assignment, voucher and paper

The Vehicle and Driver tab persists the selected assignment as a Planned
TripExecution. The official printable sheet is `برگه مأموریت سفر — نسخه راننده`
and is derived only from that persisted plan. Query-string assignment switching
is not used.

The paper includes request number, plan time, passenger, origin/destination,
route/points, driver, vehicle/model/code/plate, purpose/notes, and structured
handwriting areas for actual times/odometer, stops, delay/deviation,
incidents, accident/violation details, operational notes, and signatures/stamp.
Those handwriting fields are not persisted. After return, staff reconcile
supported values into TripExecution; accident and violation rows may also be
recorded against the request and persisted assignment. Violation amount is
required when recording electronically; unknown amounts stay on paper rather
than being stored as zero. `VehicleViolation.Status` is written as `Unpaid`
to match the intended SQL default (`N'Unpaid'` in Prisma introspection).

Print uses browser `window.print()` and print CSS. No PDF dependency.

## Request types

Seeded type codes:

- `COMMON_ORIGIN`: one shared origin, per-passenger destination
- `COMMON_DESTINATION`: one shared destination, per-passenger origin
- `COMMON_ORIGIN_DESTINATION`: shared origin and destination

The form inherits those shared locations. Distinct origin/destination rules
for other types are not invented. Optional passenger pickup falls back to the
request time. Pickup/drop-off order is de-emphasized for a single passenger.
The 50-passenger and 50-route-point limits are technical form guards, not
domain laws.

## Tests

- Unit: `npx vitest run src/features/trip/application`
- Integration (isolated IntegrationTest DB only):
  `npx vitest run src/features/trip/infrastructure --no-file-parallelism --testTimeout=600000`
- E2E (isolated E2ETest DB only):
  `npx playwright test e2e/trips.e2e.ts`

Both database suites verify database identity before fixtures are written and
delete only their own records.
