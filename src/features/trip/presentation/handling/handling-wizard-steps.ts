export type HandlingWizardStep = 1 | 2 | 3 | 4;

export const HANDLING_WIZARD_STEPS = [
  { id: "review", label: "بررسی درخواست" },
  { id: "assignment", label: "راننده و خودرو" },
  { id: "route", label: "مسیر" },
  { id: "planning", label: "تأیید و تخصیص" },
] as const;
