import type { Metadata } from "next";

import { CreatePersonForm } from "@/features/people/presentation/create-person/form/create-person-form";

export const metadata: Metadata = {
  title: "ثبت شخص جدید",
  description: "ثبت اطلاعات شخص جدید در سامانه مدیریت ناوگان",
};

export default function CreatePersonPage() {
  return <CreatePersonForm />;
}
