import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { PageHeader } from "./page-header";

describe("PageHeader", () => {
  it("carries the product brand on every page without being asked to", () => {
    const markup = renderToStaticMarkup(
      <PageHeader eyebrow="مدیریت ناوگان" title="خودروها" />,
    );

    expect(markup).toContain("نشان سامانه مدیریت ناوگان");
  });

  it("names the page through a heading the shell can point at", () => {
    const markup = renderToStaticMarkup(
      <PageHeader
        eyebrow="مدیریت اشخاص"
        title="ثبت شخص جدید"
        titleId="create-person-title"
        description="اطلاعات فردی و سازمانی شخص را وارد کنید."
      />,
    );

    expect(markup).toContain('<h1 id="create-person-title">ثبت شخص جدید</h1>');
    expect(markup).toContain("مدیریت اشخاص");
    expect(markup).toContain("اطلاعات فردی و سازمانی شخص را وارد کنید.");
  });

  it("renders the page action with the product brand", () => {
    const markup = renderToStaticMarkup(
      <PageHeader
        eyebrow="مدیریت اشخاص"
        title="فهرست اشخاص"
        action={<a href="/people/create">افزودن شخص</a>}
      />,
    );

    expect(markup).toContain("نشان سامانه مدیریت ناوگان");
    expect(markup).toContain("افزودن شخص");
    expect(markup).toContain("فهرست اشخاص");
  });
});
