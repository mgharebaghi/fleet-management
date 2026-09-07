import { PageShell } from "@/components/ui/page-shell/page-shell";
import { ResultState } from "@/components/ui/result-state/result-state";
import { ActionLink } from "@/components/ui/action-link/action-link";
export default function NotFound() { return <PageShell><ResultState title="راننده پیدا نشد" description="پروندهٔ درخواستی موجود نیست." action={<ActionLink href="/drivers">رانندگان</ActionLink>} /></PageShell>; }
