import { afterEach, describe, expect, it, vi } from "vitest";

import {
  buildListFilterHref,
  scheduleListFilterNavigation,
  synchronizeListFilterDraft,
  hasListFilterCriteria,
  buildClearListFiltersHref,
} from "./list-filter-navigation";

describe("shared clear-filter rules", () => {
  it("compares only declared filters against feature-owned defaults", () => {
    const defaults = { search: "", active: "active" };
    expect(hasListFilterCriteria({ search: "  ", active: "active", page: "9" }, defaults)).toBe(false);
    expect(hasListFilterCriteria({ search: "Ali", active: "active" }, defaults)).toBe(true);
    expect(hasListFilterCriteria({ search: "", active: "all" }, defaults)).toBe(true);
  });
  it("clears all owned filters and paging while preserving unrelated parameters", () => {
    expect(buildClearListFiltersHref("/people", new URLSearchParams("search=Ali&status=all&page=9&view=compact&keep=1&keep=2"), { search: "", status: "active" })).toBe("/people?view=compact&keep=1&keep=2");
    expect(buildClearListFiltersHref("/drivers", new URLSearchParams("search=Ali&page=2"), { search: "" })).toBe("/drivers");
  });
});

describe("buildListFilterHref", () => {
  it("keeps unrelated query parameters and restarts paging", () => {
    expect(
      buildListFilterHref({
        pathname: "/people",
        searchParams: new URLSearchParams(
          "status=inactive&page=4&view=compact",
        ),
        updates: { search: "  Ali  " },
      }),
    ).toBe("/people?status=inactive&view=compact&search=++Ali++");
  });

  it("removes a filter whose value became empty", () => {
    expect(
      buildListFilterHref({
        pathname: "/fleet/vehicles",
        searchParams: new URLSearchParams("search=V-1&status=7&page=3"),
        updates: { search: "", status: "" },
      }),
    ).toBe("/fleet/vehicles");
  });

  it("writes several filters at once without losing the others", () => {
    expect(
      buildListFilterHref({
        pathname: "/fleet/vehicles",
        searchParams: new URLSearchParams("search=Old&page=5&view=compact"),
        updates: { search: "V-2", active: "all" },
      }),
    ).toBe("/fleet/vehicles?search=V-2&view=compact&active=all");
  });
});

describe("scheduleListFilterNavigation", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("navigates only once the typing pause has elapsed", () => {
    vi.useFakeTimers();
    const navigate = vi.fn();

    scheduleListFilterNavigation({
      pathname: "/people",
      searchParams: new URLSearchParams("status=all&page=3"),
      updates: { search: "Ali" },
      navigate,
    });

    vi.advanceTimersByTime(399);
    expect(navigate).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(navigate).toHaveBeenCalledWith("/people?status=all&search=Ali");
  });

  it("drops a superseded navigation when it is cancelled", () => {
    vi.useFakeTimers();
    const navigate = vi.fn();

    const cancel = scheduleListFilterNavigation({
      pathname: "/people",
      searchParams: new URLSearchParams("status=active&page=2"),
      updates: { search: "Ali" },
      navigate,
    });

    cancel();
    vi.advanceTimersByTime(400);

    expect(navigate).not.toHaveBeenCalled();
  });
});

describe("synchronizeListFilterDraft", () => {
  it("keeps a local draft while the URL it was typed against is unchanged", () => {
    const state = {
      source: { search: "Ali", status: "active" },
      draft: { search: "Ali Reza", status: "active" },
    };

    expect(synchronizeListFilterDraft(state, { search: "Ali", status: "active" })).toBe(
      state,
    );
  });

  it("adopts values changed elsewhere, replacing the stale draft", () => {
    expect(
      synchronizeListFilterDraft(
        {
          source: { search: "Ali", status: "active" },
          draft: { search: "Ali Reza", status: "active" },
        },
        { search: "Maryam", status: "inactive" },
      ),
    ).toEqual({
      source: { search: "Maryam", status: "inactive" },
      draft: { search: "Maryam", status: "inactive" },
    });
  });

  it("keeps a newer draft when an earlier navigation from this controller arrives", () => {
    expect(
      synchronizeListFilterDraft(
        {
          source: { search: "", status: "active" },
          draft: { search: "Ali Reza", status: "active" },
        },
        { search: "Ali", status: "active" },
        ["search"],
      ),
    ).toEqual({
      source: { search: "Ali", status: "active" },
      draft: { search: "Ali Reza", status: "active" },
    });
  });
});
