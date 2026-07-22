'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  AlertCircle,
  BarChart2,
  BookOpen,
  CheckCircle,
  TrendingUp,
  Users,
} from 'lucide-react';
import { adminService } from '../../services';
import { Skeleton } from '../../components/shared';
import type {
  AdminDashboardChartPoint,
  AdminDashboardMetricValue,
  AdminDashboardSummary,
} from '../../types';
import {
  AdminBarChartCard,
  AdminLineChartCard,
  AdminPieChartCard,
} from './components/analytics';
import {
  DemoDisplayTitle,
  DemoHeroWhite,
  DemoMuted,
  DemoPageRoot,
  DemoPill,
  DemoWhitePanel,
} from '../ui-reskin/demo-ui';

const labelKeys = ['label', 'name', 'date', 'month', 'type', 'status'];

const toFiniteNumber = (value: AdminDashboardMetricValue): number => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
};

const formatNumber = (value: AdminDashboardMetricValue): string =>
  toFiniteNumber(value).toLocaleString();

const formatRate = (value: AdminDashboardMetricValue): string => {
  const rate = toFiniteNumber(value);
  const percentage = rate > 1 ? rate : rate * 100;
  return `${percentage.toFixed(1)}%`;
};

const formatVnd = (value: number): string =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value);

const humanizeKey = (key: string): string =>
  key
    .replace(/([A-Z])/g, ' $1')
    .replace(/[_-]+/g, ' ')
    .replace(/^./, (char) => char.toUpperCase());

const formatMetricValue = (value: AdminDashboardMetricValue): string => {
  if (typeof value === 'number') {
    return value.toLocaleString();
  }

  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed.toLocaleString() : value;
  }

  return '0';
};

const getSummaryEntries = (summary?: AdminDashboardSummary | null) => {
  if (!summary) {
    return [];
  }

  return Object.entries(summary)
    .filter(([, value]) => ['number', 'string', 'boolean'].includes(typeof value))
    .map(([key, value]) => ({
      key,
      label: humanizeKey(key),
      value: formatMetricValue(value),
    }));
};

const getChartPointLabel = (point: AdminDashboardChartPoint, index: number): string => {
  for (const key of labelKeys) {
    const value = point[key];
    if (typeof value === 'string' && value.trim()) {
      return value;
    }
  }

  const firstTextValue = Object.values(point).find(
    (value) => typeof value === 'string' && value.trim()
  );

  return firstTextValue ? String(firstTextValue) : `Item ${index + 1}`;
};

const getChartPointValue = (point: AdminDashboardChartPoint, keys: string[]): number => {
  for (const key of keys) {
    const value = point[key];
    if (typeof value === 'number' || typeof value === 'string') {
      return toFiniteNumber(value);
    }
  }

  return 0;
};

const StatTile: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
}> = ({ icon, label, value, sub }) => (
  <div className="rounded-lg border border-black/10 bg-white p-5 shadow-sm">
    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-[#f7f4ee] text-ink">
      {icon}
    </div>
    <p className="text-3xl font-light tracking-tight text-ink">{value}</p>
    <p className="mt-1 text-sm text-black/55">{label}</p>
    {sub ? <p className="mt-1 text-xs text-emerald-700">{sub}</p> : null}
  </div>
);

export const AdminDashboardPage: React.FC = () => {
  const [months, setMonths] = useState(6);
  const { data: stats, isLoading, isError: statsError } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: adminService.getStats,
  });

  const {
    data: dashboardStatistics,
    isLoading: statisticsLoading,
    isError: statisticsError,
  } = useQuery({
    queryKey: ['admin-dashboard-statistics', months],
    queryFn: () => adminService.getDashboardStatistics({ months }),
  });

  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ['admin-users', 1],
    queryFn: () => adminService.listUsers(1, 10),
  });

  const recentUsers = usersData?.items ?? [];
  const totalUsers = stats?.totalUsers ?? stats?.totalStudents ?? 0;
  const totalCourses = stats?.totalCourses ?? 0;
  const totalEnrollments = stats?.totalEnrollments ?? 0;
  const totalQuizAttempts = stats?.totalQuizAttempts ?? 0;
  const courseCompletionRate = stats?.courseCompletionRate ?? 0;
  const quizPassRate = stats?.quizPassRate ?? 0;
  const summaryEntries = getSummaryEntries(dashboardStatistics?.summary);
  const charts = dashboardStatistics?.charts;
  const userGrowth = (charts?.userGrowth ?? []).map((point, index) => ({
    label: getChartPointLabel(point, index),
    count: getChartPointValue(point, ['count', 'users', 'value']),
  }));
  const revenueTrend = (charts?.revenueTrend ?? []).map((point, index) => ({
    label: getChartPointLabel(point, index),
    revenue: getChartPointValue(point, ['revenue', 'total', 'value']),
  }));
  const topPurchasedCourses = (charts?.topPurchasedCourses ?? []).map((point, index) => ({
    title: typeof point.title === 'string' && point.title.trim()
      ? point.title
      : getChartPointLabel(point, index),
    purchases: getChartPointValue(point, ['purchases', 'count', 'value']),
  }));
  const paymentStatus = (charts?.paymentStatusDistribution ?? []).map((point, index) => ({
    status: typeof point.status === 'string' && point.status.trim()
      ? point.status
      : getChartPointLabel(point, index),
    count: getChartPointValue(point, ['count', 'value']),
  }));
  const userStatus = (charts?.userStatusDistribution ?? []).map((point, index) => ({
    status: typeof point.status === 'string' && point.status.trim()
      ? point.status
      : getChartPointLabel(point, index),
    count: getChartPointValue(point, ['count', 'value']),
  }));
  const notificationsByType = (charts?.notificationsByType ?? []).map((point, index) => ({
    type: typeof point.type === 'string' && point.type.trim()
      ? point.type
      : getChartPointLabel(point, index),
    count: getChartPointValue(point, ['count', 'value']),
  }));

  return (
    <DemoPageRoot>
      <DemoHeroWhite>
        <div className="flex flex-wrap items-center gap-2">
          <DemoPill tone="pink">Admin</DemoPill>
          <BarChart2 size={18} className="text-black/45" />
        </div>
        <DemoDisplayTitle>Admin dashboard</DemoDisplayTitle>
        <DemoMuted>Platform analytics and recent student activity.</DemoMuted>
      </DemoHeroWhite>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          <StatTile
            icon={<Users size={18} />}
            label="Total users"
            value={formatNumber(totalUsers)}
          />
          <StatTile
            icon={<BookOpen size={18} />}
            label="Total courses"
            value={formatNumber(totalCourses)}
          />
          <StatTile
            icon={<Activity size={18} />}
            label="Enrollments"
            value={formatNumber(totalEnrollments)}
          />
          <StatTile
            icon={<CheckCircle size={18} />}
            label="Quiz attempts"
            value={formatNumber(totalQuizAttempts)}
          />
          <StatTile
            icon={<TrendingUp size={18} />}
            label="Course completion rate"
            value={formatRate(courseCompletionRate)}
          />
          <StatTile
            icon={<CheckCircle size={18} />}
            label="Quiz pass rate"
            value={formatRate(quizPassRate)}
          />
        </div>
      )}

      {statsError ? (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertCircle size={16} />
          Dashboard totals could not be loaded. Showing safe fallback values.
        </div>
      ) : null}

      <div>
        <h2 className="mb-3 text-lg font-semibold text-ink">Statistics summary</h2>
        <DemoWhitePanel>
          {statisticsLoading ? (
            <div className="p-4">
              <Skeleton className="h-10 rounded-lg" count={4} />
            </div>
          ) : statisticsError ? (
            <div className="flex items-center gap-2 p-5 text-sm text-amber-800">
              <AlertCircle size={16} />
              Statistics summary could not be loaded.
            </div>
          ) : summaryEntries.length === 0 ? (
            <p className="p-6 text-sm text-black/50">No summary data yet.</p>
          ) : (
            <div className="divide-y divide-black/10">
              {summaryEntries.map((entry) => (
                <div
                  key={entry.key}
                  className="flex items-center justify-between gap-4 px-5 py-3"
                >
                  <span className="text-sm text-black/55">{entry.label}</span>
                  <span className="text-sm font-medium text-ink">{entry.value}</span>
                </div>
              ))}
            </div>
          )}
        </DemoWhitePanel>
      </div>

      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-ink">Charts</h2>
          <label className="flex items-center gap-2 text-sm text-black/60">
            Period
            <select
              aria-label="Analytics period"
              className="rounded-md border border-black/15 bg-white px-2.5 py-1.5 text-sm text-ink"
              value={months}
              onChange={(event) => setMonths(Number(event.target.value))}
            >
              <option value={3}>3 months</option>
              <option value={6}>6 months</option>
              <option value={12}>12 months</option>
            </select>
          </label>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <AdminLineChartCard title="New Users Over Time" data={userGrowth} xKey="label" valueKey="count" valueFormatter={formatNumber} isLoading={statisticsLoading} error={statisticsError ? 'New user data could not be loaded.' : null} emptyText="No new-user data for this period." />
          <AdminLineChartCard title="Revenue Over Time" data={revenueTrend} xKey="label" valueKey="revenue" valueFormatter={formatVnd} isLoading={statisticsLoading} error={statisticsError ? 'Revenue data could not be loaded.' : null} emptyText="No revenue data for this period." />
          <AdminBarChartCard title="Top Purchased Courses" data={topPurchasedCourses} nameKey="title" valueKey="purchases" valueFormatter={formatNumber} isLoading={statisticsLoading} error={statisticsError ? 'Course purchase data could not be loaded.' : null} emptyText="No course purchases for this period." />
          <AdminPieChartCard title="Payment Status Distribution" data={paymentStatus} nameKey="status" valueKey="count" valueFormatter={formatNumber} isLoading={statisticsLoading} error={statisticsError ? 'Payment status data could not be loaded.' : null} emptyText="No payment status data for this period." />
          <AdminPieChartCard title="User Status Distribution" data={userStatus} nameKey="status" valueKey="count" valueFormatter={formatNumber} isLoading={statisticsLoading} error={statisticsError ? 'User status data could not be loaded.' : null} emptyText="No user status data for this period." />
          <AdminBarChartCard title="Notifications By Type" data={notificationsByType} nameKey="type" valueKey="count" valueFormatter={formatNumber} isLoading={statisticsLoading} error={statisticsError ? 'Notification data could not be loaded.' : null} emptyText="No notifications for this period." />
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold text-ink">Recent users</h2>
        <DemoWhitePanel>
          {usersLoading ? (
            <div className="p-4">
              <Skeleton className="h-10 rounded-lg" count={5} />
            </div>
          ) : recentUsers.length === 0 ? (
            <p className="p-6 text-sm text-black/50">No recent users.</p>
          ) : (
            <div className="divide-y divide-black/10">
              {recentUsers.map((user) => (
                <div
                  key={user._id ?? user.id ?? user.email}
                  className="flex items-center justify-between gap-3 px-5 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink">{user.name}</p>
                    <p className="truncate text-xs text-black/50">{user.email}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-[#f7f4ee] px-2.5 py-0.5 text-[11px] font-medium text-black/60">
                    {user.role}
                  </span>
                </div>
              ))}
            </div>
          )}
        </DemoWhitePanel>
      </div>
    </DemoPageRoot>
  );
};
