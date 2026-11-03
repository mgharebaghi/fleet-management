import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ get: vi.fn(), references: vi.fn() }));
vi.mock("../../../composition/maintenance-request.factory", () => ({ makeMaintenanceRequests: () => mocks }));
vi.mock("next/link", () => ({ default: ({ children, href }: { children: ReactNode; href: string }) => <a href={href}>{children}</a>, useLinkStatus: () => ({ pending: false }) }));
vi.mock("./maintenance-request-form", () => ({ MaintenanceRequestForm: () => <form data-request-form /> }));
import { MaintenanceRequestFormPage } from "./maintenance-request-form-page";
const vehicle = { id: 1, code: "V1", isActive: false, brandName: "Brand", modelName: "Model", plateNoLeftSide: "12", plateNoCenterChar: null, plateNoRightSide: null, plateNoIranNo: null };
const type = { id: 2, code: "T1", name: "Type", isActive: false };
beforeEach(() => vi.resetAllMocks());
it("links missing prerequisites directly to their creation routes", async () => {
  mocks.references.mockResolvedValue({ vehicles: [], types: [] });
  const html = renderToStaticMarkup(await MaintenanceRequestFormPage({}));
  expect(html).toContain('href="/fleet/vehicles/create"');
  expect(html).toContain('href="/maintenance/catalogs/create"');
  expect(html).not.toContain("data-request-form");
});
it("offers existing inactive records for activation rather than recreating them", async () => {
  mocks.references.mockResolvedValue({ vehicles: [vehicle], types: [type] });
  const html = renderToStaticMarkup(await MaintenanceRequestFormPage({}));
  expect(html).toContain('href="/fleet/vehicles?active=all"');
  expect(html).toContain('href="/maintenance/catalogs?active=all"');
  expect(html).toContain("خودروهای ثبت‌شده غیرفعال‌اند");
});
it("retains inactive historical references for edits but blocks closed request forms", async () => {
  const record = { id: 3, status: "Open", vehicle, type, orders: [] };
  mocks.references.mockResolvedValue({ vehicles: [vehicle], types: [type] }); mocks.get.mockResolvedValue(record);
  expect(renderToStaticMarkup(await MaintenanceRequestFormPage({ id: 3 }))).toContain("data-request-form");
  mocks.get.mockResolvedValue({ ...record, status: "Completed" });
  const html = renderToStaticMarkup(await MaintenanceRequestFormPage({ id: 3 }));
  expect(html).not.toContain("data-request-form"); expect(html).toContain("این درخواست قابل ویرایش نیست");
});
it("reports read failures without pretending references are absent", async () => {
  mocks.references.mockRejectedValue(new Error("Synthetic unavailable database"));
  const html = renderToStaticMarkup(await MaintenanceRequestFormPage({}));
  expect(html).toContain('role="alert"'); expect(html).not.toContain("data-request-form");
});
