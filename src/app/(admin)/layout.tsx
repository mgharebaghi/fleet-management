import { Suspense, type ReactNode } from "react";
import { connection } from "next/server";

import { AdminShell } from "@/components/admin-shell/admin-shell";
import styles from "@/components/admin-shell/admin-shell.module.css";
import { readPendingTripRequestCount } from "@/features/trip/composition/trip-read-cache";

const numberFormatter = new Intl.NumberFormat("fa-IR");

async function PendingTripRequestsBadge() {
  await connection();
  const count = await readPendingTripRequestCount();
  if (count <= 0) {
    return null;
  }

  return (
    <span
      className={styles.navBadge}
      aria-label={`${numberFormatter.format(count)} درخواست جدید`}
    >
      {numberFormatter.format(count)}
    </span>
  );
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <AdminShell
      tripBadge={
        <Suspense fallback={null}>
          <PendingTripRequestsBadge />
        </Suspense>
      }
      tripQueueBadge={
        <Suspense fallback={null}>
          <PendingTripRequestsBadge />
        </Suspense>
      }
    >
      {children}
    </AdminShell>
  );
}
