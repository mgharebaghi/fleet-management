export type TripLifecycleVisualStage = {
  id: "request" | "assignment" | "execution" | "completion";
  label: string;
  isComplete: boolean;
  isCurrent: boolean;
};

export type TripLifecycleVisualModel =
  | {
      isCancelled: false;
      stages: TripLifecycleVisualStage[];
    }
  | {
      isCancelled: true;
      statusLabel: string;
      description: string;
    };

export function buildTripLifecycleVisualModel(
  status: string,
): TripLifecycleVisualModel {
  if (status === "Cancelled") {
    return {
      isCancelled: true,
      statusLabel: "لغوشده",
      description: "این درخواست سفر لغو شده و فرآیند اجرایی آن پایان یافته است.",
    };
  }

  const stageDefinitions = [
    { id: "request" as const, label: "ثبت درخواست" },
    { id: "assignment" as const, label: "تخصیص‌یافته" },
    { id: "execution" as const, label: "در حال اجرا" },
    { id: "completion" as const, label: "تکمیل‌شده" },
  ];

  let currentStageIndex = 0;
  if (status === "Assigned") currentStageIndex = 1;
  else if (status === "InProgress") currentStageIndex = 2;
  else if (status === "Completed") currentStageIndex = 3;

  const stages: TripLifecycleVisualStage[] = stageDefinitions.map(
    (def, index) => {
      const isComplete =
        index < currentStageIndex ||
        (status === "Assigned" && index === 1) ||
        (status === "Completed" && index === 3);
      const isCurrent = index === currentStageIndex;

      return {
        id: def.id,
        label: def.label,
        isComplete,
        isCurrent,
      };
    },
  );

  return {
    isCancelled: false,
    stages,
  };
}
