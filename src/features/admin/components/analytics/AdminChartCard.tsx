import type { ReactNode } from "react";

import { AlertCircle } from "lucide-react";

import { AdminEmptyChartState } from "./AdminEmptyChartState";

export interface AdminChartCardProps {
  title: string;
  description?: string;
  children?: ReactNode;
  isLoading?: boolean;
  error?: string | null;
  isEmpty?: boolean;
  emptyText?: string;
  className?: string;
}

export function AdminChartCard({
  title,
  description,
  children,
  isLoading = false,
  error,
  isEmpty = false,
  emptyText = "No data available yet.",
  className = "",
}: AdminChartCardProps) {
  let content = children;

  if (isLoading) {
    content = (
      <div
        aria-label={`Loading ${title}`}
        className="h-64 animate-pulse rounded-xl bg-surface-muted"
        role="status"
      />
    );
  } else if (error) {
    content = (
      <div
        className="flex h-64 flex-col items-center justify-center gap-3 rounded-xl border border-rose-400/30 bg-rose-400/5 px-6 text-center"
        role="alert"
      >
        <AlertCircle aria-hidden="true" className="h-7 w-7 text-rose-700" />
        <p className="text-sm text-rose-700">{error}</p>
      </div>
    );
  } else if (isEmpty) {
    content = <AdminEmptyChartState message={emptyText} />;
  }

  return (
    <section
      aria-label={title}
      className={`rounded-2xl border border-surface-border bg-surface p-5 shadow-glow-sm ${className}`}
    >
      <div className="mb-5">
        <h3 className="text-base font-semibold text-ink">{title}</h3>
        {description ? <p className="mt-1 text-sm text-ink-muted">{description}</p> : null}
      </div>
      <div className="h-64">{content}</div>
    </section>
  );
}
