"use client";

import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import { AdminChartCard } from "./AdminChartCard";

type ChartDatum = Record<string, string | number | null | undefined>;

const PIE_COLORS = ["#5b6f95", "#8798b8", "#aebbd0", "#d2d9e5", "#b79b78", "#8ba88a"];

export interface AdminPieChartCardProps {
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

export function AdminPieChartCard({
  title,
  description,
  data,
  nameKey,
  valueKey,
  valueFormatter,
  emptyText,
  isLoading,
  error,
}: AdminPieChartCardProps) {
  const chartData = data ?? [];

  return (
    <AdminChartCard title={title} description={description} isLoading={isLoading} error={error} isEmpty={chartData.length === 0} emptyText={emptyText}>
      <ResponsiveContainer height="100%" width="100%">
        <PieChart>
          <Pie
            data={chartData}
            dataKey={valueKey}
            nameKey={nameKey}
            cx="50%"
            cy="50%"
            innerRadius="55%"
            outerRadius="78%"
            paddingAngle={2}
          >
            {chartData.map((entry, index) => (
              <Cell key={`${String(entry[nameKey])}-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(value) => valueFormatter ? valueFormatter(Number(value)) : value} />
          <Legend iconType="circle" wrapperStyle={{ fontSize: "12px", color: "#4b5563" }} />
        </PieChart>
      </ResponsiveContainer>
    </AdminChartCard>
  );
}
