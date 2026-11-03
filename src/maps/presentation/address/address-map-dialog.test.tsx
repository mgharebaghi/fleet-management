import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { AddressMapDialog } from "./address-map-dialog";
vi.mock("../map-place.actions", () => ({ loadMapConfiguration: vi.fn(), searchMapPlaces: vi.fn(), reverseMapPoint: vi.fn() }));
describe("address map fallback", () => {
  it("retains manual entry guidance and disables confirmation without a provider address", () => {
    const markup = renderToStaticMarkup(<AddressMapDialog mapKey={null} onClose={() => {}} onConfirm={() => {}} />);
    expect(markup).toContain("نقشه در دسترس نیست؛ نشانی را در فرم دستی وارد کنید.");
    expect(markup).toContain("استفاده از این نشانی");
    expect(markup).toMatch(/<button[^>]*disabled=""[^>]*>[\s\S]*?استفاده از این نشانی/);
    expect(markup).not.toContain('type="submit"');
    expect(markup).not.toContain("api.neshan.org");
  });
});
