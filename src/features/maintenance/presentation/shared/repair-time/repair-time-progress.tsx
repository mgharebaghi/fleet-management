"use client";
import { useEffect, useState } from "react";
import { ProgressBar } from "../../../../../components/ui/progress-bar/progress-bar";
import { repairDurationMilliseconds, repairTimeState, type RepairTaskTime } from "./repair-time-estimate";
import styles from "./repair-time-progress.module.css";
const count = (value: number) => new Intl.NumberFormat("fa-IR").format(value);
function durationLabel(milliseconds: number) {
  const minutes = Math.ceil(milliseconds / 60000), days = Math.floor(minutes / 1440), hours = Math.floor(minutes % 1440 / 60), remainder = minutes % 60;
  return [days ? `${count(days)} روز` : "", hours ? `${count(hours)} ساعت` : "", remainder ? `${count(remainder)} دقیقه` : ""].filter(Boolean).join(" و ") || "۰ دقیقه";
}
export function RepairTimeProgress({ startedAt, endedAt, status, tasks }: { startedAt: string | null; endedAt: string | null; status: string; tasks: readonly RepairTaskTime[] }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    if (!startedAt || status !== "InProgress") return;
    const update = () => setNow(Date.now());
    const timer = setInterval(update, 1000);
    const initial = setTimeout(update, 0);
    const visible = () => { if (!document.hidden) update(); };
    document.addEventListener("visibilitychange", visible);
    return () => { clearInterval(timer); clearTimeout(initial); document.removeEventListener("visibilitychange", visible); };
  }, [startedAt, status]);
  if (!startedAt || !["InProgress", "Completed", "Cancelled"].includes(status)) return null;
  const duration = repairDurationMilliseconds(tasks);
  const timestamp = status === "InProgress" ? now : endedAt ? Date.parse(endedAt) : null;
  const state = duration !== null && timestamp !== null ? repairTimeState(startedAt, duration, timestamp) : null;
  return <section className={styles.panel} aria-label="زمان تقریبی تعمیر" data-overdue={status === "InProgress" && state?.overdue || undefined}>
    <h3>زمان تقریبی تعمیر</h3>
    {duration === null ? <p>مدت کارها هنوز کامل مشخص نشده است.</p> : <>
      <div className={styles.line}><span>بر پایهٔ مدت کارها</span><span>{durationLabel(duration)}</span></div>
      {state ? <><ProgressBar value={status === "Completed" ? 100 : state.percent} label="زمان سپری‌شده از برآورد تعمیر" tone={status === "InProgress" && state.overdue ? "warning" : "info"} />
        <p className={styles.remaining}>{status === "Completed" ? "تعمیر پایان یافته است" : status === "Cancelled" ? "تعمیر متوقف شده است" : state.overdue ? "زمان برآوردی تمام شده" : `${durationLabel(state.remaining)} باقی‌مانده`}</p>
      </> : <p>{timestamp === null ? "در حال محاسبهٔ زمان…" : "زمان قابل محاسبه نیست"}</p>}
    </>}
  </section>;
}
