import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InstructorCodeAssignmentEditorPage } from './InstructorCodeAssignmentEditorPage';
import { instructorCodeAssignmentsService, lessonsService, coursesService } from '../../services';

vi.mock('../../services', () => ({
  instructorCodeAssignmentsService: {
    get: vi.fn(),
    update: vi.fn(),
    listByLesson: vi.fn(),
    createForExistingCodingLesson: vi.fn(),
  },
  lessonsService: {
    getById: vi.fn(),
  },
  coursesService: {
    getById: vi.fn(),
  },
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

describe('InstructorCodeAssignmentEditorPage UI & Local Identity', () => {
  const sampleExercise = {
    id: 'ex-real-777',
    _id: 'ex-real-777',
    lessonId: 'lesson-123',
    title: 'Sample Coding Exercise',
    description: 'Sample Problem Statement',
    starterCode: 'function solve() {}',
    language: 'javascript',
    timeLimitMs: 5000,
    memoryLimitKb: 131072,
    status: 'DRAFT',
    testCases: [
      { id: 'tc-1', input: '1 2', expectedOutput: '3', isHidden: false, points: 1 },
      { id: 'tc-2', input: '5 5', expectedOutput: '10', isHidden: true, points: 2 },
    ],
    totalTestCases: 2,
    publicTestCases: 1,
    hiddenTestCases: 1,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(instructorCodeAssignmentsService.get).mockResolvedValue(sampleExercise as any);
    vi.mocked(lessonsService.getById).mockResolvedValue({ id: 'lesson-123', courseId: 'course-abc', isLocked: false } as any);
    vi.mocked(coursesService.getById).mockResolvedValue({ course: { id: 'course-abc', status: 'draft' } } as any);
  });

  it('renders exercise configuration and test cases without exposing Run Preview, status select, or delete exercise buttons', async () => {
    render(<InstructorCodeAssignmentEditorPage exerciseId="ex-real-777" />);

    expect(await screen.findByDisplayValue('Sample Coding Exercise')).toBeInTheDocument();
    expect(screen.getByDisplayValue('function solve() {}')).toBeInTheDocument();
    expect(screen.getByText('Public Sample')).toBeInTheDocument();
    expect(screen.getByText('Hidden Evaluation')).toBeInTheDocument();

    // Prohibited controls (Run Preview, Delete Exercise, Status Select) should NOT exist
    expect(screen.queryByRole('button', { name: /run public preview|run preview/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /delete exercise/i })).toBeNull();
    expect(screen.queryByRole('combobox', { name: /exercise status/i })).toBeNull();
  });

  it('strips clientKey, id, and _id from testCases when sending update payload', async () => {
    vi.mocked(instructorCodeAssignmentsService.update).mockResolvedValueOnce(sampleExercise as any);

    render(<InstructorCodeAssignmentEditorPage exerciseId="ex-real-777" />);

    const saveBtn = await screen.findByRole('button', { name: /Save Configuration/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(instructorCodeAssignmentsService.update).toHaveBeenCalledTimes(1);
    });

    const sentPayload = vi.mocked(instructorCodeAssignmentsService.update).mock.calls[0]?.[1] as any;
    expect(sentPayload.testCases).toBeDefined();
    expect(sentPayload.testCases.length).toBe(2);

    for (const tc of sentPayload.testCases) {
      expect(tc.clientKey).toBeUndefined();
      expect(tc.id).toBeUndefined();
      expect(tc._id).toBeUndefined();
      expect(tc.persistedId).toBeUndefined();
      expect(Object.keys(tc).sort()).toEqual(['expectedOutput', 'input', 'isHidden', 'points']);
    }
  });

  it('renders read-only mode when course status is hidden, published, or archived', async () => {
    vi.mocked(coursesService.getById).mockResolvedValueOnce({ course: { id: 'course-abc', status: 'published' } } as any);

    render(<InstructorCodeAssignmentEditorPage exerciseId="ex-real-777" />);

    expect(await screen.findByText((content) => content.includes('Read-Only'))).toBeInTheDocument();
    expect(screen.getByDisplayValue('Sample Coding Exercise')).toBeDisabled();
    expect(screen.queryByRole('button', { name: /\+ Add Test Case/i })).toBeNull();
  });

  it('renders test case inputs safely without dangerouslySetInnerHTML', async () => {
    const scriptExercise = {
      ...sampleExercise,
      testCases: [
        { id: 'tc-xss', input: 'xss-payload-test', expectedOutput: 'output-test', isHidden: false, points: 1 },
      ],
    };
    vi.mocked(instructorCodeAssignmentsService.get).mockResolvedValueOnce(scriptExercise as any);

    render(<InstructorCodeAssignmentEditorPage exerciseId="ex-real-777" />);

    const elements = await screen.findAllByText((content) => content.includes('xss-payload-test'));
    expect(elements.length).toBeGreaterThan(0);
    expect(elements[0].tagName).toBe('PRE');
  });

  it('switches to read-only mode when a 403 error is returned during mutation', async () => {
    vi.mocked(instructorCodeAssignmentsService.update).mockRejectedValueOnce({
      status: 403,
      response: { data: { message: 'Forbidden' } },
    });

    render(<InstructorCodeAssignmentEditorPage exerciseId="ex-real-777" />);

    const saveBtn = await screen.findByRole('button', { name: /Save Configuration/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(screen.getByText((content) => content.includes('Read-Only'))).toBeInTheDocument();
    });
  });
});
