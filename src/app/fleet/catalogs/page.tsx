import type { Metadata } from "next";

import { FleetCatalogsPage } from "@/features/fleet/presentation/catalogs/fleet-catalogs-page";

// Prisma reads aren't a fetch/Request-time API, so Next.js would otherwise
// prerender this route once at build time. Confirmed: this project doesn't
// enable cacheComponents, so `dynamic` (Previous Model) is still supported.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "اطلاعات پایه ناوگان",
  description: "مدیریت برند خودرو، نوع خودرو، نوع سوخت و وضعیت خودرو",
};

export default function FleetCatalogsRoutePage() {
  return <FleetCatalogsPage />;
}
