import { PartRecordPage } from "@/features/inventory/presentation/parts/details/part-record-page";
export const dynamic="force-dynamic";
export const metadata={title:"اطلاعات قطعه"};
export default async function PartRoute({params}:{params:Promise<{partId:string}>}){return <PartRecordPage partId={Number((await params).partId)} />;}
