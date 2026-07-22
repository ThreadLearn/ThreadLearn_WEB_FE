"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { AdminChartCard } from "./AdminChartCard";

type ChartDatum = Record<string, string | number | null | undefined>;

export interface AdminLineChartCardProps {
  title: string;
  description?: string;
  data?: ChartDatum[] | null;
  xKey: string;
  valueKey: string;
  valueFormatter?: (value: number) => string;
  emptyText?: string;
  isLoading?: boolean;
  error?: string | null;
}

export function AdminLineChartCard({
  title,
  description,
  data,
  xKey,
  valueKey,
  valueFormatter,
  emptyText,
  isLoading,
  error,
}: AdminLineChartCardProps) {
  const chartData = data ?? [];

  return (
    <AdminChartCard
      title={title}
      description={description}
      isLoading={isLoading}
      error={error}
      isEmpty={chartData.length === 0}
      emptyText={emptyText}
    >
      <ResponsiveContainer height="100%" width="100%">
        <LineChart data={chartData} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
          <CartesianGrid stroke="#e7e5e4" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey={xKey} tick={{ fill: "#6b7280", fontSize: 12 }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fill: "#6b7280", fontSize: 12 }} tickLine={false} axisLine={false} tickFormatter={valueFormatter} />
          <Tooltip formatter={(value) => valueFormatter ? valueFormatter(Number(value)) : value} />
          <Line type="monotone" dataKey={valueKey} stroke="#5b6f95" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
        </LineChart>
      </ResponsiveContainer>
    </AdminChartCard>
  );
}
