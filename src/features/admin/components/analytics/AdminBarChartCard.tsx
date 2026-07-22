"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { AdminChartCard } from "./AdminChartCard";

type ChartDatum = Record<string, string | number | null | undefined>;

export interface AdminBarChartCardProps {
  title: string;
  description?: string;
  data?: ChartDatum[] | null;
  nameKey: string;
  valueKey: string;
  valueFormatter?: (value: number) => string;
  emptyText?: string;
  isLoading?: boolean;
  error?: string | null;
}

export function AdminBarChartCard({
  title,
  description,
  data,
  nameKey,
  valueKey,
  valueFormatter,
  emptyText,
  isLoading,
  error,
}: AdminBarChartCardProps) {
  const chartData = data ?? [];

  return (
    <AdminChartCard title={title} description={description} isLoading={isLoading} error={error} isEmpty={chartData.length === 0} emptyText={emptyText}>
      <ResponsiveContainer height="100%" width="100%">
        <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 12, left: 8, bottom: 0 }}>
          <CartesianGrid stroke="#e7e5e4" strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" tick={{ fill: "#6b7280", fontSize: 12 }} tickLine={false} axisLine={false} tickFormatter={valueFormatter} />
          <YAxis dataKey={nameKey} type="category" width={100} tick={{ fill: "#4b5563", fontSize: 12 }} tickLine={false} axisLine={false} />
          <Tooltip formatter={(value) => valueFormatter ? valueFormatter(Number(value)) : value} />
          <Bar dataKey={valueKey} fill="#8093b7" radius={[0, 5, 5, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </AdminChartCard>
  );
}
