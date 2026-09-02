import { LoadingIndicator } from "@/components/ui/loading-indicator/loading-indicator";

export default function Loading() {
  return (
    <LoadingIndicator
      variant="page"
      label="در حال آماده‌سازی صفحه…"
      description="لطفاً چند لحظه منتظر بمانید."
    />
  );
}
