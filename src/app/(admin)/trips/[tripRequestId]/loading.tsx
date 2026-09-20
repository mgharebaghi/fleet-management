import { LoadingIndicator } from "@/components/ui/loading-indicator/loading-indicator";

export default function TripWorkspaceLoading() {
  return (
    <LoadingIndicator
      variant="page"
      label="در حال بارگذاری پرونده سفر…"
      description="اطلاعات پرونده سفر در حال دریافت است."
    />
  );
}
