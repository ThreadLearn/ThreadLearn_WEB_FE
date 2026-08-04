import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import InstructorCourseEditorPage from './InstructorCourseEditorPage';
import { coursesService, sectionsService, instructorLessonsService, instructorCodeAssignmentsService } from '../../services';

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useParams: () => ({ id: 'course-100' }),
  useRouter: () => ({ push: mockPush }),
}));

vi.mock('../../services', () => ({
  coursesService: {
    getMyInstructorCourseById: vi.fn(),
    updateMyInstructorCourse: vi.fn(),
    uploadMyInstructorCourseThumbnail: vi.fn(),
  },
  sectionsService: {
    listByCourse: vi.fn(),
  },
  instructorLessonsService: {
    listBySection: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
    reorder: vi.fn(),
  },
  instructorQuizzesService: {
    getQuizForLesson: vi.fn(),
  },
  instructorCodeAssignmentsService: {
    listByLesson: vi.fn(),
    createForExistingLesson: vi.fn(),
  },
}));

function renderPage(courseId = 'course-100') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <InstructorCourseEditorPage courseId={courseId} />
    </QueryClientProvider>
  );
}

describe('InstructorCourseEditorPage Assignment & Coding Lesson integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders Manage Assignment button using real exercise.id for assignment lesson with 1 exercise', async () => {
    vi.mocked(coursesService.getMyInstructorCourseById).mockResolvedValueOnce({
      id: 'course-100', title: 'Course 100', status: 'draft',
    } as any);
    vi.mocked(sectionsService.listByCourse).mockResolvedValueOnce([
      { id: 'sec-1', title: 'Section 1' },
    ] as any);
    vi.mocked(instructorLessonsService.listBySection).mockResolvedValueOnce([
      { id: 'les-asgn', title: 'Assignment Lesson 1', lessonType: 'assignment', isLocked: false },
    ] as any);
    vi.mocked(instructorCodeAssignmentsService.listByLesson).mockResolvedValueOnce([
      { id: 'ex-real-99', lessonId: 'les-asgn', title: 'Exercise 99', language: 'javascript' },
    ] as any);

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Assignment Lesson 1')).toBeInTheDocument();
    });

    const manageBtn = await screen.findByTitle('Manage Assignment');
    expect(manageBtn).toBeInTheDocument();
    expect(manageBtn.getAttribute('href')).toBe('/instructor/code-assignments/ex-real-99/edit');
    expect(manageBtn.getAttribute('href')).not.toBe('/instructor/code-assignments/les-asgn/edit');
  });

  it('renders Multiple assignments configured badge and links for all exercises when multiple exist', async () => {
    vi.mocked(coursesService.getMyInstructorCourseById).mockResolvedValueOnce({
      id: 'course-100', title: 'Course 100', status: 'draft',
    } as any);
    vi.mocked(sectionsService.listByCourse).mockResolvedValueOnce([
      { id: 'sec-1', title: 'Section 1' },
    ] as any);
    vi.mocked(instructorLessonsService.listBySection).mockResolvedValueOnce([
      { id: 'les-multi', title: 'Multi Lesson', lessonType: 'assignment', isLocked: false },
    ] as any);
    vi.mocked(instructorCodeAssignmentsService.listByLesson).mockResolvedValueOnce([
      { id: 'ex-1', lessonId: 'les-multi', title: 'First Task' },
      { id: 'ex-2', lessonId: 'les-multi', title: 'Second Task' },
    ] as any);

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Multiple assignments configured')).toBeInTheDocument();
    });

    const link1 = screen.getByTitle('Manage First Task');
    const link2 = screen.getByTitle('Manage Second Task');
    expect(link1.getAttribute('href')).toBe('/instructor/code-assignments/ex-1/edit');
    expect(link2.getAttribute('href')).toBe('/instructor/code-assignments/ex-2/edit');
  });

  it('renders Configure Assignment button for assignment lesson without exercise in draft course', async () => {
    vi.mocked(coursesService.getMyInstructorCourseById).mockResolvedValueOnce({
      id: 'course-100', title: 'Draft Course', status: 'draft',
    } as any);
    vi.mocked(sectionsService.listByCourse).mockResolvedValueOnce([
      { id: 'sec-1', title: 'Section 1' },
    ] as any);
    vi.mocked(instructorLessonsService.listBySection).mockResolvedValueOnce([
      { id: 'les-empty', title: 'Empty Assignment Lesson', lessonType: 'assignment', isLocked: false },
    ] as any);
    vi.mocked(instructorCodeAssignmentsService.listByLesson).mockResolvedValueOnce([]);

    renderPage();

    const configureBtn = await screen.findByTitle('Configure Assignment');
    expect(configureBtn).toBeInTheDocument();
  });

  it('refetches before create and redirects to newly created exercise on success without sending status field', async () => {
    vi.mocked(coursesService.getMyInstructorCourseById).mockResolvedValueOnce({
      id: 'course-100', title: 'Draft Course', status: 'draft',
    } as any);
    vi.mocked(sectionsService.listByCourse).mockResolvedValueOnce([
      { id: 'sec-1', title: 'Section 1' },
    ] as any);
    vi.mocked(instructorLessonsService.listBySection).mockResolvedValueOnce([
      { id: 'les-new', title: 'New Exercise Lesson', lessonType: 'assignment', isLocked: false },
    ] as any);
    vi.mocked(instructorCodeAssignmentsService.listByLesson)
      .mockResolvedValueOnce([]) // initial check
      .mockResolvedValueOnce([]); // refetch before POST

    vi.mocked(instructorCodeAssignmentsService.createForExistingLesson).mockResolvedValueOnce({
      id: 'ex-created-777',
      lessonId: 'les-new',
      title: 'New Exercise Lesson',
      language: 'javascript',
      testCases: [],
      totalTestCases: 0,
      publicTestCases: 0,
      timeLimitMs: 2000,
      memoryLimitKb: 131072,
      status: 'DRAFT',
    } as any);

    renderPage();

    const configureBtn = await screen.findByTitle('Configure Assignment');
    fireEvent.click(configureBtn);

    await waitFor(() => {
      expect(instructorCodeAssignmentsService.createForExistingLesson).toHaveBeenCalledWith({
        lessonId: 'les-new',
        title: 'New Exercise Lesson',
        language: 'javascript',
      });
    });

    const sentPayload = vi.mocked(instructorCodeAssignmentsService.createForExistingLesson).mock.calls[0]?.[0] as any;
    expect(sentPayload.status).toBeUndefined();
    expect(sentPayload.lessonId).toBe('les-new');

    expect(mockPush).toHaveBeenCalledWith('/instructor/code-assignments/ex-created-777/edit');
    expect(mockPush).not.toHaveBeenCalledWith('/instructor/code-assignments/les-new/edit');
  });

  it('redirects to existing exercise if refetch finds exercise already created', async () => {
    vi.mocked(coursesService.getMyInstructorCourseById).mockResolvedValueOnce({
      id: 'course-100', title: 'Draft Course', status: 'draft',
    } as any);
    vi.mocked(sectionsService.listByCourse).mockResolvedValueOnce([
      { id: 'sec-1', title: 'Section 1' },
    ] as any);
    vi.mocked(instructorLessonsService.listBySection).mockResolvedValueOnce([
      { id: 'les-race', title: 'Race Condition Lesson', lessonType: 'assignment', isLocked: false },
    ] as any);
    vi.mocked(instructorCodeAssignmentsService.listByLesson)
      .mockResolvedValueOnce([]) // initial check
      .mockResolvedValueOnce([
        { id: 'ex-race-found', lessonId: 'les-race', title: 'Already Created' },
      ] as any); // refetch finds existing!

    renderPage();

    const configureBtn = await screen.findByTitle('Configure Assignment');
    fireEvent.click(configureBtn);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/instructor/code-assignments/ex-race-found/edit');
    });

    expect(instructorCodeAssignmentsService.createForExistingLesson).not.toHaveBeenCalled();
  });

  it('renders Read-Only No Assignment Configured badge when course is published/hidden/archived', async () => {
    vi.mocked(coursesService.getMyInstructorCourseById).mockResolvedValueOnce({
      id: 'course-100', title: 'Published Course', status: 'published',
    } as any);
    vi.mocked(sectionsService.listByCourse).mockResolvedValueOnce([
      { id: 'sec-1', title: 'Section 1' },
    ] as any);
    vi.mocked(instructorLessonsService.listBySection).mockResolvedValueOnce([
      { id: 'les-pub', title: 'Published Lesson', lessonType: 'assignment', isLocked: false },
    ] as any);
    vi.mocked(instructorCodeAssignmentsService.listByLesson).mockResolvedValueOnce([]);

    renderPage();

    const badge = await screen.findByTitle('No Assignment Configured');
    expect(badge).toBeInTheDocument();
    expect(screen.queryByTitle('Configure Assignment')).not.toBeInTheDocument();
  });
});
