import { fireEvent, render, screen } from '@testing-library/react';
import type { AdaptivePlanSnapshot, Enrollment } from '../../types';
import { hasAdaptiveCourseEnrollment, PlanView } from './AdaptiveLearningPage';

const course = {
  id: 'course-1',
  slug: 'js-concurrency-fundamentals',
  title: 'JavaScript Concurrency Fundamentals',
};

const plan: AdaptivePlanSnapshot = {
  version: 1,
  diagnosticVersion: 1,
  goal: 'COMPLETE_COURSE',
  scope: 'FULL_COURSE',
  coverage: {
    selectedLessons: 1,
    totalRemainingLessons: 1,
    percentage: 100,
  },
  generatedBy: 'RULE_ENGINE',
  summary: 'A focused roadmap.',
  strengths: [],
  weaknesses: [],
  nextBestLessonId: 'lesson-1',
  coachMessage: 'Start with the weakest skill.',
  generatedAt: '2026-08-04T00:00:00.000Z',
  weeklyPlan: [
    {
      week: 1,
      focusSkillKey: 'RUNTIME_EVENT_LOOP',
      focusLabel: 'Runtime & Event Loop',
      goal: 'Improve event loop fundamentals',
      reason: 'This is the weakest demonstrated skill.',
      estimatedMinutes: 30,
      lessons: [
        {
          lessonId: 'lesson-1',
          slug: 'event-loop',
          title: 'Event Loop fundamentals',
          estimatedMinutes: 30,
          isReview: false,
          isCompleted: false,
        },
      ],
    },
  ],
};

const baseProps = {
  plan,
  course,
  currentVersion: 1,
  history: [plan],
  generating: false,
  checkingEnrollment: false,
  enrolling: false,
  onEnroll: vi.fn(),
  onGenerate: vi.fn(),
  onShowResults: vi.fn(),
  onRetake: vi.fn(),
  onPreview: vi.fn(),
};

describe('adaptive roadmap enrollment access', () => {
  it('keeps lessons non-navigable and offers enrollment before course access', () => {
    const onEnroll = vi.fn();
    render(<PlanView {...baseProps} isEnrolled={false} onEnroll={onEnroll} />);

    expect(screen.getByText('Recommended course')).toBeInTheDocument();
    expect(screen.getByText('Full course roadmap')).toBeInTheDocument();
    expect(screen.getByText('1/1')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View course' })).toHaveAttribute(
      'href',
      '/courses/course-1',
    );
    expect(screen.queryByRole('link', { name: /Event Loop fundamentals/i })).toBeNull();
    expect(screen.getByText('Locked')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Enroll and unlock' }));
    expect(onEnroll).toHaveBeenCalledOnce();
  });

  it('turns roadmap lessons into links after enrollment', () => {
    render(<PlanView {...baseProps} isEnrolled />);

    expect(screen.getByText(/lessons in this roadmap are unlocked/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Event Loop fundamentals/i })).toHaveAttribute(
      'href',
      '/lessons/lesson-1',
    );
    expect(screen.queryByText('Locked')).toBeNull();
  });

  it('visibly marks a lesson completed from current progress', () => {
    const completedPlan: AdaptivePlanSnapshot = {
      ...plan,
      weeklyPlan: [
        {
          ...plan.weeklyPlan[0],
          lessons: [{ ...plan.weeklyPlan[0].lessons[0], isCompleted: true }],
        },
      ],
    };

    render(<PlanView {...baseProps} plan={completedPlan} isEnrolled />);

    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Event Loop fundamentals.*Completed/i })).toBeInTheDocument();
  });

  it('matches enrollment records by populated course id or slug', () => {
    const populatedEnrollment = {
      _id: 'enrollment-1',
      userId: 'user-1',
      courseId: { _id: 'different-id', slug: course.slug },
      progress: 0,
      completedLessons: [],
      completed: false,
    } satisfies Enrollment;

    expect(hasAdaptiveCourseEnrollment([populatedEnrollment], course)).toBe(true);
    expect(
      hasAdaptiveCourseEnrollment(
        [{ ...populatedEnrollment, courseId: course.id }],
        course,
      ),
    ).toBe(true);
    expect(hasAdaptiveCourseEnrollment([], course)).toBe(false);
  });
});
