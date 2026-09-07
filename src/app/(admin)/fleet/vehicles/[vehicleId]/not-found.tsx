import { ActionLink } from "@/components/ui/action-link/action-link";
import { PageShell } from "@/components/ui/page-shell/page-shell";
import { ResultState } from "@/components/ui/result-state/result-state";

export default function NotFound() {
  return (
    <PageShell>
      <ResultState
        title="خودرو پیدا نشد"
        description="پروندهٔ درخواستی موجود نیست."
        action={<ActionLink href="/fleet/vehicles">خودروها</ActionLink>}
      />
    </PageShell>
  );
}
