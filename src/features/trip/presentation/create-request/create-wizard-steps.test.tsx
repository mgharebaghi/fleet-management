import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { TripRequestReviewDialog } from "./trip-request-review-dialog";

const noop = () => {};

describe("Trip create review dialog", () => {
  it("reviews human-readable names and submits only from confirmation", () => {
    const markup = renderToStaticMarkup(
      <TripRequestReviewDialog
        open
        titleId="review-title"
        formId="create-form"
        pending={false}
        review={{
          requestTypeName: "مبدأ و مقصد مشترک",
          purpose: "جلسه ستاد",
          requestAt: "۱۴۰۴/۰۱/۰۱، 08:00",
          travelAt: "۱۴۰۴/۰۱/۰۲، 08:00",
          commonOriginName: "تهران",
          commonDestinationName: "قم",
          description: null,
          passengers: [
            {
              personName: "علی رضایی",
              originName: "تهران",
              destinationName: "قم",
              pickup: null,
              pickupOrder: null,
              dropoffOrder: null,
              description: null,
            },
          ],
        }}
        onClose={noop}
      />,
    );

    expect(markup).toContain("مرور و تأیید درخواست سفر");
    expect(markup).toContain("<table");
    expect(markup).toContain("علی رضایی");
    expect(markup).toContain("تهران");
    expect(markup).toContain("قم");
    expect(markup).toContain("جلسه ستاد");
    expect(markup).not.toContain("personId");
    expect(markup).not.toContain("locationId");
    expect(markup).toContain('type="submit"');
    expect(markup).toContain('form="create-form"');
    expect(markup).toContain("تأیید و ثبت درخواست");
    expect(markup).toContain("بازگشت و ویرایش");
  });

  it("disables duplicate confirmation while the existing action is pending", () => {
    const markup = renderToStaticMarkup(
      <TripRequestReviewDialog
        open
        titleId="review-title"
        formId="create-form"
        pending
        review={{
          requestTypeName: "مبدأ و مقصد مشترک",
          purpose: null,
          requestAt: "",
          travelAt: "",
          commonOriginName: null,
          commonDestinationName: null,
          description: null,
          passengers: [],
        }}
        onClose={noop}
      />,
    );

    expect(markup).toContain("در حال ثبت…");
    expect(markup).toContain("disabled");
  });
});
