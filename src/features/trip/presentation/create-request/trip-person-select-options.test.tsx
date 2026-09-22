import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { TripPersonReference } from "../../application/trip-records";
import { tripPersonSelectOptions } from "./trip-person-select-options";

describe("tripPersonSelectOptions", () => {
  const people: TripPersonReference[] = [
    {
      personId: 1,
      firstName: "علی",
      lastName: "رضایی",
      personnelNo: "P-100",
      nationalCode: "0012345678",
      mobile: "09120000000",
      isActive: true,
    },
    {
      personId: 2,
      firstName: "مریم",
      lastName: "احمدی",
      personnelNo: "P-200",
      nationalCode: null,
      mobile: null,
      isActive: true,
    },
  ];

  it("searches by name, national code, and mobile without showing personnel number", () => {
    const options = tripPersonSelectOptions(people);
    const ali = options[0];

    expect(ali.searchText).toContain("0012345678");
    expect(ali.searchText).toContain("09120000000");
    expect(ali.searchText).not.toContain("P-100");
    expect(renderToStaticMarkup(ali.content as ReactElement)).toContain(
      "0012345678",
    );
    expect(renderToStaticMarkup(ali.content as ReactElement)).not.toContain(
      "P-100",
    );
  });

  it("omits the secondary identity when national code is missing", () => {
    const markup = renderToStaticMarkup(
      tripPersonSelectOptions(people)[1].content as ReactElement,
    );

    expect(markup).toContain("مریم احمدی");
    expect(markup).not.toContain("—");
  });
});
