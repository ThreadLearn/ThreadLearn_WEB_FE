import { describe, it, expect, vi, beforeEach } from 'vitest';
import { instructorCodeAssignmentsService } from './instructor-code-assignment.service';
import { apiClient } from './apiClient';

vi.mock('./apiClient', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('instructorCodeAssignmentsService facade', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('listByLesson & get', () => {
    it('calls GET /exercises with lessonId param and normalizes results', async () => {
      vi.mocked(apiClient.get).mockResolvedValueOnce({
        data: {
          data: [
            { id: 'ex-123', lessonId: 'les-456', title: 'Exercise 1', language: 'javascript', testCases: [] },
          ],
        },
      } as any);

      const items = await instructorCodeAssignmentsService.listByLesson('les-456');

      expect(apiClient.get).toHaveBeenCalledWith('/exercises', { params: { lessonId: 'les-456' } });
      expect(items.length).toBe(1);
      expect(items[0].id).toBe('ex-123');
    });

    it('fetches single exercise detail for management workspace', async () => {
      vi.mocked(apiClient.get).mockResolvedValueOnce({
        data: {
          data: { _id: 'ex-123', lessonId: 'les-456', title: 'Detail', language: 'python', testCases: [] },
        },
      } as any);

      const item = await instructorCodeAssignmentsService.get('ex-123');

      expect(apiClient.get).toHaveBeenCalledWith('/exercises/ex-123');
      expect(item.id).toBe('ex-123');
    });
  });

  describe('strict allowlisted mutations', () => {
    it('creates exercise for existing coding lesson with DRAFT status and strict allowlist', async () => {
      vi.mocked(apiClient.post).mockResolvedValueOnce({
        data: {
          data: { id: 'ex-new', lessonId: 'les-456', title: 'New Ex', language: 'javascript', status: 'DRAFT' },
        },
      } as any);

      await instructorCodeAssignmentsService.createForExistingCodingLesson({
        lessonId: 'les-456',
        title: 'New Ex',
        language: 'javascript',
        starterCode: 'function main() {}',
        timeLimitMs: 2000,
        memoryLimitKb: 131072,
      });

      expect(apiClient.post).toHaveBeenCalledWith('/exercises', {
        lessonId: 'les-456',
        title: 'New Ex',
        language: 'javascript',
        status: 'DRAFT',
        starterCode: 'function main() {}',
        timeLimitMs: 2000,
        memoryLimitKb: 131072,
      });
    });

    it('updates exercise using strict field allowlist and strips status or lessonId', async () => {
      vi.mocked(apiClient.patch).mockResolvedValueOnce({
        data: {
          data: { id: 'ex-123', lessonId: 'les-456', title: 'Updated Title' },
        },
      } as any);

      await instructorCodeAssignmentsService.update('ex-123', {
        title: 'Updated Title',
        description: 'New Problem Statement',
        language: 'python',
        timeLimitMs: 5000,
      });

      expect(apiClient.patch).toHaveBeenCalledWith('/exercises/ex-123', {
        title: 'Updated Title',
        description: 'New Problem Statement',
        language: 'python',
        timeLimitMs: 5000,
      });

      const sentBody = vi.mocked(apiClient.patch).mock.calls[0]?.[1] as any;
      expect(sentBody.status).toBeUndefined();
      expect(sentBody.lessonId).toBeUndefined();
      expect(sentBody.totalPoints).toBeUndefined();
      expect(sentBody.createdBy).toBeUndefined();
    });
  });

  describe('security and prohibited exports', () => {
    it('does not export runPublic, remove/delete, or student submission methods in instructor facade', () => {
      expect((instructorCodeAssignmentsService as any).runPublic).toBeUndefined();
      expect((instructorCodeAssignmentsService as any).remove).toBeUndefined();
      expect((instructorCodeAssignmentsService as any).delete).toBeUndefined();
      expect((instructorCodeAssignmentsService as any).submit).toBeUndefined();
      expect((instructorCodeAssignmentsService as any).historyMine).toBeUndefined();
      expect((instructorCodeAssignmentsService as any).submissionsForAdmin).toBeUndefined();
    });

    it('never calls /admin/... endpoints for management actions', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: { data: [] } } as any);

      await instructorCodeAssignmentsService.listByLesson('les-1');

      for (const call of vi.mocked(apiClient.get).mock.calls) {
        const url = String(call[0]);
        expect(url).not.toContain('/admin/');
      }
    });
  });
});
