import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ units: vi.fn(), categories: vi.fn() }));
vi.mock("../../../composition/inventory-reference.factory", () => ({ makeReadInventoryReferences: () => mocks }));
vi.mock("../../../composition/part.factory", () => ({ makeManageParts: () => ({}) }));
vi.mock("next/link", () => ({ default: ({ children, href }: { children: ReactNode; href: string }) => <a href={href}>{children}</a>, useLinkStatus: () => ({ pending: false }) }));
vi.mock("../form/part-form", () => ({ PartForm: () => <form data-part-form /> }));
import { PartRecordPage } from "./part-record-page";

beforeEach(() => { vi.resetAllMocks(); mocks.categories.mockResolvedValue([]); });
it("directs a first-time user to define a unit before showing the part form", async () => {
  mocks.units.mockResolvedValue([]);
  const html = renderToStaticMarkup(await PartRecordPage({}));
  expect(html).toContain("ابتدا واحد شمارش تعریف کنید");
  expect(html).toContain('href="/inventory/catalogs"');
  expect(html).not.toContain("data-part-form");
});
it("allows part creation with a unit and no categories, because categories are optional", async () => {
  mocks.units.mockResolvedValue([{ id: 1, name: "Item", symbol: null }]);
  const html = renderToStaticMarkup(await PartRecordPage({}));
  expect(html).toContain("data-part-form");
});
