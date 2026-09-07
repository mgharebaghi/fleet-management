import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { AdminShell } from "./admin-shell";

function renderShell() {
  return renderToStaticMarkup(
    <AdminShell>
      <p>محتوای صفحه</p>
    </AdminShell>,
  );
}

describe("AdminShell", () => {
  it("renders every top-level section as a link", () => {
    const markup = renderShell();

    expect(markup).toContain('href="/people"');
    expect(markup).toContain('href="/fleet/vehicles"');
    expect(markup).toContain('href="/fleet/vehicle-insurances"');
    expect(markup).toContain('href="/fleet/catalogs"');
    expect(markup).toContain('href="/drivers"');
  });

  it("renders the page content it wraps", () => {
    expect(renderShell()).toContain("محتوای صفحه");
  });

  it("carries the product brand in the top bar", () => {
    expect(renderShell()).toContain("نشان سامانه مدیریت ناوگان");
  });

  it("offers the mobile navigation as a drawer that starts closed", () => {
    const markup = renderShell();

    // The drawer is the shared Dialog, which stays closed until opened: the
    // native element renders without an `open` attribute.
    expect(markup).toContain('aria-expanded="false"');
    expect(markup).toContain('id="admin-mobile-nav-panel"');
    expect(markup).toContain("پیمایش اصلی (موبایل)");
    expect(markup).not.toContain("<dialog open");
  });
});
