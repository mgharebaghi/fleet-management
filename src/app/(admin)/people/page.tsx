import type { Metadata } from "next";

import { ListPeoplePage } from "@/features/people/presentation/list-people/list-people-page";

export const metadata: Metadata = {
  title: "اشخاص",
  description: "نمایش و جستجوی اشخاص سامانه مدیریت ناوگان",
};

export default async function PeoplePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <ListPeoplePage searchParams={await searchParams} />;
}
