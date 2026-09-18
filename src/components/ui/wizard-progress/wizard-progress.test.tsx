import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { WizardProgress } from "./wizard-progress";

const steps = [
  { id: "one", label: "مرحله یک" },
  { id: "two", label: "مرحله دو" },
  { id: "three", label: "مرحله سه" },
] as const;

describe("WizardProgress", () => {
  it("marks the current, completed and upcoming steps", () => {
    const markup = renderToStaticMarkup(
      <WizardProgress
        steps={steps}
        currentIndex={1}
        ariaLabel="مراحل نمونه"
      />,
    );

    expect(markup).toContain('aria-label="مراحل نمونه"');
    expect(markup).toContain("مرحله یک");
    expect(markup).toContain("مرحله دو");
    expect(markup).toContain("مرحله سه");
    expect(markup).toContain('aria-current="step"');
    expect(markup).toMatch(/data-state="complete"/);
    expect(markup).toMatch(/data-state="current"/);
    expect(markup).toMatch(/data-state="upcoming"/);
  });
});
