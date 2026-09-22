import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import type { CreateLocationActionState } from "./location.actions";
import {
  actionStateForDialogSession,
  LocationCreateDialog,
} from "./location-create-dialog";

vi.mock("./location.actions", () => ({
  createLocationAction: vi.fn(),
}));

vi.mock("../../../../maps/presentation/map-place.actions", () => ({
  loadMapConfiguration: vi.fn(),
  searchMapPlaces: vi.fn(),
  reverseMapPoint: vi.fn(),
}));

vi.mock("../../../../maps/presentation/map-canvas", () => ({
  MapCanvas: ({
    mode,
    unavailableMessage,
    loadingMessage,
  }: {
    mode: string;
    unavailableMessage: string;
    loadingMessage: string;
  }) => <p>{mode === "unavailable" ? unavailableMessage : loadingMessage}</p>,
}));

describe("Location create dialog", () => {
  it("keeps manual location entry available when the map is not configured", () => {
    const markup = renderToStaticMarkup(
      <LocationCreateDialog
        open
        pickerId="location"
        mapKey={null}
        onClose={() => {}}
        onCreated={() => {}}
      />,
    );

    expect(markup).toContain("ثبت مکان جدید");
    expect(markup).toContain("نام مکان");
    expect(markup).toContain("نوع مکان");
    expect(markup).toContain("نشانی");
    expect(markup).toContain("عرض جغرافیایی");
    expect(markup).toContain("طول جغرافیایی");
    expect(markup).toContain("توضیحات");
    expect(markup).toContain('dir="ltr"');
    expect(markup).toContain(
      "سرویس نقشه موقتاً در دسترس نیست؛ می‌توانید اطلاعات مکان را دستی ثبت کنید.",
    );
    expect(markup).not.toContain("<select");
    expect(markup).toContain("ثبت و انتخاب مکان");
    expect(markup).not.toContain("نام مکان را وارد کنید.");
  });

  it("drops the previous create error when a new dialog session opens", () => {
    let actionState: CreateLocationActionState = {};

    actionState = actionStateForDialogSession(true, actionState);
    expect(actionState).toEqual({});

    const validationError: CreateLocationActionState = {
      error: "LOCATION_NAME_REQUIRED",
      field: "locationName",
      values: { locationName: "", address: "نشانی دستی" },
    };
    actionState = actionStateForDialogSession(false, validationError);
    expect(actionState).toBe(validationError);

    actionState = actionStateForDialogSession(true, actionState);
    expect(actionState).toEqual({});

    const markup = renderToStaticMarkup(
      <LocationCreateDialog
        open
        pickerId="location"
        mapKey={null}
        onClose={() => {}}
        onCreated={() => {}}
      />,
    );
    expect(markup).not.toContain("نام مکان را وارد کنید.");

    const serverError: CreateLocationActionState = {
      error: "UNEXPECTED",
      values: { locationName: "دفتر" },
    };
    expect(actionStateForDialogSession(false, serverError)).toBe(serverError);
    expect(actionStateForDialogSession(true, serverError)).toEqual({});
  });
});
