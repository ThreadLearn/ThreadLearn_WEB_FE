'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Bookmark,
  Brain,
  CheckCircle2,
  Code2,
  Clock,
  Play,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  bookmarksService,
  codeExecutionService,
  coursesService,
  enrollmentsService,
  lessonsService,
  quizService,
} from '../../services';
import { Button, EmptyState } from '../../components/shared';
import { CodeDiffView } from '../../components/shared/code/CodeDiffView';
import { DemoPageRoot, DemoPill } from '../ui-reskin/demo-ui';
import { useAuthStore } from '../../store';
import type { CodeExecutionResult, CodeShare, Enrollment } from '../../types';
import { VideoLessonPlayer } from './VideoLessonPlayer';

const LessonReader = dynamic(
  () => import('./LessonReader').then((module) => module.LessonReader),
  { loading: () => <div className="h-48 skeleton rounded-lg" /> }
);
const CommentsSection = dynamic(
  () => import('./CommentsSection').then((module) => module.CommentsSection),
  { loading: () => <div className="h-24 skeleton rounded-lg" /> }
);
const NotesPanel = dynamic(
  () => import('./NotesPanel').then((module) => module.NotesPanel),
  { loading: () => <div className="h-32 skeleton rounded-lg" /> }
);

const getHttpStatus = (error: unknown) =>
  (error as { response?: { status?: number } })?.response?.status;

const runnableLanguages = new Set(['javascript', 'js', 'python', 'py']);
const normalizeRunnableLanguage = (language: string) =>
  language.toLowerCase() === 'js'
    ? 'javascript'
    : language.toLowerCase() === 'py'
      ? 'python'
      : language.toLowerCase();

type LessonReviewProgress = {
  key: string;
  explanationReviewed: boolean;
  mediaReviewed: boolean;
};

function LessonCodeRunner({
  lessonId,
  courseId,
  language,
  exerciseId,
  initialCode,
  userId,
  requestedShare,
  onApplyHandled,
  onReviewed,
}: {
  lessonId: string;
  courseId: string;
  language: string;
  exerciseId: string;
  initialCode: string;
  userId?: string;
  requestedShare?: CodeShare | null;
  onApplyHandled?: () => void;
  onReviewed?: () => void;
}) {
  const draftKey = `threadlearn:lesson-draft:${userId ?? 'anonymous'}:${lessonId}:${exerciseId}`;
  const [code, setCode] = useState(initialCode);
  const [result, setResult] = useState<CodeExecutionResult | null>(null);
  const [runError, setRunError] = useState<string | null>(null);
  const [compareShare, setCompareShare] = useState<CodeShare | null>(null);
  const comparisonDialogRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const stored = window.localStorage.getItem(draftKey);
    if (stored) setCode(stored);
  }, [draftKey]);

  useEffect(() => {
    window.localStorage.setItem(draftKey, code);
  }, [code, draftKey]);

  useEffect(() => {
    if (requestedShare) setCompareShare(requestedShare);
  }, [requestedShare]);

  useEffect(() => {
    if (!compareShare) return;
    comparisonDialogRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setCompareShare(null);
        onApplyHandled?.();
      }
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [compareShare, onApplyHandled]);

  const { mutate: runCode, isPending } = useMutation({
    mutationFn: () =>
      codeExecutionService.run({
        sourceCode: code,
        language: normalizeRunnableLanguage(language),
        lessonId,
        courseId,
        exerciseId,
      }),
    onSuccess: (execution) => {
      setResult(execution);
      setRunError(null);
    },
    onError: (error) => {
      setResult(null);
      setRunError(
        (error as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || 'Could not run this code. Check your connection and try again.'
      );
    },
  });

  const output = result
    ? [
        `Status: ${result.status.description}`,
        `Runtime: ${result.runtime}s`,
        result.stdout ? `\nstdout\n${result.stdout}` : '',
        result.stderr ? `\nstderr\n${result.stderr}` : '',
        result.compileOutput ? `\ncompiler output\n${result.compileOutput}` : '',
      ].filter(Boolean)
    : runError
      ? [runError]
      : ['Run the code currently in the editor to see its actual output.'];
  const status = isPending
    ? 'running'
    : result
      ? result.status.description
      : runError
        ? 'failed'
        : 'idle';

  return (
    <div
      id="lesson-code-runner"
      className="mt-8 grid scroll-mt-28 gap-4 xl:grid-cols-[1fr_320px]"
    >
      <section className="overflow-hidden rounded-lg border border-black/10 bg-[#111827] text-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
          <div className="flex items-center gap-2">
            <Code2 size={16} className="text-[#d9f99d]" />
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-white/35">
                ThreadLearn IDE
              </p>
              <p className="text-sm font-semibold">{language}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              if (!code.trim()) {
                setResult(null);
                setRunError('Write some code before running the playground.');
                return;
              }
              onReviewed?.();
              runCode();
            }}
            disabled={isPending}
            className="inline-flex items-center gap-2 rounded-full bg-[#d9f99d] px-4 py-2 text-sm font-medium text-black disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Play size={15} />
            {isPending ? 'Running...' : 'Run'}
          </button>
        </div>
        <textarea
          value={code}
          onChange={(event) => {
            setCode(event.target.value);
            setResult(null);
            setRunError(null);
          }}
          spellCheck={false}
          className="min-h-72 w-full resize-y bg-[#111827] p-5 font-mono text-sm leading-6 text-[#d9f99d] outline-none"
          aria-label="Lesson code editor"
        />
      </section>

      <aside className="rounded-lg border border-black/10 bg-white p-5">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-semibold text-ink">Console output</h3>
          <span
            className={`rounded-full px-2 py-1 text-xs ${
              result?.status.id === 3
                ? 'bg-emerald-100 text-emerald-800'
                : runError || (result && result.status.id !== 3)
                  ? 'bg-[#fecaca] text-[#7f1d1d]'
                  : 'bg-black/[0.05] text-black/45'
            }`}
          >
            {status}
          </span>
        </div>
        <pre className="mt-4 min-h-40 whitespace-pre-wrap rounded-lg bg-black p-4 font-mono text-xs leading-6 text-[#d9f99d]">
          {output.join('\n')}
        </pre>
      </aside>
      {compareShare ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button type="button" aria-label="Close code comparison" onClick={() => { setCompareShare(null); onApplyHandled?.(); }} className="absolute inset-0 bg-black/40" />
          <div ref={comparisonDialogRef} role="dialog" aria-modal="true" aria-label="So sánh trước khi áp dụng mã" tabIndex={-1} className="relative max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-xl border border-black/10 bg-white p-5 shadow-2xl outline-none">
            <div className="flex items-start justify-between gap-4">
              <div><h3 className="text-lg font-semibold text-ink">So sánh trước khi áp dụng</h3><p className="mt-1 text-sm text-ink-faint">Mã của bạn chỉ thay đổi sau khi xác nhận. Việc áp dụng không tự chạy hoặc tự nộp bài.</p></div>
              <button type="button" onClick={() => { setCompareShare(null); onApplyHandled?.(); }} className="rounded-md px-2 py-1 text-sm hover:bg-black/[0.05]">Đóng</button>
            </div>
            <div className="mt-4 max-h-[54vh] overflow-auto rounded-lg border border-black/10"><CodeDiffView oldCode={code} newCode={compareShare.sourceCode} /></div>
            <div className="mt-4 flex justify-end gap-2"><Button variant="outline" onClick={() => { setCompareShare(null); onApplyHandled?.(); }}>Hủy</Button><Button onClick={() => { setCode(compareShare.sourceCode); setResult(null); setRunError(null); setCompareShare(null); onApplyHandled?.(); toast.success('Đã áp dụng vào bản nháp cục bộ.'); }}>Xác nhận áp dụng</Button></div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/**
 * PR10 — lesson room mirrors DemoLessonPage (content + sticky aside).
 * LOGIC LOCK: getById, bookmark toggle, complete mutation, quiz link, comments/notes.
 */
export const LessonPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const [requestedShare, setRequestedShare] = useState<CodeShare | null>(null);
  const [activePanel, setActivePanel] = useState<'notes' | 'comments'>('notes');
  const [selectedNoteAnchor, setSelectedNoteAnchor] = useState<{
    text: string;
    anchorStart: number;
    anchorEnd: number;
  }>();
  const reviewStorageKey = `threadlearn:lesson-review:${user?._id ?? 'anonymous'}:${id}`;
  const [reviewProgress, setReviewProgress] = useState<LessonReviewProgress>({
    key: reviewStorageKey,
    explanationReviewed: false,
    mediaReviewed: false,
  });

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(reviewStorageKey);
      const parsed = saved
        ? (JSON.parse(saved) as Partial<Omit<LessonReviewProgress, 'key'>>)
        : {};
      setReviewProgress({
        key: reviewStorageKey,
        explanationReviewed: Boolean(parsed.explanationReviewed),
        mediaReviewed: Boolean(parsed.mediaReviewed),
      });
    } catch {
      setReviewProgress({
        key: reviewStorageKey,
        explanationReviewed: false,
        mediaReviewed: false,
      });
    }
  }, [reviewStorageKey]);

  const setReviewStep = (
    step: 'explanationReviewed' | 'mediaReviewed',
    value: boolean
  ) => {
    setReviewProgress((current) => {
      const base =
        current.key === reviewStorageKey
          ? current
          : { key: reviewStorageKey, explanationReviewed: false, mediaReviewed: false };
      const next = { ...base, [step]: value };
      try {
        window.localStorage.setItem(
          reviewStorageKey,
          JSON.stringify({
            explanationReviewed: next.explanationReviewed,
            mediaReviewed: next.mediaReviewed,
          })
        );
      } catch {
        // Preserve in-memory progress if storage is blocked by the browser.
      }
      return next;
    });
  };

  const {
    data: lesson,
    error,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['lesson', id],
    queryFn: () => lessonsService.getById(id!),
    enabled: !!id,
  });

  const isEnrollmentRequired = getHttpStatus(error) === 403;
  const lessonCourseId = lesson?.courseId;

  // Quizzes are optional per lesson. Resolve availability here so students are
  // never sent to a quiz route that can only return a 404.
  const {
    data: lessonQuiz,
    isLoading: isQuizLoading,
    isError: isQuizUnavailable,
  } = useQuery({
    queryKey: ['quiz-availability', id],
    queryFn: () => quizService.getByLesson(id!),
    enabled: Boolean(id && lesson),
    retry: false,
  });

  const { data: enrollments = [] } = useQuery({
    queryKey: ['my-enrollments'],
    queryFn: enrollmentsService.getMyEnrollments,
    enabled: Boolean(lessonCourseId),
    retry: false,
  });
  const enrollment = enrollments.find((item) => {
    const courseId =
      typeof item.courseId === 'string'
        ? item.courseId
        : (item.courseId?._id ?? item.courseId?.id);
    return courseId === lessonCourseId;
  });
  const isLessonCompleted = Boolean(enrollment?.completedLessons?.includes(id!));

  const { data: courseDetail } = useQuery({
    queryKey: ['course-detail', lessonCourseId],
    queryFn: () => coursesService.getById(lessonCourseId!),
    enabled: Boolean(lessonCourseId),
    retry: false,
  });

  const { prevLesson, nextLesson } = useMemo(() => {
    const lessons = (courseDetail?.lessons ?? [])
      .slice()
      .sort((a, b) => (a.orderIndex ?? a.order ?? 0) - (b.orderIndex ?? b.order ?? 0));
    const idx = lessons.findIndex((item) => item._id === id);
    if (idx < 0) return { prevLesson: undefined, nextLesson: undefined };
    return {
      prevLesson: idx > 0 ? lessons[idx - 1] : undefined,
      nextLesson: idx < lessons.length - 1 ? lessons[idx + 1] : undefined,
    };
  }, [courseDetail?.lessons, id]);

  useEffect(() => {
    if (isError && !isEnrollmentRequired) toast.error('Failed to load lesson');
  }, [isEnrollmentRequired, isError]);

  const { data: isBookmarked = false } = useQuery({
    queryKey: ['bookmark-check', id],
    queryFn: () => bookmarksService.check(id!),
    enabled: !!id,
    retry: false,
  });
  const { mutate: toggleBookmark, isPending: bookmarking } = useMutation({
    mutationFn: () => bookmarksService.toggle(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookmarks'] });
      queryClient.invalidateQueries({ queryKey: ['bookmark-check', id] });
      toast.success(isBookmarked ? 'Bookmark removed' : 'Bookmarked');
    },
    onError: () => toast.error('Failed to toggle bookmark'),
  });

  const { mutate: completeLesson, isPending: completing } = useMutation({
    mutationFn: () => lessonsService.complete(id!),
    onSuccess: (data) => {
      if (data.enrollment) {
        queryClient.setQueryData<Enrollment[]>(['my-enrollments'], (current = []) => {
          const exists = current.some((item) => item._id === data.enrollment?._id);
          return exists
            ? current.map((item) =>
                item._id === data.enrollment?._id ? data.enrollment! : item
              )
            : [...current, data.enrollment!];
        });
      }
      queryClient.invalidateQueries({ queryKey: ['lesson', id] });
      queryClient.invalidateQueries({ queryKey: ['my-enrollments'] });
      queryClient.invalidateQueries({ queryKey: ['gamification-stats'] });
      if (data.courseCompleted) {
        queryClient.invalidateQueries({ queryKey: ['certificates'] });
        toast.success('Course complete. Your certificate is ready.', {
          action: {
            label: 'View certificate',
            onClick: () => router.push('/certificates'),
          },
        });
        return;
      }
      toast.success(
        data.xpRewarded ? `Lesson complete. +${data.xpRewarded} XP` : 'Lesson complete'
      );
    },
    onError: () => toast.error('Failed to complete lesson'),
  });

  const duration = lesson?.estimatedTime ?? lesson?.duration ?? 0;
  const order = lesson?.orderIndex ?? lesson?.order;
  const content = lesson?.contentMarkdown ?? lesson?.content ?? '';
  const runnableSnippet = lesson?.codeSnippets?.find((snippet) =>
    runnableLanguages.has(snippet.language.toLowerCase())
  );
  const hasMarkdownCode = /```[^\n]*\n[\s\S]*?```/.test(content);
  const hasCodeMaterial = Boolean(lesson?.codeSnippets?.length || hasMarkdownCode);
  const requiresMediaReview = Boolean(lesson?.videoUrl || hasCodeMaterial);
  const currentReview =
    reviewProgress.key === reviewStorageKey
      ? reviewProgress
      : { key: reviewStorageKey, explanationReviewed: false, mediaReviewed: false };
  const explanationStepDone = currentReview.explanationReviewed || isLessonCompleted;
  const mediaStepDone = currentReview.mediaReviewed || isLessonCompleted;
  const mediaReviewLabel =
    lesson?.videoUrl && hasCodeMaterial
      ? 'Review the code and video'
      : lesson?.videoUrl
        ? 'Watch the lesson video'
        : runnableSnippet
          ? 'Run the code example'
          : 'Review the code example';
  const canCompleteLesson =
    explanationStepDone && (!requiresMediaReview || mediaStepDone);
  const courseHref =
    typeof lesson?.courseId === 'string' ? `/courses/${lesson.courseId}` : '/courses';

  return (
    <DemoPageRoot>
      {isLoading ? (
        <div className="grid gap-6 xl:grid-cols-[1fr_390px]">
          <div className="space-y-5">
            <div className="h-40 rounded-lg skeleton" />
            <div className="h-80 rounded-lg skeleton" />
          </div>
          <div className="h-64 rounded-lg skeleton" />
        </div>
      ) : isError ? (
        <EmptyState
          icon={<AlertCircle size={36} />}
          title={isEnrollmentRequired ? 'Enrollment required' : 'Could not load lesson'}
          description={
            isEnrollmentRequired
              ? 'Please enroll in this course before opening this lesson.'
              : 'Please try again in a moment'
          }
          action={
            <Button variant="outline" onClick={() => router.back()}>
              Back
            </Button>
          }
        />
      ) : lesson ? (
        <div className="grid gap-6 xl:grid-cols-[1fr_390px]">
          <article className="space-y-5">
            <div className="lesson-header p-5 sm:p-7">
              <Link href={courseHref} className="text-sm text-black/50 hover:text-black">
                Back to course
              </Link>
              <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="mb-3 flex flex-wrap gap-2">
                    {order != null ? (
                      <DemoPill tone="default">Lesson #{order}</DemoPill>
                    ) : null}
                    {duration > 0 ? (
                      <DemoPill tone="blue">
                        <span className="inline-flex items-center gap-1">
                          <Clock size={12} />
                          {duration} min
                        </span>
                      </DemoPill>
                    ) : null}
                    {lesson.videoUrl ? <DemoPill tone="pink">Video</DemoPill> : null}
                  </div>
                  <h1 className="text-3xl font-semibold leading-tight tracking-[-0.035em] text-ink sm:text-4xl">
                    {lesson.title}
                  </h1>
                  {lesson.attachmentUrl ? (
                    <a
                      href={lesson.attachmentUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 inline-block text-sm font-medium text-black/60 underline underline-offset-2 hover:text-black"
                    >
                      Download attachment
                    </a>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => toggleBookmark()}
                  disabled={bookmarking}
                  className={`inline-flex min-h-11 items-center rounded-full px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${
                    isBookmarked
                      ? 'bg-[#d9f99d] text-ink'
                      : 'bg-black text-white hover:bg-black/90'
                  }`}
                >
                  <span className="inline-flex items-center gap-2">
                    <Bookmark size={14} className={isBookmarked ? 'fill-current' : ''} />
                    {isBookmarked ? 'Bookmarked' : 'Bookmark'}
                  </span>
                </button>
              </div>
            </div>

            <div className="lesson-surface p-4 sm:p-6 lg:p-7">
              {lesson.videoUrl ? (
                <div id="lesson-video" className="mb-6 scroll-mt-28">
                  <VideoLessonPlayer
                    videoUrl={lesson.videoUrl}
                    title={lesson.title}
                    lessonId={id!}
                    subtitleTracks={lesson.subtitleTracks}
                    transcript={lesson.transcript}
                    transcriptLanguage={lesson.transcriptLanguage}
                  />
                </div>
              ) : null}
              {content.trim() ? (
                <LessonReader
                  content={content}
                  lessonTitle={lesson.title}
                  checklistStorageKey={`${user?._id ?? 'anonymous'}:${id}`}
                  onReadComplete={() => setReviewStep('explanationReviewed', true)}
                  onTextSelected={(selection) => {
                    setSelectedNoteAnchor(selection);
                    setActivePanel('notes');
                  }}
                />
              ) : (
                <EmptyState
                  icon={<AlertCircle size={32} />}
                  title="Lesson content is unavailable"
                  description="This lesson has not been published with learning content yet. Body must be Markdown (contentMarkdown)."
                />
              )}
              {runnableSnippet ? (
                <LessonCodeRunner
                  key={id}
                  lessonId={id!}
                  courseId={lesson.courseId}
                  language={runnableSnippet.language}
                  exerciseId={`snippet-${lesson.codeSnippets?.indexOf(runnableSnippet) ?? 0}`}
                  initialCode={runnableSnippet.code}
                  userId={user?._id}
                  requestedShare={requestedShare}
                  onApplyHandled={() => setRequestedShare(null)}
                  onReviewed={() => setReviewStep('mediaReviewed', true)}
                />
              ) : null}

              {prevLesson || nextLesson ? (
                <div className="mt-8 grid gap-3 border-t border-black/10 pt-6 sm:grid-cols-2">
                  {prevLesson ? (
                    <Link
                      href={`/lessons/${prevLesson._id}`}
                      className="lesson-route-card group px-4 py-3"
                    >
                      <span className="inline-flex items-center gap-1 text-xs uppercase tracking-[0.14em] text-black/40">
                        <ArrowLeft size={12} /> Bài trước
                      </span>
                      <span className="mt-1 block text-sm font-medium text-ink group-hover:underline">
                        {prevLesson.title}
                      </span>
                    </Link>
                  ) : (
                    <div className="hidden sm:block" />
                  )}
                  {nextLesson ? (
                    <Link
                      href={`/lessons/${nextLesson._id}`}
                      className="lesson-route-card lesson-route-card-primary group px-4 py-3 text-right"
                    >
                      <span className="inline-flex items-center justify-end gap-1 text-xs uppercase tracking-[0.14em] text-white/50">
                        Bài tiếp <ArrowRight size={12} />
                      </span>
                      <span className="mt-1 block text-sm font-medium">
                        {nextLesson.title}
                      </span>
                    </Link>
                  ) : (
                    <div className="hidden sm:block" />
                  )}
                </div>
              ) : null}
            </div>

            <div className="rounded-lg border border-black/10 bg-white p-6 xl:hidden">
              <div className="mb-4 flex gap-2">
                {(['notes', 'comments'] as const).map((panel) => (
                  <button
                    key={panel}
                    type="button"
                    onClick={() => setActivePanel(panel)}
                    className={`rounded-full px-3 py-1.5 text-xs font-medium capitalize ${
                      activePanel === panel
                        ? 'bg-black text-white'
                        : 'bg-black/[0.04] text-black/55'
                    }`}
                  >
                    {panel}
                  </button>
                ))}
              </div>
              {activePanel === 'notes' ? (
                <NotesPanel lessonId={id!} selection={selectedNoteAnchor} />
              ) : (
                <CommentsSection lessonId={id!} onApplyCode={setRequestedShare} />
              )}
            </div>
          </article>

          <aside className="space-y-5 xl:sticky xl:top-24 xl:self-start">
            <div className="lesson-assist-card p-5">
              <Brain size={22} className="lesson-assist-icon" />
              <h2 className="lesson-assist-title mt-4 text-xl font-semibold">
                Need help with this lesson?
              </h2>
              <p className="lesson-assist-copy mt-3 text-sm">
                Open AI Advisor to analyse your own code or ask a focused question.
              </p>
              <button
                type="button"
                onClick={() => router.push('/ai')}
                className="lesson-assist-action mt-5 inline-flex min-h-11 items-center justify-center rounded-full px-5 py-2 text-sm font-semibold"
              >
                Open AI analysis
              </button>
            </div>

            <div className="lesson-assist-card p-5">
              <Zap size={22} className="lesson-assist-icon" />
              <h2 className="lesson-assist-title mt-4 text-xl font-semibold">
                Quiz check-in
              </h2>
              <p className="lesson-assist-copy mt-3 text-sm">
                {lessonQuiz
                  ? 'Lock in this lesson with a short quiz. Timer and auto-submit stay on the quiz flow.'
                  : 'A quiz has not been assigned to this lesson yet.'}
              </p>
              {isQuizLoading ? (
                <span className="mt-5 inline-flex min-h-11 items-center justify-center rounded-full bg-black/10 px-5 py-2 text-sm font-semibold text-black/55">
                  Checking quiz…
                </span>
              ) : lessonQuiz ? (
                <button
                  type="button"
                  onClick={() => router.push(`/quiz/${id}`)}
                  className="lesson-assist-action mt-5 inline-flex min-h-11 items-center justify-center rounded-full px-5 py-2 text-sm font-semibold"
                >
                  Take quiz
                </button>
              ) : isQuizUnavailable ? (
                <span className="mt-5 inline-flex min-h-11 items-center justify-center rounded-full bg-black/10 px-5 py-2 text-sm font-semibold text-black/55">
                  No quiz available
                </span>
              ) : null}
            </div>

            <div className="hidden rounded-lg border border-black/10 bg-white p-5 xl:block">
              <NotesPanel lessonId={id!} selection={selectedNoteAnchor} />
            </div>

            <div className="lesson-checklist-card rounded-lg border p-5">
              <h2 className="font-semibold text-ink">Lesson checklist</h2>
              <p className="mt-1 text-xs leading-5 text-ink-faint">
                Your review steps are saved on this device. Final completion is saved to
                your account.
              </p>
              <div className="mt-4 space-y-2">
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={explanationStepDone}
                  disabled={isLessonCompleted}
                  onClick={() =>
                    setReviewStep(
                      'explanationReviewed',
                      !currentReview.explanationReviewed
                    )
                  }
                  className="lesson-checklist-step"
                >
                  <span
                    className={`lesson-checklist-status ${explanationStepDone ? 'lesson-checklist-status-done' : ''}`}
                  >
                    {explanationStepDone ? <CheckCircle2 size={15} /> : null}
                  </span>
                  <span>
                    <span className="block font-medium text-ink">
                      Read the explanation
                    </span>
                    <span className="mt-0.5 block text-xs text-ink-faint">
                      Mark this after reading the lesson sections.
                    </span>
                  </span>
                </button>

                {requiresMediaReview ? (
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={mediaStepDone}
                    disabled={isLessonCompleted}
                    onClick={() =>
                      setReviewStep('mediaReviewed', !currentReview.mediaReviewed)
                    }
                    className="lesson-checklist-step"
                  >
                    <span
                      className={`lesson-checklist-status ${mediaStepDone ? 'lesson-checklist-status-done' : ''}`}
                    >
                      {mediaStepDone ? <CheckCircle2 size={15} /> : null}
                    </span>
                    <span>
                      <span className="block font-medium text-ink">
                        {mediaReviewLabel}
                      </span>
                      <span className="mt-0.5 block text-xs text-ink-faint">
                        {runnableSnippet
                          ? 'Running the playground checks this automatically.'
                          : 'Check this after reviewing the learning material.'}
                      </span>
                    </span>
                  </button>
                ) : null}

                <div className="lesson-checklist-step lesson-checklist-step-static">
                  <span
                    className={`lesson-checklist-status ${isLessonCompleted ? 'lesson-checklist-status-done' : ''}`}
                  >
                    {isLessonCompleted ? <CheckCircle2 size={15} /> : null}
                  </span>
                  <span>
                    <span className="block font-medium text-ink">
                      Mark lesson complete
                    </span>
                    <span className="mt-0.5 block text-xs text-ink-faint">
                      Saved by ThreadLearn and awards progress/XP.
                    </span>
                  </span>
                </div>
              </div>
              <Button
                size="sm"
                className="mt-5 min-h-11 w-full"
                onClick={() => completeLesson()}
                loading={completing}
                disabled={isLessonCompleted || !canCompleteLesson}
                title={
                  !canCompleteLesson && !isLessonCompleted
                    ? 'Complete the review steps above first'
                    : undefined
                }
              >
                <CheckCircle2 size={14} />
                {isLessonCompleted ? 'Completed' : 'Mark complete'}
              </Button>
              {!isLessonCompleted && !canCompleteLesson ? (
                <p className="mt-2 text-center text-xs text-ink-faint">
                  Complete the review steps above to continue.
                </p>
              ) : null}
            </div>

            <div className="hidden rounded-lg border border-black/10 bg-white p-5 xl:block">
              <CommentsSection lessonId={id!} onApplyCode={setRequestedShare} />
            </div>
          </aside>
        </div>
      ) : (
        <EmptyState
          icon={<AlertCircle size={36} />}
          title="Lesson not found"
          description="This lesson may have been removed"
          action={
            <Button variant="outline" onClick={() => router.push('/courses')}>
              Browse courses
            </Button>
          }
        />
      )}
    </DemoPageRoot>
  );
};

export const NotFoundPage: React.FC = () => {
  const router = useRouter();
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas-cream">
      <div className="text-center">
        <p className="text-[96px] font-light leading-none text-black/5">404</p>
        <h1 className="-mt-4 text-2xl font-semibold text-ink">Page not found</h1>
        <p className="mt-2 text-sm text-black/50">
          The page you are looking for does not exist.
        </p>
        <button
          type="button"
          onClick={() => router.push('/dashboard')}
          className="btn-primary mx-auto mt-6"
        >
          Go home
        </button>
      </div>
    </div>
  );
};
