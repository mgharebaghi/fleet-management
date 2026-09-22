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
  Other Trip writes are not globally serialized by that lock. All Trip write
  transactions still use Serializable isolation because RequestNo, one
  non-terminal execution per Trip, and one selected planned Route have no
  unique SQL constraints. Weakening that isolation was not done speculatively.
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

The Vehicle and Driver section persists the selected assignment as a Planned
TripExecution. The official printable sheet is `برگه مأموریت سفر — نسخه راننده`
and is derived only from that persisted plan. Query-string assignment switching
is not used.

The paper includes request number, plan time, passenger, origin/destination,
route/points, driver, vehicle/model/code/plate, purpose/notes, and structured
handwriting areas for actual times/odometer, stops, delay/deviation,
incidents, accident/violation details, operational notes, and signatures/stamp.
Those handwriting fields are not persisted. After return, staff reconcile
supported values into TripExecution; accident and violation rows may also be
recorded against the request and an assignment proven to belong to a Completed
TripExecution of that request. Planned, Cancelled, and foreign assignments are
rejected in Application. Violation amount is required when recording
electronically; unknown amounts stay on paper rather than being stored as zero.
`VehicleViolation.Status` is written as `Unpaid` because SQL Server
`DF_VehicleViolation_Status` is `(N'Unpaid')` (the value Unpaid) while Prisma
introspection `@default("N'Unpaid'")` is injected on omit and would persist
the characters `N'Unpaid'`.

Print uses browser `window.print()` and print CSS. No PDF dependency.

## Request types

Seeded type codes:

- `COMMON_ORIGIN`: one shared origin, per-passenger destination
- `COMMON_DESTINATION`: one shared destination, per-passenger origin
- `COMMON_ORIGIN_DESTINATION`: shared origin and destination

## Request creation and dispatch workflow

FleetManagement separates **Trip Registration** (Requester role) from **Initial Handling & Assignment** (Dispatcher role):

### 1. Requester flow (`/trips/create`)
Requesters register trip requests through a clean **3-step wizard**:
1. **اطلاعات درخواست** — request type, travel date and time, shared origin/destination (if applicable), purpose, and general description.
2. **مسافران** — passenger selection, per-passenger origin and destination, optional pickup time override, pickup/drop-off orders, and notes.
3. **مرور و تأیید** — review of the requested trip and passengers.
Submitting persists the `TripRequest` and passenger `Trip` records with `Status = "New"` in an atomic transaction, then redirects to the Trip landing page (`/trips`). Requesters do not assign drivers, vehicles, or execution plans.

### 2. Trip home and pending badges (`/trips`)
The Trip home page provides two clear paths:
- **ثبت سفر** — starts a new trip request (`/trips/create`).
- **رسیدگی به درخواست‌ها** — dispatcher view of all requests (`/trips/requests`).
When requests in `Status = "New"` exist:
- A badge showing the count of pending requests appears on the «رسیدگی به درخواست‌ها» card.
- A notification badge appears next to «سفرها» in the persistent Admin Shell navigation (both sidebar and mobile drawer).
When there are no new requests (count = 0), the badges are hidden.

### 3. Dispatcher handling (`/trips/requests` and `/trips/{id}`)
In the requests list (`/trips/requests`), requests in `Status = "New"` are prominently highlighted:
- Status badge: **نیازمند رسیدگی** (warning tone).
- Action button: **رسیدگی به درخواست** (primary variant).

Opening a `New` request loads the **4-step handling wizard**:
1. **بررسی درخواست** — review the requester's trip details and passenger list.
2. **راننده و خودرو** — select eligible vehicle and driver assignments per passenger.
3. **مسیر** — optional route definition and stop points.
4. **تأیید و تخصیص** — summary of the operational plan and final confirmation.

Submitting the handling wizard calls `assignInitialTripRequestAction`, which atomically:
- Verifies the request is still `New`.
- Validates active driver and vehicle assignment eligibility.
- Rejects the assignment when any physical vehicle would have more than 3 active passengers, including passengers already planned or in progress on other requests.
- Creates `TripExecution` records with status `Planned`.
- Persists any defined routes linked to passenger trips.
- Updates the `TripRequest.Status` to `Assigned`.
- Redirects to `/trips/{id}`.

One physical vehicle may carry at most 3 active passengers across all trip requests. An active passenger is a `TripExecution` in `Planned` or `InProgress`. `Completed` and `Cancelled` executions free that capacity. Capacity is the physical vehicle (`vehicleId`): different driver/vehicle assignment records for the same vehicle share that limit. This is not a seat-count or vehicle-type capacity, and it does not use planned end time, route duration, or `VehicleTrip`. On the assignment step, persisted active occupancy is combined with the other passengers selected in the current wizard. A full vehicle stays visible and searchable, but its assignment options are disabled with «ظرفیت خودرو تکمیل شده». The passenger currently being edited is excluded from the unsaved wizard count, so their own selection stays available. `assignInitialRequest` reads that occupancy inside its transaction and enforces the same limit before creating executions, routes, or changing request status. It returns `VEHICLE_PASSENGER_CAPACITY_EXCEEDED` when the limit would be exceeded. A `New` request has no executions yet, so its own passengers are counted only from the assignment being submitted.

`createCompleteRequest` is not part of this dispatcher flow. Requesters submit a `New` request without assignments; only handling calls `assignInitialRequest`.

### 4. Staff detail workspace (`/trips/{id}`)
Subsequent visits to an assigned or active request directly load the **5-tab administrative workspace** (`TripWorkspacePage`):

| Tab (UI) | URL | توضیحات |
|----------|-----|---------|
| جزئیات سفر | `/trips/{id}` | مشخصات درخواست، نوع، هدف، زمان‌بندی و توضیحات |
| مسافران | `?tab=passengers` | جدول فشرده مسافران در دسکتاپ و کارت‌های واکنش‌گرا در موبایل |
| راننده و خودرو | `?tab=assignment` | اطلاعات راننده و خودروی مسافران و لینک مستقیم صدور برگه مأموریت |
| مسیر | `?tab=route` | مسیرهای برنامه‌ریزی‌شده و مسیرهای ثبت‌شدهٔ اجرا |
| وضعیت سفر (پویا) | `?tab=completion` | برچسب، آیکون و رنگ بر اساس وضعیت: جدید، تخصیص‌یافته، در حال اجرا، تکمیل‌شده، لغوشده |

- **جزئیات سفر** — request identity, status, type, purpose, request and
  requested-travel times, and request-level description only.
- **مسافران** — compact passenger table on desktop/tablet and shared
  responsive record cards on mobile; nullable `Trip.Status` stays separate
  from planning/execution state.
- **راننده و خودرو** — persisted per-passenger TripExecution assignment
  history, assignment window, driver/personnel and licence-eligibility state,
  vehicle/model/code/plate, and mission sheet voucher generation links
  (`/trips/{id}/voucher/{tripId}`).
- **مسیر** — optional planned and execution-owned routes with ordered
  RoutePoints and route registration dialog while the request is open.
- **وضعیت سفر (پویا)** — dynamically presents the 5th tab's label, icon, and tone
  according to `TripRequest.status` (`جدید`, `تخصیص‌یافته`, `در حال اجرا`, `تکمیل‌شده`, `لغوشده`).
  In `InProgress`, contains operational return time and odometer entry alongside
  the primary «تکمیل درخواست» completion action. In terminal states (`Completed`,
  `Cancelled`), provides a full read-only summary and survey display without edit controls.

Request-level status actions (تخصیص‌یافته، شروع درخواست، تکمیل درخواست،
لغو) live in `TripRequestStatusControl` on the dynamic status tab.

Legacy `?tab=` values (`general`, `details`, `driver`, `vehicle`, `planning`,
`execution`, `status`, `survey`, `return`) map cleanly onto the five active tabs.
Incident forms are not mounted in the workspace UI (paper + separate flows
unchanged at Application level). Tehran timezone behavior is unchanged.

## Trip list

`/trips/requests` uses a compact row layout (schedule, route, meta, status,
request id) with «مشاهده جزئیات» for handled requests and «رسیدگی به درخواست»
for new requests.

## Tests

- Unit: `npm run test:unit`
- Integration (isolated IntegrationTest DB only):
  `npx vitest run src/features/trip/infrastructure --no-file-parallelism --testTimeout=600000`
- E2E (isolated E2ETest DB only):
  `npx playwright test e2e/trips.e2e.ts`

Both database suites verify database identity before fixtures are written and
delete only their own records.
