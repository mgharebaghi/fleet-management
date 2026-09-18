import Link from "next/link";

import { PageHeader } from "@/components/ui/page-header/page-header";
import { PageShell } from "@/components/ui/page-shell/page-shell";
import styles from "./trip-pages.module.css";

export function TripsLandingPage() {
  return (
    <PageShell>
      <PageHeader
        eyebrow="مدیریت سفر"
        title="سفرها"
        description="ثبت و مدیریت درخواست‌ها و سفرهای انجام‌شده"
      />
      <div className={styles.landing}>
        <Link href="/trips/create" className={styles.landingCard}>
          <span className={styles.landingIcon} aria-hidden="true">
            +
          </span>
          <strong>ثبت درخواست سفر</strong>
          <span>ایجاد درخواست جدید و افزودن مسافران</span>
        </Link>
        <Link href="/trips/requests" className={styles.landingCard}>
          <span className={styles.landingIcon} aria-hidden="true">
            ≡
          </span>
          <strong>مشاهده سفرها</strong>
          <span>فهرست درخواست‌ها و پرونده‌های سفر</span>
        </Link>
      </div>
    </PageShell>
  );
}
