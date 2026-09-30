import { PageShell } from "../../../../components/ui/page-shell/page-shell";
import { PageHeader } from "../../../../components/ui/page-header/page-header";
import { ResultState } from "../../../../components/ui/result-state/result-state";
import { BackLink } from "../../../../components/ui/back-link/back-link";
import { makeReadDrivers } from "../../composition/driver.factory";
import { DriverForm } from "../driver-form";

export async function CreateDriverPage() {
  const people = await makeReadDrivers().availablePeople();
  return <PageShell width="narrow"><PageHeader eyebrow="رانندگان" title="تعریف راننده" description="راننده از روی پروندهٔ یک شخص فعال ساخته می‌شود؛ فقط اشخاصی که هنوز راننده نیستند در فهرست می‌آیند." action={<BackLink label="بازگشت به رانندگان" href="/drivers" />} compactAction />
    {people.length ? <DriverForm kind="driver" people={people} /> : <ResultState title="شخص واجد شرایطی موجود نیست" description="برای تعریف راننده، یک شخص فعال و بدون پروندهٔ رانندگی لازم است." />}
  </PageShell>;
}
