import type { ReactNode } from "react";

import { AdminShell } from "@/components/admin-shell/admin-shell";
import { makeReadTrips } from "@/features/trip/composition/trip.factory";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const pendingTripRequestsCount = await makeReadTrips().countPendingRequests();

  return (
    <AdminShell pendingTripRequestsCount={pendingTripRequestsCount}>
      {children}
    </AdminShell>
  );
}
