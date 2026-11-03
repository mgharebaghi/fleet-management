import { ProgressBar } from "../../../../components/ui/progress-bar/progress-bar";
import { serviceCriterionProgress } from "../../application/service-plans/service-criterion-progress";
import type { ServiceCriterion } from "../../application/service-plans/service-plan-records";
import { criterionExplanation, criterionLabels, planValue } from "./service-plan-presentation";
import styles from "./service-plan.module.css";
export function ServiceCriterionProgress({ criterion }: { criterion: ServiceCriterion }) {
  const state = serviceCriterionProgress(criterion);
  const remaining = !state ? criterionExplanation(criterion) ?? "موعد قابل محاسبه نیست" : criterion.status === "Due" ? "موعد سرویس رسیده است" : `${planValue(state.remaining, criterion.key)} ${criterion.key === "days" ? "روز" : criterion.key === "km" ? "کیلومتر" : "ساعت کارکرد"} مانده`;
  return <div className={styles.progress}><ProgressBar value={state?.percent ?? null} label={`پیشرفت تا موعد سرویس بر پایهٔ ${criterionLabels[criterion.key]}`} tone={criterion.status === "Due" ? "negative" : criterion.status === "Warning" ? "warning" : "info"} /><small>{remaining}</small></div>;
}
