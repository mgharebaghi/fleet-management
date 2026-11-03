import { StatusBadge } from "../../../../../components/ui/status-badge/status-badge";
import { IconActionGroup, IconActionLink } from "../../../../../components/ui/icon-action-button/icon-action-button";
import { EditIcon, ViewIcon } from "../../../../../components/ui/icon/icons";
export function MaintenanceActivity({ active }: { active: boolean }) { return <StatusBadge label={active ? "فعال" : "غیرفعال"} tone={active ? "positive" : "negative"} />; }
export function MaintenanceRowLinks({ name, href }: { name: string; href: string }) {
  return <IconActionGroup><IconActionLink label={`مشاهده پروندهٔ ${name}`} href={href} icon={<ViewIcon />} /><IconActionLink label={`ویرایش ${name}`} href={`${href}/edit`} icon={<EditIcon />} /></IconActionGroup>;
}
export { RecordSummary as MaintenanceRecordSummary } from "../../../../../components/ui/record-summary/record-summary";
