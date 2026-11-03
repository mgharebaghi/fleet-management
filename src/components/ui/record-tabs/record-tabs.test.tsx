import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("../navigation-link/navigation-link", () => ({ NavigationLink: ({ children, href, scroll, ...props }: { children: ReactNode; href: string; scroll?: boolean }) => { void scroll; return <a href={href} {...props}>{children}</a>; } }));
import { RecordTabs } from "./record-tabs";
it("shares named page links, current-page state and a scoped loading panel without domain semantics", () => {
  const html = renderToStaticMarkup(<RecordTabs label="Record sections" active="tasks" tabs={[{ id: "details", label: "Details", href: "/records/1" }, { id: "tasks", label: "Tasks", href: "/records/1/tasks", tone: "warning" }]}><p>Content</p></RecordTabs>);
  expect(html).toContain('aria-label="Record sections"'); expect(html).toContain('href="/records/1/tasks"'); expect(html).toContain('aria-current="page"'); expect(html).toContain('data-tone="warning"'); expect(html).toContain("data-loading-panel"); expect(html).toContain("Content");
});
