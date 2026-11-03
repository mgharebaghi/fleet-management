# FleetManagement

FleetManagement is a fleet-management application with a Persian, RTL user
interface: vehicles, their catalogs (brand, model, type, fuel, status) and
personnel are tracked against an existing SQL Server database.

## Stack

- Next.js (App Router) + React + TypeScript
- SQL Server, accessed through Prisma ORM
- Vitest (unit/integration) and Playwright (E2E)

## Architecture

The codebase follows Feature-based, Layered and Vertical Slice principles.
Each feature under `src/features/<domain>` is organised into:

- **Application** — use cases, validation and Ports; independent of Prisma,
  SQL Server and Next.js.
- **Infrastructure** — Prisma repositories implementing those Ports.
- **Composition** — explicit factories wiring a Port to its Prisma
  implementation.
- **Presentation** — pages, Server Actions and forms; UI and transport
  concerns only, no business rules.

The full set of engineering rules (scope, database safety, layer boundaries,
Presentation conventions, testing, git workflow) is defined in
[AGENTS.md](./AGENTS.md) and is the reference for any change to this
repository.

Within each layer, group related files by capability and responsibility as they
grow. Inventory keeps Application/Infrastructure reference data together and
organizes Presentation into `catalogs`, `warehouses/list`, `warehouses/form`,
`warehouses/details` and feature-local `shared`. Tests live beside the code they
exercise. Do not create empty folders or a separate directory for every function.

## Database-first with SQL Server

The shared Prisma client allows up to 15 seconds to acquire/start a transaction.
Prisma's 2-second default can fail with `P2028` on a cold remote SQL Server pool
before the first people list is returned. This setting does not retry writes or
extend transaction execution timeouts; feature-specific overrides still apply.
People-list failures log only the operation, safe error category and Prisma code.
After changing client startup configuration, restart an existing development
server so its cached Prisma singleton is recreated.

SQL Server is the source of truth for the data model. Prisma is a consumer of
the database, not its designer. The only supported flow is:

```
SQL Server → prisma db pull → schema.prisma → Prisma Client
```

`prisma migrate dev` and `prisma db push` must never be run against this
project's databases, and `schema.prisma` must never be hand-edited to change
structure. Any real schema change goes through the approved SQL Server
process first, followed by `npm run prisma:pull`.

Prisma CLI commands (`validate`, `pull`) read `DATABASE_URL`. Prisma Client at
runtime instead builds the `mssql` adapter config from the separate
`DATABASE_*` variables below, so no connection string or credential is
hard-coded in application code.

The Development database user used by `prisma db pull` must have
`VIEW DEFINITION` permission so Prisma can introspect database-managed
defaults and other metadata correctly. This permission is required for
introspection only and is not a production runtime requirement.

## Getting started

Use Node.js **24** (also specified in `.nvmrc` and `package.json`), matching CI
and Docker. In particular, Node 26 rejects the current SQL Server driver's TLS
SNI handling of IP addresses. Keep the existing IP connection and configured
encryption settings on Node 24; changing certificate validation is not a runtime
upgrade workaround.

```bash
npm install
cp .env.example .env        # then fill in real development credentials
npm run prisma:generate
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Docker

The production image uses Node.js 24 and Next.js standalone output. The build
generates the Prisma 7 client from the committed database-first schema using a
placeholder connection string; it does not require a reachable SQL Server.

```bash
docker build -t fleet-management .
docker run --rm -p 3000:3000 --env-file .env fleet-management
```

At runtime, provide the existing `DATABASE_SERVER`, `DATABASE_PORT`,
`DATABASE_NAME`, `DATABASE_USER`, `DATABASE_PASSWORD`, `DATABASE_ENCRYPT` and
`DATABASE_TRUST_SERVER_CERTIFICATE` variables through the deployment platform.
Also provide `NEXT_PUBLIC_NESHAN_MAP_KEY` (public web map key) and
`NESHAN_SERVICE_API_KEY` (server-only Search/Reverse key) on the running
service. The map key is read on the server and handed to the browser per
request, so it is not baked into the Next.js build and does not need to be a
Docker build argument. The service key must never be exposed to the client.
Do not put credentials in the Dockerfile or image. `DATABASE_URL` remains a
Prisma CLI concern and is not used by the running application.

The container listens on port `3000`. `GET /api/health` is a lightweight
liveness check for Docker or Coolify; it deliberately does not query SQL Server,
so database connectivity should be monitored separately when readiness is
required.

## Environment variables

Copy [.env.example](./.env.example) — it lists every variable with
non-sensitive placeholder values and is safe to commit. Never commit the
filled-in `.env`, `.env.test.local` or `.env.e2e.local` files.

- `.env` — development database (`DATABASE_URL`, `DATABASE_*`).
- `.env.test.local` — integration test database (`TEST_DATABASE_*`), used
  only by `npm run test:integration`.
- `.env.e2e.local` — E2E test database (`E2E_DATABASE_*`), used only by
  `npm run test:e2e`.

Neshan map assistance uses two additional variables, documented in
`.env.example`:

- `NEXT_PUBLIC_NESHAN_MAP_KEY` — web map key. It is client-visible because the
  browser requests map tiles, but server code reads it at runtime and passes
  it into the map. Set it on the running container. A missing key shows a
  manual-entry fallback instead of the map.
- `NESHAN_SERVICE_API_KEY` — server-only secret for Neshan Search and Reverse
  Geocoding. FleetManagement calls Neshan; the browser does not. Search can
  remain unavailable until Neshan activates it for this key. That does not
  block saving a location by hand.

Automated E2E clears both variables so the suite never calls Neshan.

Each environment is a distinct SQL Server database. Test configuration fails
fast (and integration/E2E runs refuse to start) if the required variables are
missing or if a test database resolves to the same server/port/name as
development.

## Testing strategy

- **Unit** (`*.test.ts`, `*.test.tsx`) — Application and Presentation logic,
  no database. Run with `npm run test:unit`.
- **Integration** (`*.integration.test.ts`) — Prisma repositories against the
  isolated `FleetManagementDB_IntegrationTest`
  database, configured through `TEST_DATABASE_*`. Run with
  `npm run test:integration`; never falls back to the development database.
- **E2E** (`e2e/*.e2e.ts`) — full UI-to-database flows against
  `FleetManagementDB_E2ETest`, configured through `E2E_DATABASE_*`. Run with
  `npm run test:e2e`.
- `npm test` runs the full Vitest suite (unit + integration) locally when a
  reachable integration database is configured.

Automated tests never run against production, and tests never provision or
change database structure — they verify database identity before writing and
clean up only their own fixtures.

`src/test-support/database/test-database-config.ts` is the shared configuration
guard for Integration, Playwright and browser fixtures. Missing settings, a wrong
test database name, or a connection matching Development/the other test database
stops the run before fixture writes. Tests additionally query `DB_NAME()` on the
live connection. Provision both test databases from the approved SQL Server
contract outside the test runner; tests never migrate or clear a database.

Playwright uses the production build. SQL-backed navigation assertions allow
15 seconds for the isolated remote database response; their expected behavior
is unchanged. Server startup has a separate five-minute budget that includes
the production build on the self-hosted runner, with build output in CI logs.
For a verification run without retries, use
`npm run test:e2e -- --retries=0`. Synthetic responsive, light/dark and voucher
print screenshots are written under ignored `test-results/` directories.

## Commands

```bash
npm run dev               # start the dev server
npm run build             # production build
npm run lint               # ESLint
npx tsc --noEmit           # TypeScript check

npm run prisma:validate    # validate schema.prisma
npm run prisma:pull        # introspect SQL Server into schema.prisma
npm run prisma:generate    # generate Prisma Client

npm run test:unit          # unit tests, no database required
npm run test:integration   # integration tests, requires TEST_DATABASE_*
npm run test:maintenance-contract # read-only maintenance/inventory contract check in both test DBs
npm run test:e2e           # Playwright E2E, requires E2E_DATABASE_*
```

## Vehicles

Vehicles are managed at `/fleet/vehicles`, with creation at
`/fleet/vehicles/create`. The list defaults to active records, twenty per page,
ordered by VehicleId descending. The URL is the source of truth for `search`,
`status`, `active` and `page`. Search covers everything the list shows: the
vehicle code, each plate part, the international plate, VIN, engine and
chassis identifiers, and the related brand, model, vehicle type, fuel type and
status names. Plate parts are matched individually; they are never
concatenated. ModelYear is a smallint, so it is matched exactly rather than by
substring. Search text is normalised for Persian digits and the Arabic letter
forms before it reaches the query.

New vehicles require a complete Iranian plate. Identifier uniqueness is checked
in Application across all records, including inactive ones: vehicle code, the
four-part domestic plate, and nonempty international plate, VIN, engine and
chassis identifiers. These checks do not guarantee uniqueness under concurrent
writes because the database currently has no corresponding unique constraints.
Comparison uses the existing SQL Server collation; identifiers are trimmed, not
case-folded. Legacy incomplete plates remain readable. Existing inactive models
are selectable; an operational status must be explicitly selected.

Purchase date is chosen from the shared Jalali calendar and converted in
Presentation. The panel will not offer a future day, and the Application
rejects dates after the current UTC calendar date regardless. Decimal inputs
remain strings through Application, permit zero, reject negative values and
values outside decimal(18,2), and are converted only in Infrastructure.
VehicleId, IsActive and CreatedAt are left to database defaults. No meter-reading
record is created. Currency is not assumed.

A vehicle's Detail page is at `/fleet/vehicles/[vehicleId]`, Update at
`/fleet/vehicles/[vehicleId]/edit` (same fields, same validation as create,
preloaded), and Delete is a confirmation dialog on the Detail page. Delete is
blocked whenever a driver assignment, an insurance record or a meter reading
still references the vehicle — the last of those has no feature in this
project's approved scope, but its foreign key exists in the database and is
still respected.

Run Vehicle checks with:

```bash
npx vitest run src/features/fleet/application/vehicles src/features/fleet/presentation/vehicles src/features/fleet/infrastructure/vehicles src/components/ui
npx playwright test e2e/vehicles.e2e.ts e2e/list-people.e2e.ts
```

The people list shows and searches the name, personnel number and national
code. The mobile number is collected on the create form but is deliberately
kept out of the list and its search.

A person's Detail page is at `/people/[personId]`, Update at
`/people/[personId]/edit`, and Delete is a confirmation dialog on the Detail
page. Delete is blocked whenever the person has a `Driver` record — the
Persian message names the relation without exposing the raw database error.
The national-code checksum lives in one place (`src/features/people/
application/national-code.ts`) so Create and Update can never validate it
differently.

## Trips

Trip management starts at `/trips`: staff can create a request with one or
more passenger-specific Trips, create Locations inline when the catalog is
empty, persist vehicle/driver planning as a Planned execution, print the
driver mission sheet from that persisted plan, reconcile the returned paper,
and optionally record accident/violation rows already present in the contract.

Request numbers use `TR-{JalaliYear}-{4-digit sequence}` and reset each Jalali
year. Request and execution lifecycles are enforced in Application while
stored statuses remain English and the Persian UI translates them. No schema
change is made; RequestNo uniqueness is an Application pre-check and therefore
still has a race for external writers until SQL Server receives an approved
unique constraint. See [docs/trips.md](./docs/trips.md) for the full data
semantics, paper workflow, limitations and focused test commands.

## Maintenance and inventory

The first Inventory slice is available in the admin menu under **قطعات و انبار**:
`/inventory/catalogs` manages units (including their optional symbol) and part
categories; `/inventory/warehouses` provides live search, paging, create, detail
and update. Categories and warehouses can be deactivated; unused units,
categories and warehouses can be deleted after confirmation. Warehouse rows and
mobile cards provide delete and deactivate/reactivate actions. Any stock history,
including a zero current balance, prevents warehouse deletion. Unit has no active flag. All writes use Application validation and
transaction-scoped duplicate checks; no SQL Server structure changes are made.

Stock creation identifies missing active parts and warehouses separately, linking
directly to creation or to existing inactive records for reactivation. Part
creation guides users to define a unit first when no unit exists. Compatibility
with vehicle models remains read-only under the current database contract.

The shared entry point for reference definitions is named **اطلاعات پایه**
with a link to warehouse management; Parts retains its independent working list.

Warehouse addresses remain editable text. Create/update forms also offer a
shared Neshan address picker: search or click a point, review the reverse-geocoded
address and confirm to fill the existing text field. Cancelling leaves the
current text intact; map/reverse failures preserve manual entry. Only the text
is persisted in `Warehouse.Location`; this flow does not create common.Location
records, retain warehouse coordinates or change the schema. The existing public
map key and server-only Neshan service key are reused.

Part list/create/detail/update is now available at `/inventory/parts`, including
exact decimal stock thresholds, inactive references, read-only vehicle-model
compatibility and protection against changing a used part's unit. Stock
movements are available at `/inventory/movements` (including creation), and
`/inventory/stock` provides per-warehouse balances and part-wide threshold
warnings.

The **تعمیرات و نگهداری** menu now provides `/maintenance/catalogs` for types
of repair/service, `/maintenance/workshops` and `/maintenance/technicians`.
Each includes live search, active/all/inactive filters, pagination, shared
responsive tables/cards, create/detail/edit and confirmed updates. References
can be deactivated to preserve history. Unused repair/service types can also be
deleted after confirmation; the delete button is disabled when a type is used
by any request, work order or maintenance plan. Server checks and the real FKs
protect against usage added after the list was loaded. Workshops and technicians
are retained through deactivation. Workshop classification remains free text;
internal/external affiliation is a separate flag. Technicians may be independent
or linked to a workshop. Existing inactive workshop affiliations can be retained;
new assignments to inactive workshops are rejected. Maintenance type identifiers
are allocated from 1 through 255 under a transaction lock; application startup
performs no seeding or DDL.
Repair requests are available at `/maintenance/requests`: registration, exact
reported readings, editing, tracking and confirmed closure/cancellation. This
is the first vertical slice of stage 5. The request's state is independent of
actual repair execution. Linked unresolved orders prevent closure; any linked
order freezes the vehicle/type origin. Closed requests cannot be edited or
reopened. Reported readings do not update the vehicle meter or its history.
Work-order preparation is available at `/maintenance/work-orders`: direct
registration or creation from an open request or existing active service plan,
annual `WO-{JalaliYear}-{4-digit sequence}` numbering, searchable responsive
lists, details and confirmed edits to location, readings and diagnosis. Creating
a file leaves its status `Open` and does not start repair, update vehicle meters,
change service baselines or move inventory. Closed files are read-only here.
The shared record tabs now provide **اطلاعات و عیب‌یابی**, **کارها و اجرت**, **قطعات مصرف‌شده** and **هزینه‌های پرونده**.
Tasks have their own title, optional technician, exact decimal hours/cost and
status. Preparation and cancellation are available before repair starts; active
or completed task states require an actually started InProgress file. Cancellation
preserves previous hours/cost. Unknown cost remains distinct from explicit zero,
and known labor totals include cancelled work without floating-point rounding.
Closed files only allow filling a previously unknown labor cost once; existing
costs and task metadata remain fixed. Tasks are retained through cancellation.
Consumed parts now support same-file task selection, exact quantities and optional prices,
SQL-computed four-place totals and confirmed open-file corrections. Closed files
allow completing a previously unknown price once. Consumption never posts stock
movements; warehouse issue remains a separate manual operation. The cost-summary tab combines
known labor and computed part totals with exact four-place precision, links to
the original cost-entry tabs, and distinguishes missing prices from explicit
zero. The repair sidebar presents a concise record summary with a bold total,
a real-time approximate duration bar based on task hours. Task/part details and creation stay in their tabs; file operations are hidden while repair is in progress.
Existing records and missing amounts are managed through the tabs. Linked requests become read-only and show repair-derived progress in a compact two-panel workspace; completion is green and request filters match the displayed repair status. Repair start and bidirectional dispatch guards are implemented; completion, meter history and service scheduling remain later slices. No unsupported repair-complete buttons
are exposed.

The maintenance submenu and page heading use **اطلاعات پایه**. User-approved
starter service types can be previewed with
`node scripts/seed-maintenance-reference-data.mjs` and inserted with `--apply`.
The command only permits `FleetManagementDB_Development`, verifies its live
identity, shares the maintenance reference lock and adds missing codes/names
without updating existing records (including inactive ones). It never creates
workshops, technicians, repairs or service intervals. It is an explicit manual
command, not application startup behavior.
Part rows use the shared view/edit/delete icon actions. Only parts without stock,
repair consumption or compatibility references can be deleted after confirmation.
The approved scope, manual acceptance steps and
remaining limitations are in [docs/maintenance.md](./docs/maintenance.md), including
independent stock/repair records and read-only part compatibility.

Editable forms share `useEditableActionState` for stale field feedback. After a
failed submission, editing a field dismisses only that field's previous error;
untouched fields and service failures remain visible. Empty required fields retain
their errors. Composite selectors, dates and times notify the same form behavior.
The general validation notice clears when no field errors remain. Each feature
owns its field-to-error mapping; Application/server validation still runs on every
submission. Clearing feedback does not certify uniqueness or persist a change.

Before the first business slice, run `npm run test:maintenance-contract`. This
read-only check verifies the dedicated Integration and E2E database identities
and compares their maintenance/inventory metadata with the reviewed SQL Server
contract. It does not run a browser, write rows or provision tables. Required
test-account access and `VIEW DEFINITION` must be available; an unavailable or
different contract fails instead of falling back to Development. Both test
connections and the full maintenance/inventory contract now pass after the
environment owner corrected credentials and granted metadata visibility.

Focused checks for reference data:

```bash
npx vitest run src/features/inventory/application src/features/inventory/presentation
npx vitest run src/features/inventory/infrastructure/reference-data/prisma-inventory-reference-repository.integration.test.ts --no-file-parallelism
npx playwright test e2e/inventory-references.e2e.ts --retries=0
```

The user-approved Development starter catalog contains 10 conventional units and
14 flat part categories. `node scripts/seed-inventory-reference-data.mjs` previews
missing entries; adding `--apply` inserts only missing names into the verified
`FleetManagementDB_Development` database under the same reference-data lock.
Existing names, symbols and active flags are never overwritten. This command is
manual, does not run in setup/CI and never provisions structure or inserts stock,
parts or warehouse records. It requires Node 24's native TypeScript support.

## Shared presentation foundation

Every page builds on the primitives under `src/components/ui`: `PageShell`
(the page canvas and card, `wide` for listings and `narrow` for forms),
`PageHeader`, `ActionLink`, `ActionButton`, the `form-field` control
appearance, `FormGrid`, `InlineNotice`, `DataTable`, `RecordCards`,
`ResultState`, `Pagination` and the URL-driven `list-filters`. They carry
visual, layout and URL concerns only — columns, labels, field order and every
business rule stay in the feature, so a change to one page should be checked
against the others.

Full-page create/edit forms use `PageShell width="narrow"`, which applies the
shared `FormLayout`: the same 1080px content limit, surface and responsive spacing
as the trip-request form. Features must not add a separate form-width limit.
Modal field editors keep the shared `Dialog` sizing rather than becoming full-page forms.

`DataTable` has no forced minimum width or desktop scrolling frame. It wraps
headings and values; features group related values in a cell where their column
count would otherwise make text unreadable. Free-text descriptions and notes
belong in record details, not table cells or mobile list cards. Main records use
their existing detail page; embedded child records use `RecordDetailsButton` with
the shared read-only dialog. `ProgressBar` owns the common visual treatment while
the feature calculates its business-specific progress.

`CatalogPanel` centralizes the existing catalog surface, heading, counts and
action layout. Fleet's name-only catalogs and Inventory's units/categories use
it; their field editors, lifecycle rules and persistence remain feature-owned.

`PageShell` owns centring. The card is centred horizontally, and vertically too
whenever the page is shorter than the workspace; a taller page keeps its top
reachable and scrolls normally. The shell fills the workspace its parent gives
it rather than measuring the viewport, so it still behaves once pages sit
inside an app shell. No feature sets a width, a margin or a minimum height for
this.

`PageHeader` renders `BrandMark` itself, so the product identity sits in the
same place on every page and a page cannot forget it or move it. The header's
`action` slot is where a page's primary action goes — beside the title on wide
screens, stacked under the description on narrow ones.

`FormGrid` owns column count, gaps and responsive collapse. A field left alone
on a form's last row keeps one column's width and sits in the middle of the
row. Features keep their own field order, and a twelve-column grid lets them
give fields business-driven spans.

Features must not re-declare these concerns locally. A feature CSS module
should hold only what is specific to it, such as a vehicle plate or a people
name cell.

Search is live everywhere it exists: typing navigates after a debounce, other
filters navigate at once, both restart paging, and there is no submit control.
On desktop (above 760px), `ListFilterBar` keeps fields and clearing in one row
and lets field widths shrink as more filters are added. Nested `FormGrid`
compositions use `listFilterGridClassName` for the same layout; mobile keeps
the existing stacked layout.
List-wide clearing is shown only for an applied search or a filter different
from its default. Pagination, unrelated query parameters and explicitly selecting
the default status do not count as filters. Returning to default criteria hides
the clear action again; an out-of-range page offers first-page navigation.
Every list supplies its feature-owned default values to `useListFilters` and
passes the returned `clear` contract to `ListFilterBar`. The shared bar owns
the label, appearance and conditional rendering of `پاک کردن فیلترها`; pages
must not add a parallel clear control inside the filter bar. Clearing cancels pending search debounce,
resets owned query fields and paging, and preserves unrelated query parameters.
Each list is searchable across every field it displays; the searchable set and
its query live in that feature's Application and Infrastructure, never in the
shared components.

### Dates

Dates are always chosen from `JalaliDatePicker`, never typed. The panel shows
the Persian calendar and submits a Gregorian `yyyy-mm-dd` through a hidden
field, so conversion stays at the Presentation boundary: the Application takes
an ordinary `Date` and SQL Server stores an ordinary date. `minDate`/`maxDate`
only stop the panel offering a day; the business rule stays in the Application,
which still rejects a future purchase date on its own.

The calendar header offers direct month selection and a year field. Enter the
Jalali year (Latin, Persian or Arabic digits) and press Enter or leave the field,
then choose a month and day. Navigating does not submit the form or change its
stored date until a day is selected; day limits still apply after a distant jump.

### Money

Amounts use `MoneyInput`. The currency is **تومان** and is named in the field's
label rather than left to a placeholder. Digits are grouped in threes while the
user types, and the plain decimal — no separators, Latin digits — is what
reaches the Application. Grouping is done on the string, so a value past
`Number.MAX_SAFE_INTEGER` keeps every digit. The stored value is the amount the
user entered; no rial/toman conversion happens anywhere.

Integration requires the isolated `FleetManagementDB_IntegrationTest` configured
through `TEST_DATABASE_*`; E2E uses `FleetManagementDB_E2ETest` and
`E2E_DATABASE_*`. Tests verify database identity before writing and clean only
their own fixtures. They do not provision or change database structure.
The SQL Server driver decodes Decimal results through JavaScript numbers, so
the persistence tests read decimals using SQL `CONVERT(varchar(40), ...)` to
verify exact stored digits. The production list does not select decimal
fields; a single-record read (a Detail page, an Update form's preload) does,
and applies the same `CONVERT(varchar(40), ...)` reading pattern so a large or
finely fractional value never loses a digit. Any future decimal read behavior
must preserve that precision as well.

## Admin shell and navigation

Sidebar groups use one open-group state: opening a group closes the previous
one. Selecting a top-level leaf closes every group before navigating. Route
changes reveal the group for the destination, and mobile uses the same NavList
behavior inside its drawer. Clicking an open group again collapses it.

`People`, `Fleet` and `Drivers` share one persistent shell, wired through the
`(admin)` route group (`src/app/(admin)/layout.tsx`) so it applies without
changing any URL. `AdminShell` (`src/components/admin-shell`) renders a
right-aligned sidebar above 760px and a compact top-bar disclosure panel below
it; both read the same `ADMIN_NAV_SECTIONS` list, so a new top-level route is
added to navigation in exactly one place. The shell only arranges navigation —
it carries no business logic, and every page keeps its own `PageShell`/
`PageHeader` inside it, so nothing here duplicates a feature's own identity or
actions.

Page links use shared `NavigationLink`, including text/icon actions, back links,
sidebar entries and links inside features. While a different page is pending,
it reuses the page `LoadingIndicator` in the centre of the admin workspace;
the fixed bounds stay centred even when the source table is scrolled. The
covered content is hidden so it cannot show a second visible loading state.
Next.js still owns prefetching, completion/cancellation and modified-click
navigation. Query-only filters, pagination and record tabs keep their local
feedback. New page links should use this component instead of importing
`next/link` directly; programmatic page exits reuse `PageNavigationPending`.

Loading indicators fill and centre within their scope. Page fallbacks fill the
admin workspace (or viewport at the root). Results feedback targets the visible
table/mobile card list; form and tab feedback targets its own panel. Scoped
feedback stays in the visible portion when a long panel is scrolled, and tracks
scrolling and responsive resizing without changing the surrounding layout.
All scopes, including maps, use the same loading surface and the fixed text
`در حال بارگذاری`. Page/panel variants control placement only, not appearance.

## Detail, Update and Delete

Person, Vehicle and the Fleet catalog entities (`VehicleBrand`, `VehicleType`,
`FuelType`, `VehicleStatus`, `VehicleModel`) each expose a Detail view, an
Update form that preloads the current record, and a Delete confirmation.
`VehicleInsurance` gets Update and Delete only: its list already shows every
field a Detail page would, so a separate route would only duplicate it.

Update reuses the same normalization and validation the create flow already
established (imported directly, never re-implemented) and excludes the
record's own id from every uniqueness check, so keeping a value unchanged
never reports itself as a duplicate.

Delete always confirms through a shared dialog before submitting, and the
database is the final authority on whether a row can be removed. Infrastructure
catches the two Prisma error codes a real SQL Server foreign-key constraint
produces through this project's `mssql` adapter — `P2003` (still referenced)
and `P2025` (already gone) — and raises a small typed error
(`*InUseError` / `*NotFoundError`, one pair per entity's own writer port)
instead of leaking the raw database error. Application maps that to a typed
result, and Presentation turns it into a plain Persian sentence; nothing here
guesses at or bypasses the constraint. `Driver`, `DriverLicense` and
`VehicleDriverAssignment` intentionally keep no generic delete — see
[docs/drivers.md](./docs/drivers.md) for why history stays immutable and
`Close Assignment` is the only supported end to a period.


### Vehicle meter history

Open **Fleet → Organization vehicles → Vehicle record → Vehicle meters**
(`/fleet/vehicles/[vehicleId]/meter-readings`). The shared two-panel workspace
keeps vehicle identity, current odometer/engine hours and tab-specific actions
in the sidebar. Details expose edit/delete; meter history exposes Record meter.
The read-only table/mobile cards provide live search and pagination. Filtering
history never changes the current values shown in the sidebar.

Recording requires a valid non-future Tehran date/time and at least one exact,
nonnegative odometer or accumulated engine-hours value. Persian digits/grouping
are accepted; engine hours use the common accumulated-duration picker. Observation
and current-value synchronization are atomic. Historical entries must fit both
neighboring readings for each metric and never reduce the current value. Invalid
existing history/current values block new writes rather than silently repair data.
Existing records cannot be edited/deleted in this version; odometer replacement
and downward correction remain unsupported.

After any history exists, vehicle-edit meter controls are read-only. Application
policy plus the Infrastructure transaction reject direct changes even from stale
or tampered forms, while allowing other vehicle edits and numerically equivalent
values. Meter writes, direct vehicle edits and repair/dispatch use the same
physical-vehicle lock. Decimal values travel as exact strings; SQL Server local
datetime2 values are explicitly mapped to/from Tehran instants. SQL Server's
existing fleet.VehicleMeterReading contract is unchanged. Service completion can
select these observations through its existing history selection.

Focused tests: `record-vehicle-meter.test.ts`, vehicle-update/action tests,
`prisma-vehicle-meter-repository.integration.test.ts` and
`e2e/vehicle-meter-readings.e2e.ts`. SQL tests use isolated Integration/E2E
configurations only. No migration, seed or development data write is needed.


### Periodic service plans

Maintenance → Service plans (`/maintenance/plans`) supports create/edit, active or
inactive plans, live search, status/vehicle filters, pagination and a two-panel
detail with linked service files. Define at least one positive interval in
calendar days, kilometers or engine hours. Optional warning margins must be
smaller than their interval. Missing service baselines stay unknown; creation
time is never substituted. Any reached criterion makes the plan due.

The detail offers Create service file through the existing shared work-order
form. Source vehicle/type and service baselines freeze after a file is linked;
completion updates the baseline using the existing atomic completion flow.
Deactivation preserves all files and prevents new service-file creation. Plan
status is calculated in Application from exact decimals and the SQL Server
Tehran date; filtering occurs before pagination. Existing schema and defaults
are preserved. Only focused plan-rule tests, one isolated repository scenario
and one targeted browser scenario are needed for this slice.
