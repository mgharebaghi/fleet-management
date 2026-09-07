import type { Metadata } from "next";

import { PersonDetailsPage } from "@/features/people/presentation/person-details/person-details-page";

export const metadata: Metadata = { title: "پروندهٔ شخص" };

export default async function PersonPage({
  params,
}: {
  params: Promise<{ personId: string }>;
}) {
  return <PersonDetailsPage personId={Number((await params).personId)} />;
}
