'use client';

import Link from 'next/link';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BookOpenCheck,
  BrainCircuit,
  Check,
  ChevronRight,
  Clock3,
  History,
  Lock,
  RefreshCw,
  Route,
  Sparkles,
  Target,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button, EmptyState, Skeleton } from '../../components/shared';
import { enrollmentsService, learningPlanService } from '../../services';
import { extractApiError } from '../../services/apiClient';
import type {
  AdaptiveDiagnostic,
  AdaptiveLearningGoal,
  AdaptiveLearningProfile,
  AdaptivePlanSnapshot,
  AdaptiveRiskLevel,
  Enrollment,
} from '../../types';
import {
  DemoDisplayTitle,
  DemoHeroWhite,
  DemoMuted,
  DemoPageRoot,
  DemoPill,
  DemoWhitePanel,
} from '../ui-reskin/demo-ui';

const COURSE_SLUG = 'js-concurrency-fundamentals';

type AdaptiveCourse = AdaptiveDiagnostic['course'];

export const hasAdaptiveCourseEnrollment = (
  enrollments: Enrollment[],
  course?: AdaptiveCourse,
) => {
  if (!course) return false;

  return enrollments.some((enrollment) => {
    if (typeof enrollment.courseId === 'string') {
      return enrollment.courseId === course.id;
    }

    const enrollmentCourseId = enrollment.courseId._id ?? enrollment.courseId.id;
    return enrollmentCourseId === course.id || enrollment.courseId.slug === course.slug;
  });
};

type AdaptiveView = 'loading' | 'setup' | 'assessment' | 'results' | 'plan';

const GOALS: Array<{
  value: AdaptiveLearningGoal;
  title: string;
  description: string;
}> = [
  {
    value: 'COMPLETE_COURSE',
    title: 'Complete the course',
    description: 'Build a steady path through every core lesson.',
  },
  {
    value: 'INTERVIEW_PREP',
    title: 'Prepare for interviews',
    description: 'Prioritize concepts and concurrency questions.',
  },
  {
    value: 'BUILD_PROJECT',
    title: 'Build a project',
    description: 'Focus on production-safe async patterns.',
  },
];

const riskCopy: Record<AdaptiveRiskLevel, { label: string; className: string }> = {
  LOW: { label: 'Low risk', className: 'bg-emerald-500/10 text-emerald-700' },
  MEDIUM: { label: 'Needs attention', className: 'bg-amber-500/15 text-amber-700' },
  HIGH: { label: 'High risk', className: 'bg-rose-500/10 text-rose-700' },
};

function PageLoading() {
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <Skeleton className="h-[32rem] rounded-[1.25rem]" />
      <Skeleton className="h-64 rounded-[1.25rem]" />
    </div>
  );
}

function SetupView({
  goal,
  weeklyHours,
  questionCount,
  estimatedMinutes,
  loadingDiagnostic,
  diagnosticError,
  onGoalChange,
  onWeeklyHoursChange,
  onStart,
}: {
  goal: AdaptiveLearningGoal;
  weeklyHours: number;
  questionCount: number;
  estimatedMinutes: number;
  loadingDiagnostic: boolean;
  diagnosticError: boolean;
  onGoalChange: (goal: AdaptiveLearningGoal) => void;
  onWeeklyHoursChange: (hours: number) => void;
  onStart: () => void;
}) {
  return (
    <DemoWhitePanel className="grid lg:grid-cols-[0.8fr_1.2fr]">
      <section className="border-b border-black/10 bg-[#102b26] p-6 text-white lg:border-b-0 lg:border-r lg:p-8">
        <BrainCircuit size={30} className="text-[#d9f99d]" aria-hidden="true" />
        <h2 className="mt-6 text-2xl font-semibold tracking-[-0.03em]">
          Start with real evidence
        </h2>
        <p className="mt-3 text-sm leading-6 text-white/75">
          Your answers are mapped to four JavaScript concurrency skills. The roadmap then
          uses your goal, available time, course progress, and weakest topics.
        </p>
        <dl className="mt-8 grid grid-cols-2 gap-5 border-t border-white/15 pt-6">
          <div>
            <dt className="text-xs text-white/60">Questions</dt>
            <dd className="mt-1 text-2xl font-semibold">{questionCount || 11}</dd>
          </div>
          <div>
            <dt className="text-xs text-white/60">Estimated time</dt>
            <dd className="mt-1 text-2xl font-semibold">{estimatedMinutes || 15} min</dd>
          </div>
        </dl>
      </section>

      <section className="space-y-7 p-6 sm:p-8">
        <fieldset>
          <legend className="text-base font-semibold">What are you learning for?</legend>
          <p className="mt-1 text-sm text-black/55">
            This changes how lessons are prioritized.
          </p>
          <div className="mt-4 grid gap-3">
            {GOALS.map((item) => (
              <label
                key={item.value}
                className="group flex min-h-20 cursor-pointer items-start gap-3 rounded-2xl border border-black/10 p-4 transition-colors hover:border-black/25 has-[:checked]:border-[#0b7668] has-[:checked]:bg-[#d9f99d]/25"
              >
                <input
                  type="radio"
                  name="adaptive-goal"
                  value={item.value}
                  checked={goal === item.value}
                  onChange={() => onGoalChange(item.value)}
                  className="mt-1 size-4 accent-[#0b7668]"
                />
                <span>
                  <span className="block text-sm font-semibold text-black">
                    {item.title}
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-black/55">
                    {item.description}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <div>
          <div className="flex items-center justify-between gap-4">
            <label htmlFor="adaptive-hours" className="text-sm font-semibold">
              Weekly study time
            </label>
            <span className="rounded-full bg-[#102b26] px-3 py-1.5 text-sm font-semibold text-white">
              {weeklyHours} hr{weeklyHours === 1 ? '' : 's'}
            </span>
          </div>
          <input
            id="adaptive-hours"
            type="range"
            min="1"
            max="20"
            value={weeklyHours}
            onChange={(event) => onWeeklyHoursChange(Number(event.target.value))}
            className="mt-4 w-full accent-[#0b7668]"
          />
          <p className="mt-2 text-xs text-black/55">
            The weekly roadmap will stay within this time budget.
          </p>
        </div>

        {diagnosticError ? (
          <p
            role="alert"
            className="rounded-xl bg-rose-500/10 px-4 py-3 text-sm text-rose-700"
          >
            The assessment is unavailable. Check that the diagnostic quiz data has been
            seeded.
          </p>
        ) : null}

        <Button
          size="lg"
          onClick={onStart}
          disabled={loadingDiagnostic || diagnosticError}
          className="w-full justify-center rounded-full"
        >
          {loadingDiagnostic ? 'Loading assessment' : 'Start skill assessment'}
          {!loadingDiagnostic ? <ArrowRight size={16} aria-hidden="true" /> : null}
        </Button>
      </section>
    </DemoWhitePanel>
  );
}

function AssessmentView({
  questionIndex,
  questionCount,
  questionText,
  options,
  selectedAnswer,
  submitting,
  error,
  onSelect,
  onBack,
  onNext,
}: {
  questionIndex: number;
  questionCount: number;
  questionText: string;
  options: string[];
  selectedAnswer?: number;
  submitting: boolean;
  error?: string;
  onSelect: (answer: number) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const progress = Math.round(((questionIndex + 1) / questionCount) * 100);

  useEffect(() => {
    headingRef.current?.focus();
  }, [questionIndex]);

  return (
    <DemoWhitePanel className="p-5 sm:p-8">
      <div className="flex items-center justify-between gap-4 text-sm">
        <span className="font-medium">
          Question {questionIndex + 1} of {questionCount}
        </span>
        <span className="text-black/55">{progress}% complete</span>
      </div>
      <div
        className="mt-3 h-1.5 overflow-hidden rounded-full bg-black/10"
        aria-hidden="true"
      >
        <div
          className="h-full rounded-full bg-[#0b7668] transition-[width] motion-reduce:transition-none"
          style={{ width: `${progress}%` }}
        />
      </div>

      <fieldset className="mx-auto mt-10 max-w-3xl">
        <legend className="sr-only">Choose one answer</legend>
        <h2
          ref={headingRef}
          tabIndex={-1}
          className="text-xl font-semibold leading-8 tracking-[-0.02em] outline-none sm:text-2xl"
        >
          {questionText}
        </h2>
        <div className="mt-7 grid gap-3" role="radiogroup" aria-label="Answer choices">
          {options.map((option, index) => (
            <label
              key={`${index}-${option}`}
              className="group flex min-h-14 cursor-pointer items-center gap-4 rounded-2xl border border-black/10 px-4 py-3 text-sm transition-colors hover:border-black/25 has-[:checked]:border-[#0b7668] has-[:checked]:bg-[#d9f99d]/25"
            >
              <input
                type="radio"
                name={`adaptive-question-${questionIndex}`}
                checked={selectedAnswer === index}
                onChange={() => onSelect(index)}
                className="size-4 shrink-0 accent-[#0b7668]"
              />
              <span className="leading-6">{option}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {error ? (
        <p role="alert" className="mx-auto mt-5 max-w-3xl text-sm text-rose-700">
          {error}
        </p>
      ) : null}

      <div className="mx-auto mt-10 flex max-w-3xl items-center justify-between gap-3 border-t border-black/10 pt-6">
        <Button variant="ghost" onClick={onBack} disabled={submitting}>
          <ArrowLeft size={15} aria-hidden="true" />
          Back
        </Button>
        <Button
          onClick={onNext}
          loading={submitting}
          disabled={selectedAnswer === undefined}
        >
          {questionIndex + 1 === questionCount ? 'Evaluate my skills' : 'Next question'}
          {!submitting ? <ArrowRight size={15} aria-hidden="true" /> : null}
        </Button>
      </div>
    </DemoWhitePanel>
  );
}

function ResultsView({
  profile,
  generating,
  generateError,
  onGenerate,
  onRetake,
}: {
  profile: AdaptiveLearningProfile;
  generating: boolean;
  generateError?: string;
  onGenerate: () => void;
  onRetake: () => void;
}) {
  const risk = riskCopy[profile.riskLevel];

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_20rem]">
      <DemoWhitePanel className="p-5 sm:p-7">
        <div className="flex flex-col gap-5 border-b border-black/10 pb-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${risk.className}`}
              >
                {risk.label}
              </span>
              <span className="text-xs text-black/50">Assessment {profile.version}</span>
            </div>
            <h2 className="mt-4 text-2xl font-semibold tracking-[-0.03em]">
              Your skill profile
            </h2>
            <p className="mt-2 text-sm text-black/55">
              {profile.diagnostic.correctAnswers} of {profile.diagnostic.totalQuestions}{' '}
              answers correct
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="rounded-2xl bg-[#102b26] px-4 py-3 text-white">
              <p className="text-xs text-white/65">Mastery</p>
              <p className="mt-1 text-2xl font-semibold">{profile.overallMastery}%</p>
            </div>
            <div className="rounded-2xl bg-[#d9f99d] px-4 py-3 text-[#102b26]">
              <p className="text-xs text-[#102b26]/65">Confidence</p>
              <p className="mt-1 text-2xl font-semibold">{profile.confidence}%</p>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-2">
          {profile.skillScores.map((skill) => (
            <div key={skill.skillKey} className="rounded-2xl border border-black/10 p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-sm font-semibold">{skill.label}</h3>
                  <p className="mt-1 text-xs text-black/50">
                    {skill.correctAnswers}/{skill.totalQuestions} evidence points
                  </p>
                </div>
                <strong className="text-2xl tracking-[-0.04em]">{skill.score}%</strong>
              </div>
            </div>
          ))}
        </div>

        {profile.riskSignals.length > 0 ? (
          <section className="mt-6 rounded-2xl bg-amber-500/10 p-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-amber-800">
              <AlertTriangle size={16} aria-hidden="true" />
              What needs attention
            </h3>
            <ul className="mt-3 space-y-2 text-sm text-amber-900/80">
              {profile.riskSignals.map((signal) => (
                <li key={signal}>{signal}</li>
              ))}
            </ul>
          </section>
        ) : null}
      </DemoWhitePanel>

      <aside className="space-y-4">
        <div className="rounded-[1.25rem] bg-[#102b26] p-5 text-white">
          <Sparkles size={22} className="text-[#d9f99d]" aria-hidden="true" />
          <h2 className="mt-5 text-lg font-semibold">Turn results into action</h2>
          <p className="mt-2 text-sm leading-6 text-white/70">
            Generate a weekly roadmap using your weakest skills and {profile.weeklyHours}
            -hour budget.
          </p>
          <Button
            onClick={onGenerate}
            loading={generating}
            className="mt-5 w-full border-[#d9f99d] bg-[#d9f99d] text-[#102b26] hover:bg-[#bef264]"
          >
            Generate roadmap
          </Button>
          {generateError ? (
            <p role="alert" className="mt-3 text-xs leading-5 text-rose-200">
              {generateError}
            </p>
          ) : null}
        </div>
        <Button variant="outline" onClick={onRetake} className="w-full">
          <RefreshCw size={15} aria-hidden="true" />
          Retake assessment
        </Button>
      </aside>
    </div>
  );
}

export function PlanView({
  plan,
  course,
  isEnrolled,
  checkingEnrollment,
  enrolling,
  currentVersion,
  history,
  generating,
  onEnroll,
  onGenerate,
  onShowResults,
  onRetake,
  onPreview,
}: {
  plan: AdaptivePlanSnapshot;
  course: AdaptiveCourse;
  isEnrolled: boolean;
  checkingEnrollment: boolean;
  enrolling: boolean;
  currentVersion: number;
  history: AdaptivePlanSnapshot[];
  generating: boolean;
  onEnroll: () => void;
  onGenerate: () => void;
  onShowResults: () => void;
  onRetake: () => void;
  onPreview: (plan: AdaptivePlanSnapshot) => void;
}) {
  const isStale = plan.diagnosticVersion !== currentVersion;

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="space-y-5">
        <DemoWhitePanel className="p-5 sm:p-7">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-[#d9f99d] px-3 py-1 text-xs font-semibold text-[#102b26]">
                  {plan.generatedBy === 'GEMINI'
                    ? 'Gemini AI roadmap'
                    : 'Reliable fallback roadmap'}
                </span>
                <span className="text-xs text-black/50">Plan {plan.version}</span>
              </div>
              <h2 className="mt-4 text-2xl font-semibold tracking-[-0.03em]">
                Your adaptive roadmap
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-black/60">
                {plan.summary}
              </p>
            </div>
            <Button onClick={onGenerate} loading={generating} variant="outline">
              <RefreshCw size={15} aria-hidden="true" />
              Generate again
            </Button>
          </div>

          {isStale ? (
            <p
              role="alert"
              className="mt-5 rounded-xl bg-amber-500/10 px-4 py-3 text-sm text-amber-800"
            >
              This plan uses an older assessment. Generate again to apply your latest
              scores.
            </p>
          ) : null}

          <div className="mt-6 rounded-2xl bg-[#102b26] p-5 text-white">
            <p className="text-xs font-medium text-[#d9f99d]">Coach note</p>
            <p className="mt-2 text-sm leading-6 text-white/80">{plan.coachMessage}</p>
          </div>
        </DemoWhitePanel>

        <DemoWhitePanel className="p-5 sm:p-7">
          {!isEnrolled ? (
            <section className="mb-7 rounded-2xl border border-[#0b7668]/20 bg-[#d9f99d]/20 p-4 sm:flex sm:items-center sm:justify-between sm:gap-5 sm:p-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#0b7668]">
                  Recommended course
                </p>
                <h2 className="mt-2 text-lg font-semibold text-[#102b26]">
                  {course.title}
                </h2>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-black/60">
                  Your personalized roadmap is ready. Enroll to unlock its lessons and
                  track your progress.
                </p>
              </div>
              <div className="mt-4 flex shrink-0 flex-col gap-2 sm:mt-0 sm:flex-row">
                <Link
                  href={`/courses/${course.id}`}
                  className="inline-flex min-h-10 items-center justify-center rounded-full border border-black/10 px-4 text-sm font-semibold text-black/65 transition-colors hover:border-black/25 hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0b7668]/30"
                >
                  View course
                </Link>
                <Button
                  onClick={onEnroll}
                  loading={enrolling}
                  disabled={checkingEnrollment}
                  className="min-h-10"
                >
                  {checkingEnrollment ? 'Checking access' : 'Enroll and unlock'}
                </Button>
              </div>
            </section>
          ) : (
            <div className="mb-7 flex items-center gap-2 rounded-xl bg-emerald-500/10 px-4 py-3 text-sm font-medium text-emerald-800">
              <Check size={16} aria-hidden="true" />
              Enrolled — lessons in this roadmap are unlocked.
            </div>
          )}

          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">Weekly path</h2>
              <p className="mt-1 text-sm text-black/55">
                Lessons are ordered from the most important skill gap.
              </p>
            </div>
            <span className="text-sm font-medium">{plan.weeklyPlan.length} weeks</span>
          </div>

          <ol className="mt-7 space-y-6">
            {plan.weeklyPlan.map((week) => (
              <li
                key={week.week}
                className="grid gap-4 sm:grid-cols-[4.5rem_minmax(0,1fr)]"
              >
                <div>
                  <span className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-2xl bg-[#102b26] px-3 text-sm font-semibold text-white">
                    W{week.week}
                  </span>
                </div>
                <section className="rounded-2xl border border-black/10 p-4 sm:p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h3 className="font-semibold">{week.focusLabel}</h3>
                      <p className="mt-1 text-sm text-black/55">{week.goal}</p>
                    </div>
                    <span className="flex shrink-0 items-center gap-1.5 text-xs text-black/55">
                      <Clock3 size={14} aria-hidden="true" />
                      {week.estimatedMinutes} min
                    </span>
                  </div>
                  <p className="mt-3 text-xs leading-5 text-black/50">{week.reason}</p>
                  <div className="mt-4 space-y-2">
                    {week.lessons.map((lesson) => {
                      const content = (
                        <span className="flex min-w-0 items-center gap-3">
                          {isEnrolled ? (
                            <BookOpenCheck
                              size={16}
                              className="shrink-0"
                              aria-hidden="true"
                            />
                          ) : (
                            <Lock
                              size={16}
                              className="shrink-0 text-black/40"
                              aria-hidden="true"
                            />
                          )}
                          <span className="truncate font-medium">{lesson.title}</span>
                          {lesson.isReview ? (
                            <span className="rounded-full bg-black/5 px-2 py-0.5 text-[10px] text-black/55">
                              Review
                            </span>
                          ) : null}
                        </span>
                      );

                      if (!isEnrolled) {
                        return (
                          <div
                            key={lesson.lessonId}
                            aria-disabled="true"
                            className="flex min-h-12 cursor-not-allowed items-center justify-between gap-3 rounded-xl bg-black/[0.025] px-3 py-2 text-sm text-black/55"
                          >
                            {content}
                            <span className="shrink-0 rounded-full bg-black/5 px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-black/45">
                              Locked
                            </span>
                          </div>
                        );
                      }

                      return (
                        <Link
                          key={lesson.lessonId}
                          href={`/lessons/${lesson.lessonId}`}
                          className="flex min-h-12 items-center justify-between gap-3 rounded-xl bg-black/[0.035] px-3 py-2 text-sm transition-colors hover:bg-[#d9f99d]/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0b7668]/30"
                        >
                          {content}
                          <ChevronRight
                            size={16}
                            className="shrink-0"
                            aria-hidden="true"
                          />
                        </Link>
                      );
                    })}
                  </div>
                </section>
              </li>
            ))}
          </ol>
        </DemoWhitePanel>
      </div>

      <aside className="space-y-4">
        <DemoWhitePanel className="p-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <History size={16} aria-hidden="true" />
            Plan history
          </h2>
          {history.length > 0 ? (
            <div className="mt-4 space-y-2">
              {history.map((item) => (
                <button
                  key={item.version}
                  type="button"
                  onClick={() => onPreview(item)}
                  aria-pressed={item.version === plan.version}
                  className={`flex min-h-12 w-full items-center justify-between rounded-xl border px-3 text-left text-sm transition-colors ${
                    item.version === plan.version
                      ? 'border-[#0b7668] bg-[#d9f99d]/25'
                      : 'border-black/10 hover:border-black/25'
                  }`}
                >
                  <span>
                    <span className="block font-medium">Plan {item.version}</span>
                    <span className="mt-0.5 block text-[10px] text-black/50">
                      {new Date(item.generatedAt).toLocaleDateString()}
                    </span>
                  </span>
                  <span className="text-[10px] text-black/50">{item.generatedBy}</span>
                </button>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-black/55">No previous versions yet.</p>
          )}
        </DemoWhitePanel>
        <Button variant="outline" onClick={onShowResults} className="w-full">
          <Target size={15} aria-hidden="true" />
          View skill profile
        </Button>
        <Button variant="ghost" onClick={onRetake} className="w-full">
          <RefreshCw size={15} aria-hidden="true" />
          Retake assessment
        </Button>
      </aside>
    </div>
  );
}

export const AdaptiveLearningPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [view, setView] = useState<AdaptiveView>('loading');
  const [goal, setGoal] = useState<AdaptiveLearningGoal>('COMPLETE_COURSE');
  const [weeklyHours, setWeeklyHours] = useState(3);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [previewPlan, setPreviewPlan] = useState<AdaptivePlanSnapshot | null>(null);

  const diagnosticQuery = useQuery({
    queryKey: ['adaptive-diagnostic', COURSE_SLUG],
    queryFn: () => learningPlanService.getAdaptiveDiagnostic(COURSE_SLUG),
  });
  const profileQuery = useQuery({
    queryKey: ['adaptive-profile', COURSE_SLUG],
    queryFn: () => learningPlanService.getAdaptiveProfile(COURSE_SLUG),
  });
  const planQuery = useQuery({
    queryKey: ['adaptive-plan', COURSE_SLUG],
    queryFn: () => learningPlanService.getAdaptivePlan(COURSE_SLUG),
    enabled: Boolean(profileQuery.data),
  });
  const historyQuery = useQuery({
    queryKey: ['adaptive-plan-history', COURSE_SLUG],
    queryFn: () => learningPlanService.getAdaptivePlanHistory(COURSE_SLUG),
    enabled: Boolean(planQuery.data),
  });
  const enrollmentsQuery = useQuery({
    queryKey: ['my-enrollments'],
    queryFn: enrollmentsService.getMyEnrollments,
    retry: false,
  });

  useEffect(() => {
    if (view !== 'loading' || profileQuery.isPending) return;
    if (!profileQuery.data) {
      setView('setup');
      return;
    }
    if (planQuery.isPending) return;
    setGoal(profileQuery.data.goal);
    setWeeklyHours(profileQuery.data.weeklyHours);
    setView(planQuery.data ? 'plan' : 'results');
  }, [
    planQuery.data,
    planQuery.isPending,
    profileQuery.data,
    profileQuery.isPending,
    view,
  ]);

  const submitMutation = useMutation({
    mutationFn: () =>
      learningPlanService.submitAdaptiveDiagnostic(COURSE_SLUG, {
        goal,
        weeklyHours,
        answers,
      }),
    onSuccess: (profile) => {
      queryClient.setQueryData(['adaptive-profile', COURSE_SLUG], profile);
      setPreviewPlan(null);
      setView('results');
      toast.success('Your skill profile is ready.');
    },
    onError: (error) =>
      toast.error(extractApiError(error, 'Could not evaluate your answers.')),
  });

  const generateMutation = useMutation({
    mutationFn: () => learningPlanService.generateAdaptivePlan(COURSE_SLUG),
    onSuccess: (plan) => {
      queryClient.setQueryData(['adaptive-plan', COURSE_SLUG], plan);
      queryClient.invalidateQueries({ queryKey: ['adaptive-plan-history', COURSE_SLUG] });
      setPreviewPlan(null);
      setView('plan');
      toast.success('Your adaptive roadmap is ready.');
    },
    onError: (error) =>
      toast.error(extractApiError(error, 'Could not generate your roadmap.')),
  });

  const diagnostic = diagnosticQuery.data;
  const profile = profileQuery.data;
  const adaptiveCourse = profile?.course ?? diagnostic?.course;
  const isEnrolled = hasAdaptiveCourseEnrollment(
    enrollmentsQuery.data ?? [],
    adaptiveCourse,
  );
  const enrollMutation = useMutation({
    mutationFn: () => {
      if (!adaptiveCourse?.id) throw new Error('Adaptive course is unavailable.');
      return enrollmentsService.enroll(adaptiveCourse.id);
    },
    onSuccess: (enrollment) => {
      queryClient.setQueryData<Enrollment[]>(['my-enrollments'], (current = []) => {
        const withoutDuplicate = current.filter((item) => item._id !== enrollment._id);
        return [...withoutDuplicate, enrollment];
      });
      queryClient.invalidateQueries({ queryKey: ['my-enrollments'] });
      toast.success('Course enrolled. Your roadmap lessons are now unlocked.');
    },
    onError: (error) =>
      toast.error(extractApiError(error, 'Could not enroll in this course.')),
  });
  const latestPlan = planQuery.data;
  const activePlan = previewPlan ?? latestPlan;
  const currentQuestion = diagnostic?.questions[questionIndex];
  const history = historyQuery.data ?? (latestPlan ? [latestPlan] : []);
  const pageError = profileQuery.isError;

  const completedAnswers = useMemo(() => Object.keys(answers).length, [answers]);

  const startAssessment = () => {
    if (!diagnostic || diagnostic.questions.length === 0) {
      toast.error('The assessment is not ready yet.');
      return;
    }
    setQuestionIndex(0);
    setAnswers({});
    setView('assessment');
  };

  const moveBack = () => {
    if (questionIndex === 0) {
      setView(profile ? 'results' : 'setup');
      return;
    }
    setQuestionIndex((index) => index - 1);
  };

  const moveNext = () => {
    if (!currentQuestion || answers[currentQuestion.id] === undefined) return;
    if (questionIndex + 1 < (diagnostic?.questions.length ?? 0)) {
      setQuestionIndex((index) => index + 1);
      return;
    }
    submitMutation.mutate();
  };

  return (
    <DemoPageRoot className="mx-auto max-w-6xl">
      <DemoHeroWhite>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <DemoPill tone="lime">Adaptive learning</DemoPill>
            <DemoDisplayTitle>A roadmap built from your real gaps.</DemoDisplayTitle>
            <DemoMuted>
              Measure four concurrency skills, detect learning risk, and turn the result
              into a weekly lesson path.
            </DemoMuted>
          </div>
          <Link
            href="/learning-plan"
            className="inline-flex min-h-11 items-center gap-2 self-start rounded-full border border-black/10 px-4 text-sm font-medium transition-colors hover:border-black/25"
          >
            <Clock3 size={15} aria-hidden="true" />
            Study schedule
          </Link>
        </div>

        {profile ? (
          <nav
            className="mt-6 flex flex-wrap gap-2 border-t border-black/10 pt-5"
            aria-label="Adaptive learning sections"
          >
            <button
              type="button"
              onClick={() => setView('results')}
              className={`min-h-11 rounded-full px-4 text-sm font-medium ${
                view === 'results'
                  ? 'bg-[#102b26] text-white'
                  : 'bg-black/[0.04] text-black/60'
              }`}
            >
              Skill profile
            </button>
            <button
              type="button"
              onClick={() => latestPlan && setView('plan')}
              disabled={!latestPlan}
              className={`min-h-11 rounded-full px-4 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-45 ${
                view === 'plan'
                  ? 'bg-[#102b26] text-white'
                  : 'bg-black/[0.04] text-black/60'
              }`}
            >
              Weekly roadmap
            </button>
            <span className="ml-auto self-center text-xs text-black/50">
              {completedAnswers > 0 && view === 'assessment'
                ? `${completedAnswers} answers saved locally`
                : `Assessment ${profile.version}`}
            </span>
          </nav>
        ) : null}
      </DemoHeroWhite>

      {pageError ? (
        <EmptyState
          icon={<Route size={34} />}
          title="Could not load adaptive learning"
          description="Check the backend connection, then try again."
          action={
            <Button variant="outline" onClick={() => profileQuery.refetch()}>
              Try again
            </Button>
          }
        />
      ) : view === 'loading' ? (
        <PageLoading />
      ) : view === 'setup' ? (
        <SetupView
          goal={goal}
          weeklyHours={weeklyHours}
          questionCount={diagnostic?.questionCount ?? 0}
          estimatedMinutes={diagnostic?.estimatedMinutes ?? 0}
          loadingDiagnostic={diagnosticQuery.isPending}
          diagnosticError={diagnosticQuery.isError}
          onGoalChange={setGoal}
          onWeeklyHoursChange={setWeeklyHours}
          onStart={startAssessment}
        />
      ) : view === 'assessment' && currentQuestion && diagnostic ? (
        <AssessmentView
          questionIndex={questionIndex}
          questionCount={diagnostic.questions.length}
          questionText={currentQuestion.questionText}
          options={currentQuestion.options}
          selectedAnswer={answers[currentQuestion.id]}
          submitting={submitMutation.isPending}
          error={
            submitMutation.isError ? extractApiError(submitMutation.error) : undefined
          }
          onSelect={(answer) =>
            setAnswers((current) => ({ ...current, [currentQuestion.id]: answer }))
          }
          onBack={moveBack}
          onNext={moveNext}
        />
      ) : view === 'results' && profile ? (
        <ResultsView
          profile={profile}
          generating={generateMutation.isPending}
          generateError={
            generateMutation.isError ? extractApiError(generateMutation.error) : undefined
          }
          onGenerate={() => generateMutation.mutate()}
          onRetake={startAssessment}
        />
      ) : view === 'plan' && activePlan && profile ? (
        <PlanView
          plan={activePlan}
          course={profile.course}
          isEnrolled={isEnrolled}
          checkingEnrollment={enrollmentsQuery.isPending}
          enrolling={enrollMutation.isPending}
          currentVersion={profile.version}
          history={history}
          generating={generateMutation.isPending}
          onEnroll={() => enrollMutation.mutate()}
          onGenerate={() => generateMutation.mutate()}
          onShowResults={() => setView('results')}
          onRetake={startAssessment}
          onPreview={setPreviewPlan}
        />
      ) : (
        <EmptyState
          icon={<Target size={34} />}
          title="Adaptive learning is not ready"
          description="Complete the assessment to create your skill profile."
          action={<Button onClick={() => setView('setup')}>Start setup</Button>}
        />
      )}
    </DemoPageRoot>
  );
};
