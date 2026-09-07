import { DriversPage } from "@/features/drivers/presentation/driver-pages";
export const metadata = { title: "رانندگان" };
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <DriversPage searchParams={await searchParams} />;
}
