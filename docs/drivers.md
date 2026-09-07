# Drivers management

Routes: `/drivers` (searchable list), `/drivers/create` (existing person selection),
and `/drivers/[driverId]` (licenses, current assignment, close, history).

## Architecture and rules

`Presentation → composition → Application → repository port → Prisma/SQL Server`.
`ManageDrivers` owns reference eligibility, validation, license uniqueness,
overlap decisions and close rules. `ReadDrivers` owns list input normalization.
The Application contracts contain no Prisma, SQL Server or Next.js types.
The repository maps person and vehicle references rather than copying them.
Only Driver, DriverLicense and VehicleDriverAssignment are written by the feature.

Every write executes its reference checks and persistence inside one Serializable
transaction. A transaction-owned exclusive `sp_getapplock` on
`FleetManagement.Drivers.Write` coordinates writers across application instances.
Lock acquisition failure aborts the operation; it never falls back to an unlocked
write. The single feature-wide lock deliberately favors simple correctness over
maximum write throughput. It has a 10-second acquisition timeout and a 20-second
transaction timeout. The database principal must be able to acquire this lock.

License numbers are trimmed and compared using the database's current collation.
There is no license-number unique constraint or overlap constraint in the current
schema. Writers outside this application can bypass the protocol and create
duplicates or overlaps. Existing invalid records are not silently repaired or
deleted. No database constraint/index/migration is introduced by this feature.

Assignments use half-open intervals `[from, to)`, with null end meaning unbounded.
Adjacent intervals may share an endpoint. Future periods participate in overlap
checks. Current means `from <= now` and `to is null or now < to`, regardless of
whether the period has an explicit end. Closing an open period only writes its
end and optional ending odometer; a future end can therefore leave it current
until that instant. New assignment creation never silently closes another period.

Datetime values are stored as UTC instants in the existing datetime2 columns.
The UI combines the shared Jalali picker with a time control, interpreted and
displayed in Asia/Tehran. The platform timezone database handles historical DST;
nonexistent local times are rejected. Legacy/external datetime writers must use
the same UTC convention. License dates are calendar dates, inclusive at both
boundaries, compared against the Tehran day of assignment start. Nullable dates
do not invalidate a license. No license-to-vehicle-type mapping is assumed.

Odometers remain decimal strings in Application and Presentation. Validation and
comparison use integer hundredths; repository reads convert SQL decimals to text
to avoid adapter Number precision loss. Optional values remain nullable.

The UI reuses the shared shell, header, forms, searchable select, Jalali picker,
tables/mobile cards, notices, badges, pagination and URL-driven live search.
The driver is selected by opening their case before assigning a vehicle.
Licenses can be added active or inactive; general editing/deletion is out of scope.
Assignments use the same content at desktop and mobile widths because the period,
odometer and close form are easier to read together than in a wide table.

## Verification

Run from the repository root:

```sh
npx tsc --noEmit
npm run test:unit
npx vitest run src/features/drivers/infrastructure/prisma-driver-repository.integration.test.ts
npx playwright test e2e/drivers.e2e.ts
npm run lint
npm run build
git diff --check
```

On Windows PowerShell with script execution disabled, use `npm.cmd`/`npx.cmd`.
Integration requires `.env.test.local` and the pre-provisioned
`FleetManagementDB_Integrationtest`; E2E requires `.env.e2e.local` and
`FleetManagementDB_E2ETest`. Existing environment guards reject missing settings
and development fallback. Tests verify live database identity before fixture
writes and remove only their own fixtures in FK-safe order. No test setup DDL is
performed. Related fleet catalog records are isolated test fixtures only.

Integration covers real mapping, exact decimals, references, duplicate licenses,
overlap/adjacency, close/history, concurrent connections and rollback. Browser
tests use the production build to exercise person → driver → license → assignment
→ current → close → same history record, conflict feedback, retained values,
desktop/mobile layout and live-search focus. Screenshots are generated under the
ignored `test-results` directory.
