import { BackLink } from "@/components/ui/back-link/back-link";
import { PageHeader } from "@/components/ui/page-header/page-header";
import { PageShell } from "@/components/ui/page-shell/page-shell";
import { ResultState } from "@/components/ui/result-state/result-state";
import { makeReadTrips } from "../../composition/trip.factory";
import { CreateTripRequestForm } from "./create-trip-request-form";

export async function CreateTripRequestPage() {
  const reader = makeReadTrips();
  const [requestTypes, people, locations] = await Promise.all([
    reader.requestTypes(),
    reader.availablePeople(),
    reader.availableLocations(),
  ]);

  const blocked =
    requestTypes.length === 0
      ? {
          title: "نوع درخواست موجود نیست",
          description:
            "نوع‌های درخواست هنوز پیکربندی نشده‌اند؛ با مدیر سامانه تماس بگیرید.",
        }
      : people.length === 0
        ? {
            title: "مسافر فعالی موجود نیست",
            description: "برای ثبت درخواست، حداقل یک شخص فعال لازم است.",
          }
        : null;

  return (
    <PageShell>
      {blocked ? (
        <>
          <PageHeader
            eyebrow="مدیریت سفر"
            title="ثبت درخواست سفر"
            action={<BackLink href="/trips/requests" label="بازگشت به سفرها" />}
            compactAction
          />
          <ResultState title={blocked.title} description={blocked.description} />
        </>
      ) : (
        <CreateTripRequestForm
          requestTypes={requestTypes}
          people={people}
          locations={locations}
        />
      )}
    </PageShell>
  );
}
