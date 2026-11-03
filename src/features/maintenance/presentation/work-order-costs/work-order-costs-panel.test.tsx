import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import type { WorkOrderTask } from "../../application/work-order-tasks/work-order-task-records";
import type { WorkOrderPart } from "../../application/work-order-parts/work-order-part-records";
vi.mock("next/link", () => ({ default: ({ children, href, ...props }: { children: ReactNode; href: string }) => <a href={href} {...props}>{children}</a>, useLinkStatus: () => ({ pending: false }) }));
import { WorkOrderCostsPanel } from "./work-order-costs-panel";
const render = (tasks: Array<{ laborCost: string | null }>, items: Array<{ quantity: string; unitPrice: string | null; totalPrice: string | null }>) => renderToStaticMarkup(<WorkOrderCostsPanel orderId={7} tasks={tasks as WorkOrderTask[]} items={items as WorkOrderPart[]} />);
it("shows exact combined totals and named source links through shared table and mobile cards", () => {
  const html = render([{ laborCost: "1000.01" }], [{ quantity: "1.01", unitPrice: "2.03", totalPrice: "2.0503" }]);
  expect(html).toContain("1,002.0603"); expect(html).toContain("همهٔ مبلغ‌ها مشخص است");
  expect(html).toMatch(/<strong><span[^>]*>1,002\.0603<\/span> تومان<\/strong>/);
  expect(html).toContain('href="/maintenance/work-orders/7/tasks"'); expect(html).toContain('href="/maintenance/work-orders/7/parts"');
  expect(html).toContain('aria-label="بررسی اجرت کارها"'); expect(html).toContain('aria-label="بررسی قیمت قطعات"');
});
it("shows empty and entirely unknown costs without presenting either as zero", () => {
  expect(render([], [])).toContain("هنوز کار یا قطعه‌ای ثبت نشده است");
  const html = render([{ laborCost: null }], []);
  expect(html).toContain("هزینه‌ها کامل نیست"); expect(html).toContain("هنوز مشخص نیست"); expect(html).not.toContain("0.0000");
});
it("makes a partial sum explicit and renders invalid amounts as errors", () => {
  const html = render([{ laborCost: "10.00" }, { laborCost: null }], []);
  expect(html).toContain("10.0000"); expect(html).toContain("هزینه‌ها کامل نیست"); expect(html).toContain("۱ مورد");
  const invalid = render([{ laborCost: "invalid" }], []);
  expect(invalid).toContain('role="alert"'); expect(invalid).toContain("قابل محاسبه نیست"); expect(invalid).not.toContain("0.0000");
});
