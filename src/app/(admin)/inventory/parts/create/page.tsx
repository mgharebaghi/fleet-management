import { PartRecordPage } from "@/features/inventory/presentation/parts/details/part-record-page";
export const dynamic="force-dynamic";
export const metadata={title:"ثبت قطعه"};
export default async function PartRoute(){return <PartRecordPage />;}
