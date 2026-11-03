import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import type { WorkTaskSnapshot } from "../../../application/work-order-tasks/work-order-task-records";
import type { WorkPartSnapshot } from "../../../application/work-order-parts/work-order-part-records";
vi.mock("./complete-work-order-button", () => ({ CompleteWorkOrderButton: () => <button>ثبت پایان تعمیر</button> }));
vi.mock("./start-work-order-button", () => ({ StartWorkOrderButton: () => <button>شروع تعمیر</button> }));
vi.mock("./cancel-work-order-button", () => ({ CancelWorkOrderButton: () => <button>لغو پروندهٔ تعمیر</button> }));
vi.mock("@/components/ui/action-link/action-link", () => ({ ActionLink: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a> }));
vi.mock("@/components/ui/status-badge/status-badge", () => ({ StatusBadge: ({ label }: { label: string }) => <span>{label}</span> }));
import { WorkOrderSidebar } from "./work-order-sidebar";
const base = { order: { id: 7, status: "Open", origin: "Request", diagnosis: null, startedAt: null, endedAt: null, requestId: 8 }, tasks: [], technicians: [] } as unknown as WorkTaskSnapshot;
const parts = { items: [] } as unknown as WorkPartSnapshot;
const render = (snapshot = base, partSnapshot = parts, section: "details" | "tasks" | "parts" | "costs" = "details") => renderToStaticMarkup(<WorkOrderSidebar snapshot={snapshot} parts={partSnapshot} section={section} />);
it("keeps the sidebar concise without task/part previews or duplicate creation controls", () => {
  const html = render();
  expect(html).toContain('aria-label="خلاصهٔ پرونده"'); expect(html).not.toContain("اقدام بعدی");
  expect(html).not.toContain("کارها و اجرت"); expect(html).not.toContain("قطعات مصرف‌شده"); expect(html).not.toContain("ثبت کار");
  expect(html).not.toContain("جمع مبلغ‌های مشخص‌شده");
});
it("retains a bold exact total across all costs without showing their individual rows", () => {
  const tasks = [{ title: "Private task title", status: "Open", laborCost: "12.34" }] as WorkTaskSnapshot["tasks"];
  const items = [{ quantity: "1.01", unitPrice: "2.03", totalPrice: "2.0503" }] as WorkPartSnapshot["items"];
  const html = render({ ...base, tasks }, { ...parts, items });
  expect(html).toMatch(/<strong[^>]*><span[^>]*>14\.3903<\/span> تومان<\/strong>/);
  expect(html).not.toContain("Private task title");
});
it("distinguishes unknown/invalid amounts and explicit zero", () => {
  const html = render({ ...base, tasks: [{ laborCost: null }] as WorkTaskSnapshot["tasks"] });
  expect(html).toContain("هنوز مشخص نیست"); expect(html).toContain("هزینه‌ها کامل نیست"); expect(html).not.toContain("0.0000");
  expect(render({ ...base, tasks: [{ laborCost: "0" }] as WorkTaskSnapshot["tasks"] })).toContain("0.0000");
  expect(render({ ...base, tasks: [{ laborCost: "invalid" }] as WorkTaskSnapshot["tasks"] })).toContain("قابل محاسبه نیست");
});
it("shows operations only in the information tab and hides the entire section during repair", () => {
  expect(render()).toContain("عملیات پرونده"); expect(render()).toContain("/edit");
  for (const section of ["details", "tasks", "parts", "costs"] as const) {
    const started = render({ ...base, order: { ...base.order, status: "InProgress", startedAt: "2026-11-03T08:00:00Z" } }, parts, section);
    expect(started).not.toContain("عملیات پرونده"); expect(started).not.toContain("/edit"); expect(started).not.toContain("لغو پروندهٔ تعمیر"); expect(started).not.toContain("شروع تعمیر"); expect(started).toContain("ثبت پایان تعمیر");
    expect(render(base, parts, section)).toContain("شروع تعمیر");
    if (section !== "details") expect(render(base, parts, section)).not.toContain("عملیات پرونده");
  }
});

it("hides completion when repair has ended or the file state is not valid", () => {
  for (const status of ["Open", "Completed", "Cancelled", "External"]) expect(render({ ...base, order: { ...base.order, status } })).not.toContain("ثبت پایان تعمیر");
  expect(render({ ...base, order: { ...base.order, status: "InProgress", startedAt: "2026-11-03T08:00:00Z", endedAt: "2026-11-03T09:00:00Z" } })).not.toContain("ثبت پایان تعمیر");
});
