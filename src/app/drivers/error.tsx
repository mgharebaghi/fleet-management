"use client";
import { PageShell } from "@/components/ui/page-shell/page-shell";
import { ResultState } from "@/components/ui/result-state/result-state";
import { ActionButton } from "@/components/ui/action-button/action-button";
export default function ErrorPage({ reset }: { reset: () => void }) { return <PageShell><ResultState variant="error" title="اطلاعات رانندگان دریافت نشد" description="دوباره تلاش کنید." action={<ActionButton onClick={reset}>تلاش دوباره</ActionButton>} /></PageShell>; }
