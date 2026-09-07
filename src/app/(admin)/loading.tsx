import { LoadingIndicator } from "../../components/ui/loading-indicator/loading-indicator";

export default function AdminLoading() {
  return (
    <LoadingIndicator
      variant="page"
      label="در حال بارگذاری…"
      description="محتوای بخش مدیریت در حال آماده‌سازی است."
    />
  );
}
