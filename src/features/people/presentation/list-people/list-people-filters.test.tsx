import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  ListPeopleFilters,
  navigateToStatus,
  scheduleSearchNavigation,
  synchronizeFilterState,
} from "./list-people-filters";

const navigation = vi.hoisted(() => ({
  pathname: "/people",
  query: "",
  replace: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => navigation.pathname,
  useRouter: () => ({ replace: navigation.replace }),
  useSearchParams: () => new URLSearchParams(navigation.query),
}));

describe("ListPeopleFilters", () => {
  beforeEach(() => {
    navigation.pathname = "/people";
    navigation.query = "";
    navigation.replace.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders its initial search and status from URL-derived props", () => {
    navigation.query = "search=Ali&status=inactive";

    const markup = renderToStaticMarkup(
      <ListPeopleFilters
        initialSearch="Ali"
        initialStatus="inactive"
        hasCriteria
      />,
    );

    expect(markup).toContain('name="search"');
    expect(markup).toContain('value="Ali"');
    expect(markup).toMatch(
      /<option value="inactive" selected="">غیرفعال<\/option>/,
    );
    expect(markup).toContain('href="/people"');
  });

  it("reflects externally changed URL props in rendered control state", () => {
    navigation.query = "search=Maryam&status=all";

    const markup = renderToStaticMarkup(
      <ListPeopleFilters
        initialSearch="Maryam"
        initialStatus="all"
        hasCriteria
      />,
    );

    expect(markup).toContain('value="Maryam"');
    expect(markup).toMatch(/<option value="all" selected="">همه<\/option>/);
  });

  it("replaces a local draft when external URL values change", () => {
    expect(
      synchronizeFilterState(
        {
          sourceSearch: "Ali",
          sourceStatus: "active",
          search: "Ali Reza",
          status: "active",
        },
        "Maryam",
        "inactive",
      ),
    ).toEqual({
      sourceSearch: "Maryam",
      sourceStatus: "inactive",
      search: "Maryam",
      status: "inactive",
    });
  });

  it("preserves a local draft while its URL source is unchanged", () => {
    const localDraft = {
      sourceSearch: "Ali",
      sourceStatus: "active" as const,
      search: "Ali Reza",
      status: "active" as const,
    };

    expect(synchronizeFilterState(localDraft, "Ali", "active")).toBe(
      localDraft,
    );
  });

  it("navigates after 400ms with raw search and preserved query state", () => {
    vi.useFakeTimers();
    const navigate = vi.fn();
    const cancel = scheduleSearchNavigation({
      pathname: "/people",
      searchParams: new URLSearchParams(
        "status=inactive&page=4&view=compact",
      ),
      search: "  Ali  ",
      navigate,
    });

    vi.advanceTimersByTime(399);
    expect(navigate).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(navigate).toHaveBeenCalledWith(
      "/people?status=inactive&view=compact&search=++Ali++",
    );

    cancel();
  });

  it("removes search and resets page when search becomes empty", () => {
    vi.useFakeTimers();
    const navigate = vi.fn();
    scheduleSearchNavigation({
      pathname: "/people",
      searchParams: new URLSearchParams(
        "search=Ali&status=all&page=3&view=compact",
      ),
      search: "",
      navigate,
    });

    vi.advanceTimersByTime(400);

    expect(navigate).toHaveBeenCalledWith(
      "/people?status=all&view=compact",
    );
  });

  it("cancels stale debounced navigation during cleanup", () => {
    vi.useFakeTimers();
    const navigate = vi.fn();
    const cancel = scheduleSearchNavigation({
      pathname: "/people",
      searchParams: new URLSearchParams("status=active&page=2"),
      search: "Ali",
      navigate,
    });

    cancel();
    vi.advanceTimersByTime(400);

    expect(navigate).not.toHaveBeenCalled();
  });

  it("navigates immediately for status while preserving search and other params", () => {
    const navigate = vi.fn();

    navigateToStatus({
      pathname: "/people",
      searchParams: new URLSearchParams(
        "search=Old&page=5&view=compact",
      ),
      status: "inactive",
      search: "Ali",
      navigate,
    });

    expect(navigate).toHaveBeenCalledWith(
      "/people?search=Ali&view=compact&status=inactive",
    );
  });
});
