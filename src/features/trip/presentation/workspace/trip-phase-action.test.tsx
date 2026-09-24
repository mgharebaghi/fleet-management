import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { InlineNotice } from "../../../../components/ui/inline-notice/inline-notice";
import { tripMessages } from "../trip-form-data";
import { PhaseSubmitButton } from "./phase-submit-button";

describe("phase change feedback", () => {
  it("disables the action and shows the real pending label", () => {
    const markup = renderToStaticMarkup(
      <PhaseSubmitButton pending enabled label="شروع سفر" />,
    );
    expect(markup).toContain("در حال ثبت…");
    expect(markup).toContain('disabled=""');
    expect(markup).toContain('aria-busy="true"');
    expect(markup).not.toContain(">شروع سفر<");
  });

  it("keeps the action available when the request is idle", () => {
    const markup = renderToStaticMarkup(
      <PhaseSubmitButton pending={false} enabled label="تکمیل سفر" />,
    );
    expect(markup).toContain(">تکمیل سفر<");
    expect(markup).not.toContain("disabled");
    expect(markup).toContain('aria-busy="false"');
  });

  it("shows the failure beside an idle action", () => {
    const markup = renderToStaticMarkup(
      <>
        <InlineNotice tone="danger" role="alert">
          {tripMessages.INVALID_REQUEST_TRANSITION}
        </InlineNotice>
        <PhaseSubmitButton pending={false} enabled label="شروع سفر" />
      </>,
    );
    expect(markup).toContain("role=\"alert\"");
    expect(markup).toContain(tripMessages.INVALID_REQUEST_TRANSITION);
    expect(markup).toContain(">شروع سفر<");
    expect(markup).not.toContain("در حال ثبت…");
  });
});
