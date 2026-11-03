import type { ReactNode } from "react";
import { RecordTabs, type RecordTab } from "../../../../components/ui/record-tabs/record-tabs";
import { AdminNavIcon } from "../../../../components/admin-shell/admin-nav-icons";
import { CheckIcon, ViewIcon, WarningIcon } from "../../../../components/ui/icon/icons";
import { WORKSPACE_TAB_LABELS, WORKSPACE_TAB_ORDER, workspaceFinalTabMeta, workspaceTabHref, type WorkspaceSectionId } from "./trip-workspace-view";

export function TripWorkspaceTabs({ tripRequestId, activeSection, tripRequestStatus = "New", children }: { tripRequestId: number; activeSection: WorkspaceSectionId; tripRequestStatus?: string; children?: ReactNode }) {
  const tabs: RecordTab[] = WORKSPACE_TAB_ORDER.map(section => {
    const finalMeta = section === "completion" ? workspaceFinalTabMeta(tripRequestStatus) : null;
    const icon = section === "details" ? <ViewIcon /> : section === "passengers" ? <AdminNavIcon name="people" /> : section === "assignment" ? <AdminNavIcon name="drivers" /> : section === "route" ? <AdminNavIcon name="fleet" /> : finalMeta?.iconName === "check" ? <CheckIcon /> : finalMeta?.iconName === "warning" ? <WarningIcon /> : <AdminNavIcon name="trips" />;
    return { id: section, href: workspaceTabHref(tripRequestId, section), label: finalMeta?.label ?? WORKSPACE_TAB_LABELS[section], tone: finalMeta?.tone, icon };
  });
  return <RecordTabs label="بخش‌های پرونده سفر" active={activeSection} tabs={tabs}>{children}</RecordTabs>;
}
