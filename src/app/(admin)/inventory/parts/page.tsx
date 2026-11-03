import { PartsPage } from "@/features/inventory/presentation/parts/list/parts-page";
import type { PartListSearchParams } from "@/features/inventory/presentation/parts/list/part-list-navigation";
export const dynamic="force-dynamic";
export const metadata={title:"قطعات"};
export default async function PartsRoute({searchParams}:{searchParams:Promise<PartListSearchParams>}){return <PartsPage searchParams={await searchParams}/>;}
