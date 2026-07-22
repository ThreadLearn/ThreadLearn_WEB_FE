import { BarChart3 } from "lucide-react";

interface AdminEmptyChartStateProps {
  message?: string;
}

export function AdminEmptyChartState({
  message = "No data available yet.",
}: AdminEmptyChartStateProps) {
  return (
    <div
      className="flex h-full min-h-56 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-surface-border bg-surface-muted px-6 text-center"
      role="status"
    >
      <BarChart3 aria-hidden="true" className="h-7 w-7 text-ink-faint" />
      <p className="text-sm text-ink-muted">{message}</p>
    </div>
  );
}
