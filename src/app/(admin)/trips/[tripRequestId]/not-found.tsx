import { ActionLink } from "@/components/ui/action-link/action-link";
import { PageHeader } from "@/components/ui/page-header/page-header";
import { PageShell } from "@/components/ui/page-shell/page-shell";
import { ResultState } from "@/components/ui/result-state/result-state";

export default function NotFound() {
  return (
    <PageShell width="narrow">
      <PageHeader
        eyebrow="مدیریت سفر"
        title="پرونده سفر"
        description="درخواست یا انتخاب مرتبط با قبض سفر پیدا نشد."
      />
      <ResultState
        title="اطلاعات سفر موجود نیست"
        description="ممکن است درخواست حذف شده باشد یا تخصیص انتخاب‌شده در زمان سفر فعال نباشد."
        action={
          <ActionLink href="/trips/requests" variant="primary">
            بازگشت به سفرها
          </ActionLink>
        }
      />
    </PageShell>
  );
}
