import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import type { WorkOrderRecord } from "../../../application/work-orders/work-order-records";
vi.mock("./cancel-work-order-button", () => ({ CancelWorkOrderButton: ({ started }: { started: boolean }) => <button data-started={started}>لغو پروندهٔ تعمیر</button> }));
import { WorkOrderResultPanel } from "./work-order-result-panel";
const base = { id: 3, number: "WO-1405-0003", origin: "Direct", status: "InProgress", startedAt: "2026-11-03T08:00:00Z", endedAt: null } as WorkOrderRecord;
it("keeps started repair cancellation inside its result tab", () => {
  const html = renderToStaticMarkup(<WorkOrderResultPanel order={base} />);
  expect(html).toContain("توقف تعمیر"); expect(html).toContain('data-started="true"');
});
it("does not offer cancellation for closed or unknown records", () => {
  for (const order of [{ ...base, status: "Completed" }, { ...base, status: "Cancelled" }, { ...base, origin: "Unknown" as const }]) expect(renderToStaticMarkup(<WorkOrderResultPanel order={order} />)).not.toContain("لغو پروندهٔ تعمیر");
});
