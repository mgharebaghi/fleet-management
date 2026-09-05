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

## Database-first with SQL Server

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

## Getting started

```bash
npm install
cp .env.example .env        # then fill in real development credentials
npm run prisma:generate
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment variables

Copy [.env.example](./.env.example) — it lists every variable with
non-sensitive placeholder values and is safe to commit. Never commit the
filled-in `.env`, `.env.test.local` or `.env.e2e.local` files.

- `.env` — development database (`DATABASE_URL`, `DATABASE_*`).
- `.env.test.local` — integration test database (`TEST_DATABASE_*`), used
  only by `npm run test:integration`.
- `.env.e2e.local` — E2E test database (`E2E_DATABASE_*`), used only by
  `npm run test:e2e`.

Each environment is a distinct SQL Server database. Test configuration fails
fast (and integration/E2E runs refuse to start) if the required variables are
missing or if a test database resolves to the same server/port/name as
development.

## Testing strategy

- **Unit** (`*.test.ts`, `*.test.tsx`) — Application and Presentation logic,
  no database. Run with `npm run test:unit`.
- **Integration** (`*.integration.test.ts`) — Prisma repositories against the
  isolated `FleetManagementDB_Integrationtest`
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

Run Vehicle checks with:

```bash
npx vitest run src/features/fleet/application/vehicles src/features/fleet/presentation/vehicles src/features/fleet/infrastructure/vehicles src/components/ui
npx playwright test e2e/vehicles.e2e.ts e2e/list-people.e2e.ts
```

The people list shows and searches the name, personnel number and national
code. The mobile number is collected on the create form but is deliberately
kept out of the list and its search.

## Shared presentation foundation

Every page builds on the primitives under `src/components/ui`: `PageShell`
(the page canvas and card, `wide` for listings and `narrow` for forms),
`PageHeader`, `ActionLink`, `ActionButton`, the `form-field` control
appearance, `FormGrid`, `InlineNotice`, `DataTable`, `RecordCards`,
`ResultState`, `Pagination` and the URL-driven `list-filters`. They carry
visual, layout and URL concerns only — columns, labels, field order and every
business rule stay in the feature, so a change to one page should be checked
against the others.

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

### Money

Amounts use `MoneyInput`. The currency is **تومان** and is named in the field's
label rather than left to a placeholder. Digits are grouped in threes while the
user types, and the plain decimal — no separators, Latin digits — is what
reaches the Application. Grouping is done on the string, so a value past
`Number.MAX_SAFE_INTEGER` keeps every digit. The stored value is the amount the
user entered; no rial/toman conversion happens anywhere.

Integration requires the isolated `FleetManagementDB_Integrationtest` configured
through `TEST_DATABASE_*`; E2E uses `FleetManagementDB_E2ETest` and
`E2E_DATABASE_*`. Tests verify database identity before writing and clean only
their own fixtures. They do not provision or change database structure.
The SQL Server driver decodes Decimal results through JavaScript numbers, so
the persistence tests read decimals using SQL `CONVERT(varchar(40), ...)` to
verify exact stored digits. The production list does not select decimal fields.
Any future decimal read behavior must preserve that precision as well.
