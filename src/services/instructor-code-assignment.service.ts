import { apiClient } from './apiClient';
import type { ApiResponse } from '../types';
import { normalizeCodeAssignment, normalizeCodeAssignments, type CodeAssignmentWire } from './code-assignment-normalizer';

export interface InstructorExerciseTestCase {
  id?: string;
  _id?: string;
  input: string;
  expectedOutput: string;
  isHidden: boolean;
  points: number;
}

export interface InstructorCodeAssignmentManagement {
  id: string;
  _id: string;
  lessonId: string;
  title: string;
  description: string;
  starterCode: string;
  language: 'javascript' | 'python' | 'java' | 'cpp' | 'c' | string;
  testCases: InstructorExerciseTestCase[];
  totalTestCases: number;
  publicTestCases: number;
  hiddenTestCases?: number;
  timeLimitMs: number;
  memoryLimitKb: number;
  status: 'DRAFT' | 'PUBLISHED' | 'CLOSED' | string;
  deadline?: string | null;
  maxSubmissions?: number | null;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface InstructorCodeAssignmentUpdatePayload {
  title?: string;
  description?: string;
  starterCode?: string;
  language?: 'javascript' | 'python' | 'java' | 'cpp' | 'c';
  testCases?: {
    input: string;
    expectedOutput: string;
    isHidden?: boolean;
    points?: number;
  }[];
  timeLimitMs?: number;
  memoryLimitKb?: number;
  deadline?: string | null;
  maxSubmissions?: number | null;
}

export interface InstructorCodeAssignmentCreatePayload extends InstructorCodeAssignmentUpdatePayload {
  lessonId: string;
  title: string;
  language: 'javascript' | 'python' | 'java' | 'cpp' | 'c';
}

export const instructorCodeAssignmentsService = {
  /**
   * Lists all exercises configured for a specific lessonId.
   */
  listByLesson: async (lessonId: string): Promise<InstructorCodeAssignmentManagement[]> => {
    if (!lessonId) return [];
    const { data } = await apiClient.get<ApiResponse<CodeAssignmentWire[]>>('/exercises', {
      params: { lessonId },
    });
    const items = data?.data || [];
    return normalizeCodeAssignments(items) as InstructorCodeAssignmentManagement[];
  },

  /**
   * Fetches single exercise by exerciseId for management workspace.
   */
  get: async (exerciseId: string): Promise<InstructorCodeAssignmentManagement> => {
    const { data } = await apiClient.get<ApiResponse<CodeAssignmentWire>>(`/exercises/${exerciseId}`);
    return normalizeCodeAssignment(data.data) as InstructorCodeAssignmentManagement;
  },

  /**
   * Creates a new Code Assignment linked to an existing persisted Lesson (assignment or coding).
   * Strips status (server defaults to DRAFT) and protected fields.
   */
  createForExistingLesson: async (payload: InstructorCodeAssignmentCreatePayload): Promise<InstructorCodeAssignmentManagement> => {
    const body: Record<string, unknown> = {
      lessonId: payload.lessonId,
      title: payload.title.trim(),
      language: payload.language,
    };
    if (payload.description !== undefined) body.description = payload.description;
    if (payload.starterCode !== undefined) body.starterCode = payload.starterCode;
    if (payload.testCases !== undefined) body.testCases = payload.testCases;
    if (payload.timeLimitMs !== undefined) body.timeLimitMs = payload.timeLimitMs;
    if (payload.memoryLimitKb !== undefined) body.memoryLimitKb = payload.memoryLimitKb;
    if (payload.deadline !== undefined) body.deadline = payload.deadline;
    if (payload.maxSubmissions !== undefined) body.maxSubmissions = payload.maxSubmissions;

    const { data } = await apiClient.post<ApiResponse<CodeAssignmentWire>>('/exercises', body);
    return normalizeCodeAssignment(data.data) as InstructorCodeAssignmentManagement;
  },

  /**
   * Backward-compatible alias for createForExistingLesson.
   */
  createForExistingCodingLesson: async (payload: InstructorCodeAssignmentCreatePayload): Promise<InstructorCodeAssignmentManagement> => {
    return instructorCodeAssignmentsService.createForExistingLesson(payload);
  },

  /**
   * Updates exercise using strict field allowlist.
   * Strips status, lessonId, totalPoints, createdBy, etc.
   */
  update: async (exerciseId: string, payload: InstructorCodeAssignmentUpdatePayload): Promise<InstructorCodeAssignmentManagement> => {
    const body: Record<string, unknown> = {};
    if (payload.title !== undefined) body.title = payload.title.trim();
    if (payload.description !== undefined) body.description = payload.description;
    if (payload.starterCode !== undefined) body.starterCode = payload.starterCode;
    if (payload.language !== undefined) body.language = payload.language;
    if (payload.testCases !== undefined) body.testCases = payload.testCases;
    if (payload.timeLimitMs !== undefined) body.timeLimitMs = payload.timeLimitMs;
    if (payload.memoryLimitKb !== undefined) body.memoryLimitKb = payload.memoryLimitKb;
    if (payload.deadline !== undefined) body.deadline = payload.deadline;
    if (payload.maxSubmissions !== undefined) body.maxSubmissions = payload.maxSubmissions;

    const { data } = await apiClient.patch<ApiResponse<CodeAssignmentWire>>(`/exercises/${exerciseId}`, body);
    return normalizeCodeAssignment(data.data) as InstructorCodeAssignmentManagement;
  },
};
