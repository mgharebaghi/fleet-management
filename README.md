This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Prisma and SQL Server

This project uses Prisma with a database-first SQL Server workflow. SQL Server is the source of truth, and Prisma introspection is limited to the `driver`, `fleet`, and `person` database schemas.

Prisma CLI reads `DATABASE_URL`. Prisma Client runtime builds the official
`mssql` config object from separate environment variables, so credentials are
not hard-coded in application code. Configure the ignored `.env` file:

```dotenv
DATABASE_URL="sqlserver://localhost:1433;database=FleetManagementDB_05;schema=dbo;user=YOUR_USER;password=YOUR_PASSWORD;encrypt=true;trustServerCertificate=true;"
DATABASE_SERVER="localhost"
DATABASE_PORT="1433"
DATABASE_NAME="FleetManagementDB_05"
DATABASE_USER="YOUR_USER"
DATABASE_PASSWORD="YOUR_PASSWORD"
DATABASE_ENCRYPT="true"
DATABASE_TRUST_SERVER_CERTIFICATE="true"
```

Integration tests use the same suffixes with the `TEST_DATABASE_` prefix in
`.env.test.local`. E2E tests use the `E2E_DATABASE_` prefix in
`.env.e2e.local`. This allows each environment to provide its own SQL Server
credentials and database identity.

Use the repository scripts to validate, introspect, and generate the client:

```bash
npm run prisma:validate
npm run prisma:pull
npm run prisma:generate
```

Do not use Prisma Migrate or `prisma db push` for the existing database. Database structure changes must be made through the approved SQL Server database process, followed by `npm run prisma:pull`.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Vehicles

Vehicles are managed at `/fleet/vehicles`, with creation at
`/fleet/vehicles/create`. The list defaults to active records, twenty per page,
ordered by VehicleId descending. The URL is the source of truth for `search`,
`status`, `active` and `page`. Search covers everything the list shows: the
vehicle code, each plate part, the international plate, VIN, engine and chassis
identifiers, and the related brand, model, vehicle type, fuel type and status
names. Plate parts are matched individually; they are never concatenated.
ModelYear is a smallint, so it is matched exactly rather than by substring.
Search text is normalised for Persian digits and the Arabic letter forms before
it reaches the query.

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

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
