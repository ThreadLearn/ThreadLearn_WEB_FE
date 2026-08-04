import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./apiClient', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

import { apiClient } from './apiClient';
import { learningPlanService } from './index';

describe('learningPlanService adaptive learning API', () => {
  beforeEach(() => vi.clearAllMocks());

  it('uses the adaptive diagnostic, profile, plan, and history endpoints', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: { data: {} } });
    vi.mocked(apiClient.post).mockResolvedValue({ data: { data: {} } });
    const payload = {
      assessmentId: '64b000000000000000000001',
      goal: 'INTERVIEW_PREP' as const,
      weeklyHours: 4,
      answers: { 'quiz:0': 2 },
    };

    await learningPlanService.getAdaptiveDiagnostic('course-slug');
    await learningPlanService.getAdaptiveProfile('course-slug');
    await learningPlanService.submitAdaptiveDiagnostic('course-slug', payload);
    await learningPlanService.generateAdaptivePlan('course-slug');
    await learningPlanService.getAdaptivePlan('course-slug');
    await learningPlanService.getAdaptivePlanHistory('course-slug');

    expect(apiClient.get).toHaveBeenNthCalledWith(
      1,
      '/learning-plan/adaptive/diagnostic/course-slug',
      { timeout: 15_000 },
    );
    expect(apiClient.get).toHaveBeenNthCalledWith(
      2,
      '/learning-plan/adaptive/me/course-slug'
    );
    expect(apiClient.post).toHaveBeenNthCalledWith(
      1,
      '/learning-plan/adaptive/diagnostic/course-slug',
      payload
    );
    expect(apiClient.post).toHaveBeenNthCalledWith(
      2,
      '/learning-plan/adaptive/plan/course-slug'
    );
    expect(apiClient.get).toHaveBeenNthCalledWith(
      3,
      '/learning-plan/adaptive/plan/course-slug'
    );
    expect(apiClient.get).toHaveBeenNthCalledWith(
      4,
      '/learning-plan/adaptive/plan/course-slug/history'
    );
  });
});
