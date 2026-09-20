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

  it("renders checkmark for complete steps, current dot and badge for current, and number for upcoming", () => {
    const markup = renderToStaticMarkup(
      <WizardProgress
        steps={steps}
        currentIndex={1}
        ariaLabel="مراحل نمونه"
      />,
    );

    // Completed step has check icon (svg)
    expect(markup).toContain("<svg");
    // Current step has badge
    expect(markup).toContain("گام جاری");
    // Upcoming step has step number (3)
    expect(markup).toContain(">3<");
  });

  it("renders connecting rails between steps with appropriate progress states", () => {
    const markup = renderToStaticMarkup(
      <WizardProgress
        steps={steps}
        currentIndex={1}
        ariaLabel="مراحل نمونه"
      />,
    );

    // Step 0 -> Step 1 connector is complete
    expect(markup).toContain('railEnd');
    expect(markup).toContain('railStart');
    expect(markup).toContain('data-state="complete"');
  });
});
