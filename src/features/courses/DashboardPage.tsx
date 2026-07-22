'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  BookOpen,
  Brain,
  CheckCircle2,
  Flame,
  Play,
  Trophy,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '../../store';
import {
  enrollmentsService,
  gamificationService,
  leaderboardService,
  studentsService,
} from '../../services';
import type { Course, Enrollment } from '../../types';
import { CourseCard, EmptyState } from '../../components/shared';
import {
  DemoHeroInk,
  DemoPageRoot,
  UI_PLACEHOLDERS,
  formatXp,
} from '../ui-reskin/demo-ui';

const getCourseId = (enrollment?: Enrollment | null) => {
  if (!enrollment) return '';
  return typeof enrollment.courseId === 'string'
    ? enrollment.courseId
    : enrollment.courseId._id ?? enrollment.courseId.id ?? '';
};

const getCourseTitle = (enrollment: Enrollment) =>
  typeof enrollment.courseId === 'string'
    ? `Course #${enrollment.courseId.slice(-6)}`
    : enrollment.courseId.title ?? `Course #${getCourseId(enrollment).slice(-6)}`;

const getEnrollmentCourse = (enrollment: Enrollment): Course => {
  if (typeof enrollment.courseId !== 'string') {
    const source = enrollment.courseId;
    const id = source._id ?? source.id ?? enrollment._id;
    return {
      _id: id,
      id,
      title: source.title ?? `Course #${id.slice(-6)}`,
      description: 'Continue this course from your personal learning dashboard.',
      shortDescription: 'Continue this course from your personal learning dashboard.',
      tags: [],
      thumbnailUrl: source.thumbnailUrl,
      level: (source.level as Course['level']) ?? 'BEGINNER',
      language: source.language ?? 'Course',
      isPremium: source.isPremium,
      isPublished: source.status !== 'DRAFT',
      totalLessons: source.totalLessons ?? enrollment.totalLessons ?? 0,
      totalEnrollments: 0,
      createdAt: '',
      updatedAt: '',
    };
  }

  return {
    _id: enrollment.courseId,
    title: `Course #${enrollment.courseId.slice(-6)}`,
    description: 'Continue this course from your personal learning dashboard.',
    shortDescription: 'Continue this course from your personal learning dashboard.',
    tags: [],
    level: 'BEGINNER',
    language: 'Course',
    isPublished: true,
    totalLessons: 0,
    totalEnrollments: 0,
    createdAt: '',
    updatedAt: '',
  };
};

function DashboardCourseCard({
  course,
  progress,
  onOpen,
}: {
  course: Course;
  progress: number;
  onOpen: () => void;
}) {
  return (
    <div className="dashboard-course-card">
      <CourseCard course={course} onClick={onOpen} />
      <div className="dashboard-course-progress flex items-center justify-between gap-4 px-5 py-3 text-xs">
        <span className="inline-flex items-center gap-1"><BookOpen size={13} /> Your progress</span>
        <span className="font-semibold">{progress}%</span>
      </div>
    </div>
  );
}

/**
 * PR4 — layout fidelity to DemoDashboardPage:
 * [progress hero | streak lime] → 3 stat cards → [my courses grid | AI + activity aside]
 * All numbers from API; placeholders only where BE has no field.
 */
export const DashboardPage: React.FC = () => {
  const { user } = useAuthStore();
  const router = useRouter();
  const isAdmin = String(user?.role ?? '').toUpperCase() === 'ADMIN';
  const firstName = user?.name?.split(' ')[0] ?? 'learner';

  const { data: stats, isLoading: statsLoading, isError: statsError } = useQuery({
    queryKey: ['gamification-stats'],
    queryFn: gamificationService.getStats,
    enabled: Boolean(user) && !isAdmin,
  });

  const { data: enrollments, isLoading: enrollLoading, isError: enrollError } = useQuery({
    queryKey: ['my-enrollments'],
    queryFn: enrollmentsService.getMyEnrollments,
    enabled: Boolean(user) && !isAdmin,
  });

  const { data: resume, isLoading: resumeLoading, isError: resumeError } = useQuery({
    queryKey: ['student-resume'],
    queryFn: studentsService.getResume,
    enabled: Boolean(user) && !isAdmin,
  });

  const { data: myRank, isError: rankError } = useQuery({
    queryKey: ['my-rank'],
    queryFn: leaderboardService.getMyRank,
    enabled: Boolean(user) && !isAdmin,
  });

  const streak = stats?.currentStreak ?? stats?.streak ?? 0;
  const progressPercent = stats ? (stats.xp % 1000) / 10 : 0;
  const resumeCourseId = getCourseId(resume);
  const resumeTarget = resume?.lastLessonId
    ? `/lessons/${resume.lastLessonId}`
    : resumeCourseId
      ? `/courses/${resumeCourseId}`
      : '/courses';
  const resumeProgress = resume?.progressPercent ?? resume?.progress ?? 0;
  const resumeCoursePath = resumeCourseId ? `/courses/${resumeCourseId}` : '/courses';

  useEffect(() => {
    if (isAdmin) {
      router.replace('/admin');
      return;
    }

    if (statsError) toast.error('Failed to load learning stats');
    if (enrollError) toast.error('Failed to load enrollments');
    if (resumeError) toast.error('Failed to load resume target');
    if (rankError) toast.error('Failed to load leaderboard rank');
  }, [enrollError, isAdmin, rankError, resumeError, router, statsError]);

  if (isAdmin) {
    return (
      <DemoPageRoot>
        <section className="rounded-lg border border-black/10 bg-white p-6">
          <h1 className="text-2xl font-semibold text-black">Admin dashboard</h1>
          <p className="mt-2 text-sm text-black/60">Redirecting to analytics…</p>
        </section>
      </DemoPageRoot>
    );
  }

  return (
    <DemoPageRoot>
      <section className="grid gap-5 lg:grid-cols-[1.45fr_0.55fr]">
        <DemoHeroInk>
          <p className="on-forest-label text-xs uppercase tracking-[0.18em]">Your progress</p>
          <h1 className="mt-3 text-4xl font-light tracking-tight">
            Continue learning, {firstName}.
          </h1>
          <p className="on-forest-copy mt-4 max-w-2xl">
            {resumeLoading
              ? 'Loading your resume target…'
              : resume
                ? `${getCourseTitle(resume)} · ${resumeProgress}% complete`
                : 'Pick a course to build a resume target and streak.'}
          </p>
          <div className="mt-8 h-2 rounded-full bg-white/10">
            <div
              className="h-2 rounded-full bg-[#d9f99d] transition-all duration-300"
              style={{ width: `${Math.min(100, resumeProgress || progressPercent)}%` }}
            />
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => router.push(resumeTarget)}
              className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-medium text-black transition hover:bg-white/90"
            >
              Resume lesson <Play size={16} />
            </button>
            <Link
              href={resumeCoursePath}
              className="inline-flex items-center gap-2 rounded-full border border-white/20 px-5 py-3 text-sm font-medium text-white transition hover:bg-white/10"
            >
              Course detail <ArrowRight size={16} />
            </Link>
          </div>
        </DemoHeroInk>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.05 }}
          className="dashboard-streak-panel rounded-[1.5rem] p-6"
        >
          <Flame size={26} className="dashboard-streak-icon" />
          <p className="dashboard-streak-value mt-5 text-4xl font-semibold">
            {statsLoading ? '…' : `${streak} day${streak === 1 ? '' : 's'}`}
          </p>
          <p className="dashboard-streak-copy mt-2 text-sm">
            Learning streak. Keep one short lesson per day.
          </p>
          <div className="mt-6 grid grid-cols-7 gap-1">
            {UI_PLACEHOLDERS.weekdays.map((day, index) => (
              <div
                key={`${day}-${index}`}
                className={`dashboard-streak-day grid aspect-square place-items-center rounded text-xs ${
                  index < Math.min(streak, 7)
                    ? 'dashboard-streak-day-active'
                    : 'dashboard-streak-day-idle'
                }`}
              >
                {day}
              </div>
            ))}
          </div>
        </motion.div>
      </section>

      <section className="grid gap-5 md:grid-cols-3">
        {([
          {
            label: 'Level',
            value: statsLoading ? '…' : String(stats?.level ?? 1),
            Icon: Trophy,
            sub: myRank ? `Rank #${myRank.rank}` : '',
          },
          {
            label: 'Total XP',
            value: statsLoading ? '…' : formatXp(stats?.xp ?? 0).replace(' XP', ''),
            Icon: Zap,
            sub: '',
          },
          {
            label: 'Completed lessons',
            value: statsLoading ? '…' : String(stats?.totalLessonsCompleted ?? 0),
            Icon: CheckCircle2,
            sub: '',
          },
        ]).map(({ label, value, Icon, sub }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: 0.05 * i }}
            className="dashboard-stat-card rounded-lg border border-black/10 p-5"
          >
            <Icon size={22} />
            <p className="mt-4 text-3xl font-semibold">{value}</p>
            <p className="mt-1 text-sm text-black/50">{label}</p>
            {sub ? <p className="mt-1 text-xs text-black/40">{sub}</p> : null}
          </motion.div>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-black">My courses</h2>
            <Link href="/courses" className="text-sm font-medium text-black/55 hover:text-black">
              Browse all
            </Link>
          </div>

          {enrollLoading ? (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="aspect-video animate-pulse rounded-lg border border-black/10 bg-white" />
              <div className="aspect-video animate-pulse rounded-lg border border-black/10 bg-white" />
            </div>
          ) : enrollments && enrollments.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {enrollments.slice(0, 2).map((enrollment) => {
                const courseId = getCourseId(enrollment);
                const pct = enrollment.progressPercent ?? enrollment.progress ?? 0;
                return (
                  <DashboardCourseCard
                    key={enrollment._id}
                    course={getEnrollmentCourse(enrollment)}
                    progress={pct}
                    onOpen={() => router.push(`/courses/${courseId}`)}
                  />
                );
              })}
            </div>
          ) : (
            <EmptyState
              icon={<BookOpen size={36} />}
              title="No enrolled courses yet"
              description="Browse the course catalog and enroll to start your learning path."
              action={(
                <Link href="/courses" className="btn-primary">
                  Browse courses <ArrowRight size={15} />
                </Link>
              )}
            />
          )}
        </div>

        <aside className="space-y-4">
          <div className="rounded-lg border border-black/10 bg-white p-5">
            <div className="flex items-center gap-2">
              <Brain size={19} />
              <h3 className="font-semibold text-black">AI Coach</h3>
            </div>
            <p className="mt-3 text-sm text-black/60">Ask for help with course concepts, code, and concurrency problems.</p>
            <Link
              href="/ai"
              className="mt-4 inline-flex rounded-full bg-black px-4 py-2 text-sm font-medium text-white"
            >
              Open AI Coach
            </Link>
          </div>
          <div className="rounded-lg border border-black/10 bg-white p-5">
            <h3 className="font-semibold text-black">Recent activity</h3>
            <p className="mt-3 text-sm text-black/60">Your completed lessons and quiz results will appear here.</p>
          </div>
        </aside>
      </section>
    </DemoPageRoot>
  );
};
