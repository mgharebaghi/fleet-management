import { describe, expect, it } from "vitest";

import { filterSearchableOptions } from "../../../../components/ui/searchable-select/searchable-select-options";
import type { TripLocationReference } from "../../application/trip-records";
import {
  focusForSavedLocation,
  savedLocationChoices,
  savedLocationMarkers,
} from "./location-map-selection";

const locationA: TripLocationReference = {
  locationId: 1,
  locationCode: "HQ",
  locationName: "دفتر مرکزی",
  locationType: "دفتر مرکزی",
  address: "تهران",
  latitude: "35.700000",
  longitude: "51.400000",
  isActive: true,
};

const locationB: TripLocationReference = {
  locationId: 2,
  locationCode: null,
  locationName: "انبار بدون مختصات",
  locationType: "انبار",
  address: "کرج",
  latitude: null,
  longitude: null,
  isActive: true,
};

const locationC: TripLocationReference = {
  locationId: 3,
  locationCode: "ISF",
  locationName: "شرکت اصفهان",
  locationType: "شرکت تابعه",
  address: "اصفهان",
  latitude: "32.654000",
  longitude: "51.668000",
  isActive: true,
};

const locations = [locationA, locationB, locationC];

describe("saved location map selection", () => {
  const choices = savedLocationChoices(locations);

  it("maps only locations that have coordinates and keeps the others selectable", () => {
    expect(savedLocationMarkers(choices, "")).toEqual([
      {
        id: "1",
        coordinate: { latitude: "35.700000", longitude: "51.400000" },
        label: "دفتر مرکزی",
        selected: false,
      },
      {
        id: "3",
        coordinate: { latitude: "32.654000", longitude: "51.668000" },
        label: "شرکت اصفهان",
        selected: false,
      },
    ]);
    expect(choices.map((choice) => choice.locationId)).toEqual(["1", "2", "3"]);
    expect(choices[1]?.coordinate).toBeNull();
  });

  it("selects the location id of a clicked marker and focuses its coordinate", () => {
    const markers = savedLocationMarkers(choices, "3");
    const selected = markers.find((marker) => marker.selected);
    expect(selected?.id).toBe("3");
    expect(focusForSavedLocation(choices, selected?.id ?? "")).toEqual({
      latitude: "32.654000",
      longitude: "51.668000",
    });
  });

  it("filters saved locations locally and focuses a mapped result", () => {
    const options = choices.map((choice) => ({
      value: choice.locationId,
      label: choice.searchText,
      searchText: choice.searchText,
      content: choice.locationName,
    }));
    const matches = filterSearchableOptions(options, "اصفهان");
    expect(matches.map((match) => match.value)).toEqual(["3"]);
    expect(filterSearchableOptions(options, "انبار").map((match) => match.value)).toEqual([
      "2",
    ]);
    expect(focusForSavedLocation(choices, "3")).toEqual({
      latitude: "32.654000",
      longitude: "51.668000",
    });
  });

  it("keeps a location without coordinates confirmable and does not invent a point", () => {
    expect(focusForSavedLocation(choices, "2")).toBeNull();
    expect(savedLocationMarkers(choices, "2").some((marker) => marker.id === "2")).toBe(
      false,
    );
    expect(choices.find((choice) => choice.locationId === "2")?.locationName).toBe(
      "انبار بدون مختصات",
    );
  });

  it("marks the current mapped location selected and provides its focus", () => {
    expect(savedLocationMarkers(choices, "1").find((marker) => marker.selected)?.id).toBe(
      "1",
    );
    expect(focusForSavedLocation(choices, "1")).toEqual({
      latitude: "35.700000",
      longitude: "51.400000",
    });
  });

  it("does not let one selection rewrite another location id", () => {
    const origin = focusForSavedLocation(choices, "1");
    const destination = focusForSavedLocation(choices, "3");
    expect(origin).not.toEqual(destination);
    expect(savedLocationMarkers(choices, "1").filter((marker) => marker.selected)).toEqual([
      expect.objectContaining({ id: "1" }),
    ]);
    expect(savedLocationMarkers(choices, "3").filter((marker) => marker.selected)).toEqual([
      expect.objectContaining({ id: "3" }),
    ]);
  });
});
