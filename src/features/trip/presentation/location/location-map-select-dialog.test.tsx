import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import type { TripLocationReference } from "../../application/trip-records";
import { LocationMapSelectDialog } from "./location-map-select-dialog";

vi.mock("../../../../maps/presentation/map-place.actions", () => ({
  loadMapConfiguration: vi.fn(),
}));

vi.mock("../../../../maps/presentation/map-canvas", () => ({
  MapCanvas: ({
    mode,
    markers,
    unavailableMessage,
  }: {
    mode: string;
    markers: { id: string }[];
    unavailableMessage: string;
  }) => (
    <p>
      {mode === "unavailable" ? unavailableMessage : "map"}
      {` markers:${markers.map((marker) => marker.id).join(",")}`}
    </p>
  ),
}));

const locations: TripLocationReference[] = [
  {
    locationId: 1,
    locationCode: "HQ",
    locationName: "دفتر مرکزی",
    locationType: "دفتر مرکزی",
    address: "تهران",
    latitude: "35.700000",
    longitude: "51.400000",
    isActive: true,
  },
  {
    locationId: 2,
    locationCode: null,
    locationName: "انبار بدون مختصات",
    locationType: "انبار",
    address: null,
    latitude: null,
    longitude: null,
    isActive: true,
  },
];

describe("saved location map dialog", () => {
  it("keeps an unmapped location selectable when the map is unavailable", () => {
    const markup = renderToStaticMarkup(
      <LocationMapSelectDialog
        idPrefix="origin"
        locations={locations}
        selectedLocationId="2"
        mapKey={null}
        onClose={() => {}}
        onConfirm={() => {}}
      />,
    );

    expect(markup).toContain("انتخاب مکان");
    expect(markup).toContain("انبار بدون مختصات");
    expect(markup).toContain("دفتر مرکزی");
    expect(markup).toContain("مختصات برای این مکان ثبت نشده است.");
    expect(markup).toContain("انتخاب این مکان");
    expect(markup).toContain(
      "نقشه موقتاً در دسترس نیست؛ می‌توانید مکان را از فهرست انتخاب کنید.",
    );
    expect(markup).toContain("markers:1");
    expect(markup).not.toContain("markers:2");
    expect(markup).not.toContain("api.neshan.org");
  });
});
