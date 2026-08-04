import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InstructorQuizEditorPage } from './InstructorQuizEditorPage';
import { instructorQuizzesService, lessonsService, coursesService } from '../../services';

vi.mock('../../services', () => ({
  instructorQuizzesService: {
    getQuizById: vi.fn(),
    updateQuiz: vi.fn(),
    getBankSummary: vi.fn(),
    listQuestions: vi.fn(),
    createQuestion: vi.fn(),
    updateQuestion: vi.fn(),
    setQuestionStatus: vi.fn(),
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

describe('InstructorQuizEditorPage UI', () => {
  const sampleQuiz = {
    id: 'quiz-real-999',
    lessonId: 'lesson-123',
    title: 'Sample Quiz Title',
    description: 'Sample Description',
    passingScorePercent: 80,
    timeLimitSeconds: 1800,
    useQuestionBank: true,
    randomQuestionCount: 5,
  };

  const sampleQuestion = {
    id: 'q-1',
    quizId: 'quiz-real-999',
    questionText: 'What is 2 + 2?',
    options: [
      { optionId: 'o1', text: '3' },
      { optionId: 'o2', text: '4' },
    ],
    correctOptionId: 'o2',
    explanation: 'Basic math',
    difficulty: 'easy' as const,
    tags: ['math'],
    status: 'active' as const,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(instructorQuizzesService.getQuizById).mockResolvedValue(sampleQuiz as any);
    vi.mocked(lessonsService.getById).mockResolvedValue({ id: 'lesson-123', courseId: 'course-abc', isLocked: false } as any);
    vi.mocked(coursesService.getById).mockResolvedValue({ course: { id: 'course-abc', status: 'draft' } } as any);
    vi.mocked(instructorQuizzesService.getBankSummary).mockResolvedValue({
      quizId: 'quiz-real-999',
      lessonId: 'lesson-123',
      version: 1,
      questionCount: 5,
      activeQuestionCount: 5,
      totalQuestionCount: 5,
      disabledQuestionCount: 0,
      status: 'published',
    } as any);
    vi.mocked(instructorQuizzesService.listQuestions).mockResolvedValue({
      items: [sampleQuestion as any],
      meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });
  });

  it('renders quiz metadata and question list without exposing xpReward or delete controls', async () => {
    render(<InstructorQuizEditorPage quizId="quiz-real-999" />);

    expect(await screen.findByDisplayValue('Sample Quiz Title')).toBeInTheDocument();
    expect(screen.getByText('What is 2 + 2?')).toBeInTheDocument();

    // xpReward & editable randomQuestionCount input should NOT exist
    expect(screen.queryByLabelText(/xp/i)).toBeNull();
    expect(screen.queryByLabelText(/random question count/i)).toBeNull();

    // Read-only text display for randomQuestionCount should exist
    expect(screen.getByText('Random Questions per Attempt')).toBeInTheDocument();
    expect(screen.getAllByText('5').length).toBeGreaterThan(0);

    // Prohibited controls (Delete Quiz, Hard-delete Question, Drag & Drop Reorder) should NOT be rendered
    expect(screen.queryByRole('button', { name: /delete quiz/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /delete question/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /reorder/i })).toBeNull();
  });

  it('renders read-only mode when course status is hidden, published, or archived', async () => {
    vi.mocked(coursesService.getById).mockResolvedValueOnce({ course: { id: 'course-abc', status: 'hidden' } } as any);

    render(<InstructorQuizEditorPage quizId="quiz-real-999" />);

    expect(await screen.findByText(/Read-Only/i)).toBeInTheDocument();
    expect(screen.getByDisplayValue('Sample Quiz Title')).toBeDisabled();
    expect(screen.queryByRole('button', { name: /\+ Add Question/i })).toBeNull();
  });

  it('renders text safely as plain text without dangerouslySetInnerHTML', async () => {
    const scriptQuestion = {
      ...sampleQuestion,
      questionText: '<script>alert("xss")</script>',
    };
    vi.mocked(instructorQuizzesService.listQuestions).mockResolvedValueOnce({
      items: [scriptQuestion as any],
      meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });

    render(<InstructorQuizEditorPage quizId="quiz-real-999" />);

    const element = await screen.findByText('<script>alert("xss")</script>');
    expect(element).toBeInTheDocument();
    expect(element.tagName).toBe('H3');
  });

  it('handles 409 conflict gracefully when disabling a question below minimum requirement', async () => {
    vi.mocked(instructorQuizzesService.setQuestionStatus).mockRejectedValueOnce({
      status: 409,
      response: { data: { message: 'At least 5 active questions are required.' } },
    });

    render(<InstructorQuizEditorPage quizId="quiz-real-999" />);

    const disableBtn = await screen.findByRole('button', { name: /Disable/i });
    fireEvent.click(disableBtn);

    await waitFor(() => {
      expect(instructorQuizzesService.setQuestionStatus).toHaveBeenCalledWith('quiz-real-999', 'q-1', 'disabled');
    });
  });

  it('switches to read-only mode when a 403 error is returned during mutation', async () => {
    vi.mocked(instructorQuizzesService.updateQuiz).mockRejectedValueOnce({
      status: 403,
      response: { data: { message: 'Forbidden' } },
    });

    render(<InstructorQuizEditorPage quizId="quiz-real-999" />);

    const saveBtn = await screen.findByRole('button', { name: /Save Settings/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(screen.getByText(/Read-Only/i)).toBeInTheDocument();
    });
  });
});
