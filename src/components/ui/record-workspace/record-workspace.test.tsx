import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { RecordSidePanel } from "./record-workspace";
it("supports a concise summary while preserving the trip next-action composition", () => {
  const summary = renderToStaticMarkup(<RecordSidePanel title="Summary"><button>Register</button></RecordSidePanel>);
  expect(summary).toContain('aria-label="Summary"'); expect(summary).toContain("<h2>Summary</h2>"); expect(summary).not.toContain("<p");
  const trip = renderToStaticMarkup(<RecordSidePanel title="اقدام بعدی" lead="Trip lead" hint="Trip hint" action={<button>Continue</button>} />);
  expect(trip).toContain('aria-label="اقدام بعدی"'); expect(trip).toContain("<h2>اقدام بعدی</h2>"); expect(trip).toContain("Trip lead"); expect(trip).toContain("Trip hint"); expect(trip).toContain("Continue");
});
