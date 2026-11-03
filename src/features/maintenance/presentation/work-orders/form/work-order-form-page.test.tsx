import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ get: vi.fn(), references: vi.fn() }));
vi.mock("../../../composition/work-order.factory", () => ({ makeWorkOrders: () => mocks }));
vi.mock("next/link", () => ({ default: ({ children, href }: { children: ReactNode; href: string }) => <a href={href}>{children}</a>, useLinkStatus: () => ({ pending: false }) }));
vi.mock("./work-order-form", () => ({ WorkOrderForm: () => <form data-order-form /> }));
import { WorkOrderFormPage } from "./work-order-form-page";
beforeEach(() => { vi.resetAllMocks(); mocks.references.mockResolvedValue({ vehicles: [{ isActive: true }], types: [{ isActive: true }], workshops: [], requests: [], plans: [] }); });
it("keeps invalid or closed sources from silently becoming a direct registration", async () => {
  const html = renderToStaticMarkup(await WorkOrderFormPage({ selectedSource: { kind: "Request", id: 99 } }));
  expect(html).toContain("منشأ انتخاب‌شده قابل استفاده نیست"); expect(html).not.toContain("data-order-form");
  expect(renderToStaticMarkup(await WorkOrderFormPage({ invalidSource: true }))).not.toContain("data-order-form");
});
it("links missing prerequisites to actual creation routes and blocks closed edit pages", async () => {
  mocks.references.mockResolvedValue({ vehicles: [], types: [], workshops: [], requests: [], plans: [] });
  const html = renderToStaticMarkup(await WorkOrderFormPage({})); expect(html).toContain('href="/fleet/vehicles/create"'); expect(html).toContain('href="/maintenance/catalogs/create"');
  mocks.get.mockResolvedValue({ id: 3, status: "Completed", origin: "Direct" });
  expect(renderToStaticMarkup(await WorkOrderFormPage({ id: 3 }))).toContain("این پرونده قابل ویرایش نیست");
});
it("renders a form only when required references are available, and reports read failures honestly", async () => {
  expect(renderToStaticMarkup(await WorkOrderFormPage({}))).toContain("data-order-form");
  mocks.references.mockRejectedValue(new Error("Synthetic unavailable database"));
  expect(renderToStaticMarkup(await WorkOrderFormPage({}))).toContain('role="alert"');
  expect(renderToStaticMarkup(await WorkOrderFormPage({ selectedSource: { kind: "Request", id: 5 } }))).toContain('href="/maintenance/work-orders/create?requestId=5"');
});
