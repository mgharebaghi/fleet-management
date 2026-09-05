import { ActionLink } from "../../../../../components/ui/action-link/action-link";
import { DataTable } from "../../../../../components/ui/data-table/data-table";
import { PageHeader } from "../../../../../components/ui/page-header/page-header";
import { PageShell } from "../../../../../components/ui/page-shell/page-shell";
import { Pagination } from "../../../../../components/ui/pagination/pagination";
import {
  RecordCard,
  RecordCardDetail,
  RecordCardDetails,
  RecordCardHeader,
  RecordCardList,
} from "../../../../../components/ui/record-cards/record-cards";
import { ResultState } from "../../../../../components/ui/result-state/result-state";
import { StatusBadge } from "../../../../../components/ui/status-badge/status-badge";
import { TechnicalValue } from "../../../../../components/ui/technical-value/technical-value";
import type { VehicleSummary } from "../../../application/vehicles/vehicle";
import { makeListVehicleStatuses } from "../../../composition/catalogs/vehicle-status.factory";
import { makeListVehicles } from "../../../composition/vehicles/vehicle.factory";
import { ListVehiclesFilters } from "./list-vehicles-filters";
import { VehiclePlate } from "./vehicle-plate";
import styles from "./list-vehicles-page.module.css";

const PAGE_SIZE = 20;
const MAX_PAGE_NUMBER = 21474836;
const MAX_STATUS_ID = 2147483647;

type SearchParams = Readonly<Record<string, string | string[] | undefined>>;

type ActiveParam = "active" | "inactive" | "all";

const numberFormatter = new Intl.NumberFormat("fa-IR");

function getSingleValue(
  value: string | string[] | undefined,
): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function parseActive(value: string | undefined): ActiveParam {
  return value === "inactive" || value === "all" || value === "active"
    ? value
    : "active";
}

function parseStatusId(value: string | undefined): number | null {
  const statusId = Number(value);

  return Number.isInteger(statusId) && statusId > 0 && statusId <= MAX_STATUS_ID
    ? statusId
    : null;
}

function parsePageNumber(value: string | undefined): number {
  const pageNumber = Number(value);

  return Number.isSafeInteger(pageNumber) && pageNumber > 0
    ? Math.min(pageNumber, MAX_PAGE_NUMBER)
    : 1;
}

function buildPageHref(
  search: string,
  active: ActiveParam,
  statusId: number | null,
  pageNumber: number,
): string {
  const params = new URLSearchParams({
    search,
    active,
    page: String(pageNumber),
  });

  if (statusId !== null) {
    params.set("status", String(statusId));
  }

  return `/fleet/vehicles?${params.toString()}`;
}

function CreateVehicleLink() {
  return (
    <ActionLink href="/fleet/vehicles/create" variant="primary">
      ثبت خودرو
    </ActionLink>
  );
}

function SecondaryValue({
  label,
  value,
}: {
  label: string;
  value: string | null;
}) {
  if (value === null || value === "") {
    return null;
  }

  return (
    <span className={styles.secondaryValue}>
      {label} <TechnicalValue>{value}</TechnicalValue>
    </span>
  );
}

function OperationalStatus({ name }: { name: string }) {
  return <span className={styles.operationalStatus}>{name}</span>;
}

function VehiclesTable({ vehicles }: { vehicles: VehicleSummary[] }) {
  return (
    <DataTable caption="فهرست خودروها" minWidth={940}>
      <thead>
        <tr>
          <th scope="col">کد خودرو</th>
          <th scope="col">پلاک</th>
          <th scope="col">برند و مدل</th>
          <th scope="col">نوع و سوخت</th>
          <th scope="col">وضعیت عملیاتی</th>
          <th scope="col">سال ساخت</th>
          <th scope="col">وضعیت رکورد</th>
        </tr>
      </thead>
      <tbody>
        {vehicles.map((vehicle) => (
          <tr key={vehicle.vehicleId}>
            <td>
              <span className={styles.primaryValue}>
                <TechnicalValue>{vehicle.vehicleCode}</TechnicalValue>
              </span>
              <SecondaryValue label="VIN" value={vehicle.vin} />
            </td>
            <td>
              <VehiclePlate vehicle={vehicle} />
              <SecondaryValue
                label="بین‌المللی"
                value={vehicle.internationalPlateNo}
              />
            </td>
            <td>
              <span className={styles.primaryValue}>{vehicle.brand.name}</span>
              <span className={styles.secondaryValue}>
                {vehicle.model.name}
              </span>
            </td>
            <td>
              <span className={styles.plainValue}>
                {vehicle.vehicleType?.name ?? "—"}
              </span>
              <span className={styles.secondaryValue}>
                {vehicle.fuelType?.name ?? "—"}
              </span>
            </td>
            <td>
              <OperationalStatus name={vehicle.status.name} />
            </td>
            <td>
              <TechnicalValue>{vehicle.modelYear ?? "—"}</TechnicalValue>
            </td>
            <td>
              <StatusBadge
                label={vehicle.isActive ? "فعال" : "غیرفعال"}
                tone={vehicle.isActive ? "positive" : "negative"}
              />
            </td>
          </tr>
        ))}
      </tbody>
    </DataTable>
  );
}

function VehicleCards({ vehicles }: { vehicles: VehicleSummary[] }) {
  return (
    <RecordCardList>
      {vehicles.map((vehicle) => (
        <RecordCard key={vehicle.vehicleId}>
          <RecordCardHeader
            title={<TechnicalValue>{vehicle.vehicleCode}</TechnicalValue>}
            badge={
              <StatusBadge
                label={vehicle.isActive ? "فعال" : "غیرفعال"}
                tone={vehicle.isActive ? "positive" : "negative"}
              />
            }
          />

          <VehiclePlate vehicle={vehicle} />

          <p className={styles.vehicleCardModel}>
            {vehicle.brand.name} — {vehicle.model.name}
          </p>

          <RecordCardDetails>
            <RecordCardDetail label="وضعیت عملیاتی">
              <OperationalStatus name={vehicle.status.name} />
            </RecordCardDetail>
            <RecordCardDetail label="نوع و سوخت">
              {vehicle.vehicleType?.name ?? "—"} /{" "}
              {vehicle.fuelType?.name ?? "—"}
            </RecordCardDetail>
            <RecordCardDetail label="سال ساخت">
              <TechnicalValue>{vehicle.modelYear ?? "—"}</TechnicalValue>
            </RecordCardDetail>
            <RecordCardDetail label="شناسه VIN">
              <TechnicalValue>{vehicle.vin ?? "—"}</TechnicalValue>
            </RecordCardDetail>
            <RecordCardDetail label="پلاک بین‌المللی">
              <TechnicalValue>
                {vehicle.internationalPlateNo ?? "—"}
              </TechnicalValue>
            </RecordCardDetail>
          </RecordCardDetails>
        </RecordCard>
      ))}
    </RecordCardList>
  );
}

function EmptyState({
  hasCriteria,
  hasAnyVehicles,
  totalCount,
}: {
  hasCriteria: boolean;
  hasAnyVehicles: boolean;
  totalCount: number;
}) {
  if (hasCriteria) {
    return (
      <ResultState
        title="خودرویی مطابق جستجو یا فیلتر پیدا نشد"
        description="عبارت جستجو یا فیلترهای انتخاب‌شده را تغییر دهید."
        action={
          <ActionLink href="/fleet/vehicles">
            پاک کردن جستجو و فیلتر
          </ActionLink>
        }
      />
    );
  }

  if (!hasAnyVehicles) {
    return (
      <ResultState
        title="هنوز خودرویی ثبت نشده است"
        description="برای شروع، اطلاعات اولین خودروی ناوگان را ثبت کنید."
        action={<CreateVehicleLink />}
      />
    );
  }

  if (totalCount > 0) {
    return (
      <ResultState
        title="این صفحه خالی است"
        description="شماره صفحه از تعداد نتیجه‌ها بیشتر است؛ به صفحه اول بازگردید."
        action={<ActionLink href="/fleet/vehicles">صفحه اول</ActionLink>}
      />
    );
  }

  return (
    <ResultState
      title="خودروی فعالی برای نمایش وجود ندارد"
      description="خودروهای ثبت‌شده غیرفعال هستند؛ می‌توانید همه رکوردها را نمایش دهید."
      action={
        <ActionLink href="/fleet/vehicles?active=all">
          نمایش همه خودروها
        </ActionLink>
      }
    />
  );
}

export async function ListVehiclesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const search = getSingleValue(searchParams.search) ?? "";
  const active = parseActive(getSingleValue(searchParams.active));
  const statusId = parseStatusId(getSingleValue(searchParams.status));
  const pageNumber = parsePageNumber(getSingleValue(searchParams.page));

  let result;
  let statuses;
  let hasAnyVehicles = true;

  try {
    [result, statuses] = await Promise.all([
      makeListVehicles().execute({
        search,
        pageNumber,
        isActive: active === "all" ? null : active === "active",
        vehicleStatusId: statusId,
      }),
      makeListVehicleStatuses().execute(),
    ]);

    // Only an unfiltered default view can prove the fleet itself is empty.
    if (
      result.totalCount === 0 &&
      !search.trim() &&
      statusId === null &&
      active === "active"
    ) {
      hasAnyVehicles =
        (await makeListVehicles().execute({ isActive: null, pageSize: 1 }))
          .totalCount > 0;
    }
  } catch {
    return (
      <PageShell>
        <PageHeader
          eyebrow="مدیریت ناوگان"
          title="خودروها"
          action={<CreateVehicleLink />}
        />
        <ResultState
          variant="error"
          title="دریافت اطلاعات خودروها امکان‌پذیر نبود"
          description="لطفاً دوباره تلاش کنید. اگر مشکل ادامه داشت، با پشتیبانی تماس بگیرید."
          action={<ActionLink href="/fleet/vehicles">تلاش دوباره</ActionLink>}
        />
      </PageShell>
    );
  }

  const hasCriteria = Boolean(
    search.trim() || statusId !== null || active !== "active",
  );

  return (
    <PageShell>
      <PageHeader
        eyebrow="مدیریت ناوگان"
        title="خودروها"
        description="خودروهای ناوگان را مشاهده کنید یا با کد، پلاک، برند، مدل، وضعیت و شناسه‌های فنی جستجو کنید."
        action={<CreateVehicleLink />}
      />

      <ListVehiclesFilters
        initialSearch={search}
        initialStatus={statusId === null ? "" : String(statusId)}
        initialActive={active}
        statuses={statuses}
        hasCriteria={hasCriteria}
      />

      {result.vehicles.length > 0 ? (
        <>
          <div className={styles.resultSummary} aria-live="polite">
            <span>{numberFormatter.format(result.totalCount)} خودرو</span>
          </div>
          <VehiclesTable vehicles={result.vehicles} />
          <VehicleCards vehicles={result.vehicles} />
        </>
      ) : (
        <EmptyState
          hasCriteria={hasCriteria}
          hasAnyVehicles={hasAnyVehicles}
          totalCount={result.totalCount}
        />
      )}

      <Pagination
        label="صفحه‌بندی خودروها"
        currentPage={pageNumber}
        totalPages={Math.ceil(result.totalCount / PAGE_SIZE)}
        buildHref={(page) => buildPageHref(search, active, statusId, page)}
      />
    </PageShell>
  );
}
