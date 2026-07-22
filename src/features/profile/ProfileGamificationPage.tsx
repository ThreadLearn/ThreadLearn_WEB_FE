'use client';

import React, { useRef } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Award, BarChart3, BookOpen, ShieldCheck, Upload, User, Users } from 'lucide-react';
import { toast } from 'sonner';
import { authService } from '../../services/auth.service';
import { adminService, gamificationService } from '../../services';
import { useAuthStore } from '../../store';
import { Avatar, Skeleton } from '../../components/shared';
import {
  DemoPageRoot,
  DemoPill,
  UI_PLACEHOLDERS,
} from '../ui-reskin/demo-ui';

const XpLevelStreakWidget = dynamic(
  () => import('../gamification').then((module) => module.XpLevelStreakWidget),
  {
    loading: () => (
      <div className="flex flex-col gap-5">
        <Skeleton className="h-28 rounded-lg" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Skeleton className="h-24 rounded-lg" count={4} />
        </div>
      </div>
    ),
  }
);

/**
 * PR9 — profile page layout mirrors DemoProfilePage (aside identity + main stats).
 * Data: auth store user + gamificationService.getStats; avatar via authService.uploadAvatar.
 * Certificate block is UI placeholder until certificates FE exists.
 */
export const ProfileGamificationPage: React.FC = () => {
  const { user, setUser } = useAuthStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const isAdmin = String(user?.role ?? '').toUpperCase() === 'ADMIN';

  const { data: stats } = useQuery({
    queryKey: ['gamification-stats'],
    queryFn: gamificationService.getStats,
    enabled: Boolean(user) && !isAdmin,
  });
  const { data: adminStatistics } = useQuery({
    queryKey: ['admin-dashboard-statistics'],
    queryFn: adminService.getDashboardStatistics,
    enabled: Boolean(user) && isAdmin,
  });

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const result = await authService.uploadAvatar(file);
      if (user) setUser({ ...user, avatarUrl: result.avatarUrl });
      toast.success('Avatar updated!');
    } catch {
      toast.error('Failed to upload avatar');
    }
  };

  if (!user) {
    return (
      <DemoPageRoot>
        <p className="text-sm text-black/55">Sign in to view your profile.</p>
      </DemoPageRoot>
    );
  }

  const memberSince = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : 'Unknown';

  if (isAdmin) {
    const summary = adminStatistics?.summary;
    const adminMetrics = [
      { label: 'Total users', value: summary?.totalUsers, icon: Users },
      { label: 'Students', value: summary?.totalStudents, icon: User },
      { label: 'Total courses', value: summary?.totalCourses, icon: BookOpen },
      { label: 'Enrollments', value: summary?.totalEnrollments, icon: BarChart3 },
    ];

    return (
      <DemoPageRoot>
        <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
          <aside className="rounded-lg border border-black/10 bg-white p-6 shadow-sm">
            <div className="relative w-fit">
              {user.avatarUrl ? (
                <Avatar src={user.avatarUrl} name={user.name} size="xl" className="!h-24 !w-24" />
              ) : (
                <div className="grid h-24 w-24 place-items-center rounded-full bg-[#d9f99d]">
                  <User size={38} className="text-ink" />
                </div>
              )}
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="absolute -bottom-1 -right-1 grid h-8 w-8 place-items-center rounded-full border border-black/10 bg-black text-white hover:bg-black/90"
                title="Upload avatar"
              >
                <Upload size={13} />
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
            </div>

            <h1 className="mt-5 text-2xl font-semibold text-ink">{user.name}</h1>
            <p className="mt-1 text-sm text-black/50">{user.email}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <DemoPill tone="pink">ADMIN</DemoPill>
              <DemoPill tone="default">System account</DemoPill>
            </div>
            <p className="mt-4 text-xs text-black/40">Member since {memberSince}</p>
          </aside>

          <section className="space-y-5">
            <div className="rounded-lg bg-[#d9f99d] p-6">
              <ShieldCheck size={24} />
              <h2 className="mt-4 text-2xl font-semibold text-ink">Administration account</h2>
              <p className="mt-2 text-sm text-black/65">
                Use your administrative tools to manage learners, notifications, and platform activity.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link href="/admin/users" className="rounded-full bg-black px-4 py-2 text-sm font-medium text-white hover:bg-black/90">Manage users</Link>
                <Link href="/admin/notifications" className="rounded-full border border-black/15 bg-white px-4 py-2 text-sm font-medium text-ink hover:bg-black/[0.04]">View notifications</Link>
                <Link href="/admin" className="rounded-full border border-black/15 bg-white px-4 py-2 text-sm font-medium text-ink hover:bg-black/[0.04]">Analytics</Link>
              </div>
            </div>

            <div className="rounded-lg border border-black/10 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-ink">Platform overview</h2>
              <p className="mt-1 text-sm text-black/50">Current totals from the admin dashboard.</p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {adminMetrics.map(({ label, value, icon: Icon }) => (
                  <div key={label} className="rounded-lg bg-[#f7f4ee] p-4">
                    <Icon size={16} className="text-ink/60" />
                    <p className="mt-3 text-2xl font-semibold text-ink">{value ?? '—'}</p>
                    <p className="text-xs text-black/45">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      </DemoPageRoot>
    );
  }

  const streak = stats?.currentStreak ?? stats?.streak ?? 0;

  return (
    <DemoPageRoot>
      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        {/* Aside — DemoProfile identity card */}
        <aside className="rounded-lg border border-black/10 bg-white p-6 shadow-sm">
          <div className="relative w-fit">
            {user.avatarUrl ? (
              <Avatar src={user.avatarUrl} name={user.name} size="xl" className="!h-24 !w-24" />
            ) : (
              <div className="grid h-24 w-24 place-items-center rounded-full bg-[#d9f99d]">
                <User size={38} className="text-ink" />
              </div>
            )}
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="absolute -bottom-1 -right-1 grid h-8 w-8 place-items-center rounded-full border border-black/10 bg-black text-white hover:bg-black/90"
              title="Upload avatar"
            >
              <Upload size={13} />
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarUpload}
            />
          </div>

          <h1 className="mt-5 text-2xl font-semibold text-ink">{user.name}</h1>
          <p className="mt-1 text-sm text-black/50">{user.email}</p>

          <div className="mt-3 flex flex-wrap gap-2">
            <DemoPill tone={user.role === 'ADMIN' ? 'pink' : 'default'}>{user.role}</DemoPill>
            <DemoPill tone={user.planType === 'PREMIUM' ? 'lime' : 'blue'}>
              {user.planType}
            </DemoPill>
          </div>

          <p className="mt-4 text-xs text-black/40">
            Member since {memberSince}
          </p>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-[#f7f4ee] p-4">
              <p className="text-2xl font-semibold text-ink">{stats?.level ?? 1}</p>
              <p className="text-xs text-black/45">Level</p>
            </div>
            <div className="rounded-lg bg-[#f7f4ee] p-4">
              <p className="text-2xl font-semibold text-ink">{streak}</p>
              <p className="text-xs text-black/45">Streak</p>
            </div>
          </div>

          {user.planType === 'FREE' ? (
            <Link
              href="/pricing"
              className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-black px-4 py-2.5 text-sm font-medium text-white hover:bg-black/90"
            >
              Upgrade to Premium
            </Link>
          ) : null}
        </aside>

        {/* Main — certificates placeholder + full stats widget */}
        <section className="space-y-5">
          <div className="rounded-lg bg-[#d9f99d] p-6">
            <Award size={24} />
            <h2 className="mt-4 text-2xl font-semibold text-ink">Certificates</h2>
            <p className="mt-2 text-sm text-black/65">
              Certificate module is not wired on FE yet. Placeholder UI until certificates API is
              connected.
            </p>
            <button
              type="button"
              disabled
              className="mt-5 cursor-not-allowed rounded-full bg-black/40 px-4 py-2 text-sm font-medium text-white"
              title="Coming soon"
            >
              Download certificate
            </button>
            <p className="mt-2 text-[10px] uppercase tracking-wider text-black/40">
              UI placeholder · {UI_PLACEHOLDERS.leaderboardSeason}
            </p>
          </div>

          <div className="rounded-lg border border-black/10 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-ink">Tiến độ học tập</h2>
            <p className="mt-1 text-sm text-black/50">
              XP, cấp độ và chuỗi học tập của bạn được cập nhật sau mỗi hoạt động hợp lệ.
            </p>
            <div className="mt-5">
              <XpLevelStreakWidget />
            </div>
          </div>
        </section>
      </div>
    </DemoPageRoot>
  );
};
