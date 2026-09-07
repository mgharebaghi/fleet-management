import type { Metadata } from "next";

import { UpdatePersonPage } from "@/features/people/presentation/update-person/update-person-page";

export const metadata: Metadata = { title: "ویرایش شخص" };

export default async function EditPersonPage({
  params,
}: {
  params: Promise<{ personId: string }>;
}) {
  return <UpdatePersonPage personId={Number((await params).personId)} />;
}
