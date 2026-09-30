import { expect, test, type Page } from "@playwright/test";

/** Capture only pages containing this suite's synthetic records or empty forms. */
export async function captureResponsiveThemes(page: Page, name: string) {
  const initialViewport = page.viewportSize();
  const initialTheme = await page.locator("html").getAttribute("data-theme");
  for (const theme of ["light", "dark"] as const) {
    let current = await page.locator("html").getAttribute("data-theme");
    if (current === null && theme === "light") {
      await page.getByRole("button", { name: "تغییر تم" }).click();
      await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
      current = "dark";
    }
    if ((current === "dark" ? "dark" : "light") !== theme) {
      await page.getByRole("button", { name: "تغییر تم" }).click();
    }
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
    for (const viewport of [{ width: 1280, height: 720 }, { width: 390, height: 844 }]) {
      await page.setViewportSize(viewport);
      await page.evaluate(() => document.fonts.ready);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
      await page.screenshot({ path: test.info().outputPath(`${name}-${theme}-${viewport.width}.png`), fullPage: true, animations: "disabled" });
    }
  }
  if ((await page.locator("html").getAttribute("data-theme") === "dark") !== (initialTheme === "dark")) {
    await page.getByRole("button", { name: "تغییر تم" }).click();
  }
  if (initialViewport) await page.setViewportSize(initialViewport);
}
