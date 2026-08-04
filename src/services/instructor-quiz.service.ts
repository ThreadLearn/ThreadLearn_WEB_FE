import { apiClient } from './apiClient';
import type { ApiResponse, PaginationMeta } from '../types';

export interface InstructorQuizManagement {
  id: string;
  lessonId: string;
  title: string;
  description?: string;
  passingScorePercent: number;
  timeLimitSeconds: number;
  useQuestionBank: boolean;
  randomQuestionCount: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface InstructorQuizUpdatePayload {
  title?: string;
  description?: string;
  passingScorePercent?: number;
  timeLimitSeconds?: number;
}

export interface InstructorQuizBankSummary {
  quizId: string;
  lessonId: string;
  version: number;
  questionCount: number;
  activeQuestionCount: number;
  totalQuestionCount: number;
  disabledQuestionCount: number;
  status: 'draft' | 'published' | 'archived';
  lastImportId?: string;
}

export interface InstructorQuestionOption {
  optionId: string;
  text: string;
}

export interface InstructorQuizBankQuestion {
  id: string;
  quizId: string;
  questionText: string;
  options: InstructorQuestionOption[];
  correctOptionId: string;
  explanation?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  tags: string[];
  status: 'active' | 'disabled';
  bankVersion?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface InstructorQuestionPayload {
  questionText: string;
  options: InstructorQuestionOption[];
  correctOptionId: string;
  explanation?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  tags?: string[];
}

export interface InstructorQuestionListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: 'active' | 'disabled';
  difficulty?: 'easy' | 'medium' | 'hard';
  tag?: string;
  sort?: string;
}

export interface InstructorQuestionListResult {
  items: InstructorQuizBankQuestion[];
  meta: PaginationMeta;
}

/**
 * Normalizes wire quiz response to canonical InstructorQuizManagement format.
 * Prefers canonical passingScorePercent and timeLimitSeconds over legacy names.
 * Explicitly strips xpReward.
 */
export function normalizeInstructorQuiz(wire: any): InstructorQuizManagement {
  const passingScorePercent = typeof wire.passingScorePercent === 'number'
    ? wire.passingScorePercent
    : (typeof wire.passingScore === 'number' ? wire.passingScore : 80);

  const timeLimitSeconds = typeof wire.timeLimitSeconds === 'number'
    ? wire.timeLimitSeconds
    : (typeof wire.timeLimit === 'number' ? wire.timeLimit : 1800);

  return {
    id: String(wire.id || wire._id || ''),
    lessonId: String(wire.lessonId || ''),
    title: String(wire.title || ''),
    description: wire.description ? String(wire.description) : undefined,
    passingScorePercent,
    timeLimitSeconds,
    useQuestionBank: wire.useQuestionBank === true,
    randomQuestionCount: typeof wire.randomQuestionCount === 'number' ? wire.randomQuestionCount : 5,
    createdAt: wire.createdAt ? String(wire.createdAt) : undefined,
    updatedAt: wire.updatedAt ? String(wire.updatedAt) : undefined,
  };
}

export const instructorQuizzesService = {
  /**
   * Resolves the Quiz associated with a specific lessonId for the authenticated instructor.
   * Calls GET /v1/quiz and finds the quiz linked to lessonId. Returns null if not found.
   */
  getQuizForLesson: async (lessonId: string): Promise<InstructorQuizManagement | null> => {
    if (!lessonId) return null;
    const { data } = await apiClient.get<ApiResponse<any[]>>('/quiz');
    const items = data?.data || [];
    const match = items.find((q: any) => String(q.lessonId) === String(lessonId));
    if (!match) return null;
    return normalizeInstructorQuiz(match);
  },

  /**
   * Fetches a quiz by quizId for the instructor.
   */
  getQuizById: async (quizId: string): Promise<InstructorQuizManagement> => {
    const { data } = await apiClient.get<ApiResponse<any>>(`/quiz/${quizId}`);
    return normalizeInstructorQuiz(data.data);
  },

  /**
   * Updates quiz metadata for the instructor.
   * Sends ONLY canonical fields (passingScorePercent, timeLimitSeconds).
   */
  updateQuiz: async (quizId: string, payload: InstructorQuizUpdatePayload): Promise<InstructorQuizManagement> => {
    const body: Record<string, unknown> = {};
    if (payload.title !== undefined) body.title = payload.title;
    if (payload.description !== undefined) body.description = payload.description;
    if (payload.passingScorePercent !== undefined) body.passingScorePercent = payload.passingScorePercent;
    if (payload.timeLimitSeconds !== undefined) body.timeLimitSeconds = payload.timeLimitSeconds;

    const { data } = await apiClient.put<ApiResponse<any>>(`/quiz/${quizId}`, body);
    return normalizeInstructorQuiz(data.data);
  },

  /**
   * Fetches summary metadata for the Quiz Question Bank.
   */
  getBankSummary: async (quizId: string): Promise<InstructorQuizBankSummary> => {
    const { data } = await apiClient.get<ApiResponse<InstructorQuizBankSummary>>(`/quiz/${quizId}/question-bank`);
    return data.data;
  },

  /**
   * Lists questions in the Quiz Question Bank with filtering and pagination.
   */
  listQuestions: async (quizId: string, params: InstructorQuestionListParams = {}): Promise<InstructorQuestionListResult> => {
    const { data } = await apiClient.get<ApiResponse<InstructorQuizBankQuestion[]>>(`/quiz/${quizId}/question-bank/questions`, {
      params,
    });
    return {
      items: data.data || [],
      meta: data.meta ?? {
        page: params.page ?? 1,
        limit: params.limit ?? 20,
        total: (data.data || []).length,
        totalPages: 1,
      },
    };
  },

  /**
   * Fetches single question by questionId.
   */
  getQuestionById: async (quizId: string, questionId: string): Promise<InstructorQuizBankQuestion> => {
    const { data } = await apiClient.get<ApiResponse<InstructorQuizBankQuestion>>(`/quiz/${quizId}/question-bank/questions/${questionId}`);
    return data.data;
  },

  /**
   * Creates a new question in the Quiz Question Bank.
   */
  createQuestion: async (quizId: string, payload: InstructorQuestionPayload): Promise<InstructorQuizBankQuestion> => {
    const { data } = await apiClient.post<ApiResponse<InstructorQuizBankQuestion>>(`/quiz/${quizId}/question-bank/questions`, payload);
    return data.data;
  },

  /**
   * Updates an existing question in the Quiz Question Bank.
   */
  updateQuestion: async (quizId: string, questionId: string, payload: Partial<InstructorQuestionPayload>): Promise<InstructorQuizBankQuestion> => {
    const { data } = await apiClient.patch<ApiResponse<InstructorQuizBankQuestion>>(`/quiz/${quizId}/question-bank/questions/${questionId}`, payload);
    return data.data;
  },

  /**
   * Toggles question status between 'active' and 'disabled'.
   */
  setQuestionStatus: async (quizId: string, questionId: string, status: 'active' | 'disabled'): Promise<InstructorQuizBankQuestion> => {
    const { data } = await apiClient.patch<ApiResponse<InstructorQuizBankQuestion>>(`/quiz/${quizId}/question-bank/questions/${questionId}/status`, { status });
    return data.data;
  },
};
