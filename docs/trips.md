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
  driver assignment history.
- Planned routes belong to a Trip. Actual routes can belong to a
  TripExecution. `trip.RoutePoint` holds ordered locations and the optional
  traffic zone and distance from start.
- Passenger rating, comment and survey time are stored on the related
  TripExecution. The schema represents one current survey payload per
  execution, not survey history.
- `trip.VehicleTrip` has no foreign keys to the Trip request/execution graph.
  It is treated as a legacy standalone table and is not used by this feature.
- Accident and violation links to TripRequest are respected by the database
  contract but are outside this feature.

## Request numbers and lifecycle

Request numbers are generated as `TR-{JalaliYear}-{Sequence}`:

- The year comes from the request date in the Tehran timezone.
- The sequence is four digits, starts at `0001`, and resets each Jalali year.
- Existing values are trimmed and normalized to uppercase while the next
  sequence is calculated.
- Application performs a duplicate pre-check before insertion.

SQL Server has no unique constraint for `TripRequest.RequestNo`. The
transaction-owned application lock serializes this application's writers, but
an external writer that bypasses the application can still race the pre-check.
That concurrency limitation cannot be removed without an approved database
unique constraint.

TripRequest statuses are stored in English and displayed in Persian:

```
New → Assigned → InProgress → Completed
  └───────────────┐
Assigned ─────────┴→ Cancelled
```

Cancellation is accepted only from `New` or `Assigned`, and never after a
TripExecution has started. Reverse transitions are rejected.

TripExecution statuses are:

```
Planned → InProgress → Completed
   └────────→ Cancelled
```

Cancellation is accepted only from `Planned` before an actual pickup is
recorded. `trip.Trip.Status` remains nullable and has no invented lifecycle.

## Operational voucher workflow

Staff select an assignment active at the passenger Trip's scheduled time and
open the official printable voucher. It is Persian/RTL and includes request,
Trip, schedule, passenger, route, driver, vehicle and plate data from the
database.

The paper deliberately leaves handwriting areas for actual departure/arrival,
start/end odometer and operational notes, plus driver, issuer, receiver and
stamp/signature areas. These paper-only fields are not persisted as new
columns. After return, staff reconcile supported values into TripExecution;
the driver does not enter execution data online.

The print view uses browser `window.print()` and print CSS. It needs no PDF
dependency and removes the admin chrome when printed.

## UX and known contract gaps

The detail page provides General, Passengers, Vehicle and Driver, Route,
Execution and Scheduling, and Passenger Survey sections. Request-level origin
or destination is never fabricated when passenger Trips differ.

The reference screenshots also show requester, priority, event history, GPS
locations/current position and last-updater concepts. No matching columns or
event/GPS tables exist in the audited contract, so those values are not faked
or persisted.

## Tests

- Unit: `npx vitest run src/features/trip/application`
- Integration (isolated IntegrationTest DB only):
  `npx vitest run src/features/trip/infrastructure/prisma-trip-repository.integration.test.ts --no-file-parallelism --testTimeout=600000`
- E2E (isolated E2ETest DB only):
  `npx playwright test e2e/trips.e2e.ts`

Both database suites verify database identity before fixtures are written and
delete only their own records.
