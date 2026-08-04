import { describe, it, expect, vi, beforeEach } from 'vitest';
import { instructorQuizzesService, normalizeInstructorQuiz } from './instructor-quiz.service';
import { apiClient } from './apiClient';

vi.mock('./apiClient', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
  },
}));

describe('instructorQuizzesService facade', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('quizId resolution & getQuizForLesson', () => {
    it('resolves quizId from persisted quiz list matching lessonId without using lessonId as quizId', async () => {
      vi.mocked(apiClient.get).mockResolvedValueOnce({
        data: {
          data: [
            { id: 'quiz-real-123', lessonId: 'lesson-456', title: 'Quiz A', passingScorePercent: 80, timeLimitSeconds: 1800, useQuestionBank: true },
          ],
        },
      } as any);

      const quiz = await instructorQuizzesService.getQuizForLesson('lesson-456');

      expect(apiClient.get).toHaveBeenCalledWith('/quiz');
      expect(quiz).not.toBeNull();
      expect(quiz?.id).toBe('quiz-real-123'); // quizId is quiz-real-123, NOT lesson-456!
      expect(quiz?.lessonId).toBe('lesson-456');
    });

    it('returns null when no quiz exists for the given lessonId', async () => {
      vi.mocked(apiClient.get).mockResolvedValueOnce({
        data: {
          data: [
            { id: 'quiz-real-123', lessonId: 'lesson-other', title: 'Other' },
          ],
        },
      } as any);

      const quiz = await instructorQuizzesService.getQuizForLesson('lesson-missing');
      expect(quiz).toBeNull();
    });
  });

  describe('canonical normalization and xpReward removal', () => {
    it('normalizes legacy passingScore and timeLimit to canonical passingScorePercent and timeLimitSeconds while stripping xpReward', () => {
      const wire = {
        _id: 'quiz-1',
        lessonId: 'lesson-1',
        title: 'Legacy Quiz',
        passingScore: 75,
        timeLimit: 1200,
        xpReward: 500, // Should be omitted
        useQuestionBank: true,
      };

      const normalized = normalizeInstructorQuiz(wire);

      expect(normalized.passingScorePercent).toBe(75);
      expect(normalized.timeLimitSeconds).toBe(1200);
      expect((normalized as any).xpReward).toBeUndefined();
    });

    it('sends ONLY canonical fields in updateQuiz payload without xpReward', async () => {
      vi.mocked(apiClient.put).mockResolvedValueOnce({
        data: {
          data: {
            id: 'quiz-1',
            lessonId: 'lesson-1',
            title: 'Updated Title',
            passingScorePercent: 85,
            timeLimitSeconds: 2400,
          },
        },
      } as any);

      await instructorQuizzesService.updateQuiz('quiz-1', {
        title: 'Updated Title',
        passingScorePercent: 85,
        timeLimitSeconds: 2400,
      });

      expect(apiClient.put).toHaveBeenCalledWith('/quiz/quiz-1', {
        title: 'Updated Title',
        passingScorePercent: 85,
        timeLimitSeconds: 2400,
      });
      const sentBody = vi.mocked(apiClient.put).mock.calls[0]?.[1] as any;
      expect(sentBody.passingScore).toBeUndefined();
      expect(sentBody.timeLimit).toBeUndefined();
      expect(sentBody.xpReward).toBeUndefined();
      expect(sentBody.randomQuestionCount).toBeUndefined();
    });

    it('never includes randomQuestionCount in updateQuiz PUT request payload', async () => {
      vi.mocked(apiClient.put).mockResolvedValueOnce({
        data: { data: { id: 'quiz-1', lessonId: 'lesson-1', title: 'Title' } },
      } as any);

      await instructorQuizzesService.updateQuiz('quiz-1', {
        title: 'Title',
        passingScorePercent: 80,
        timeLimitSeconds: 1800,
      });

      const sentBody = vi.mocked(apiClient.put).mock.calls[0]?.[1] as any;
      expect(sentBody).not.toHaveProperty('randomQuestionCount');
    });
  });

  describe('endpoint safety & prohibited methods', () => {
    it('never calls /admin/... or /quiz-attempts/... endpoints', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: { data: [] } } as any);

      await instructorQuizzesService.getBankSummary('quiz-1');

      for (const call of vi.mocked(apiClient.get).mock.calls) {
        const url = String(call[0]);
        expect(url).not.toContain('/admin/');
        expect(url).not.toContain('/quiz-attempts/');
      }
    });

    it('does not export deleteQuiz or hard-delete question functions', () => {
      expect((instructorQuizzesService as any).deleteQuiz).toBeUndefined();
      expect((instructorQuizzesService as any).deleteQuestion).toBeUndefined();
      expect((instructorQuizzesService as any).hardDeleteQuestion).toBeUndefined();
      expect(instructorQuizzesService.setQuestionStatus).toBeDefined();
    });
  });
});
