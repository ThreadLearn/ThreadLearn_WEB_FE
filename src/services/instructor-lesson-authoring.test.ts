import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./apiClient', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

import { apiClient } from './apiClient';
import { instructorLessonsService } from './index';

describe('instructorLessonsService — Phase 5B Frontend API Client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses GET /instructor/sections/:sectionId/lessons for listing section lessons', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: { success: true, message: 'Lessons fetched.', data: [] },
    } as any);

    await instructorLessonsService.listBySection('sec-1');
    expect(apiClient.get).toHaveBeenCalledWith('/instructor/sections/sec-1/lessons');
  });

  it('uses POST /instructor/sections/:sectionId/lessons for creating a lesson', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      data: { success: true, message: 'Created.', data: { id: 'les-1' } },
    } as any);

    await instructorLessonsService.create('sec-1', {
      title: 'New Article',
      lessonType: 'article',
    });

    expect(apiClient.post).toHaveBeenCalledWith('/instructor/sections/sec-1/lessons', {
      title: 'New Article',
      lessonType: 'article',
    });
  });

  it('uses PUT /instructor/lessons/:id for updating a lesson', async () => {
    vi.mocked(apiClient.put).mockResolvedValue({
      data: { success: true, message: 'Updated.', data: { id: 'les-1' } },
    } as any);

    await instructorLessonsService.update('les-1', { title: 'Updated Title' });
    expect(apiClient.put).toHaveBeenCalledWith('/instructor/lessons/les-1', {
      title: 'Updated Title',
    });
  });

  it('uses DELETE /instructor/lessons/:id for soft-deleting a lesson', async () => {
    vi.mocked(apiClient.delete).mockResolvedValue({
      data: { success: true, message: 'Deleted.', data: { id: 'les-1' } },
    } as any);

    await instructorLessonsService.delete('les-1');
    expect(apiClient.delete).toHaveBeenCalledWith('/instructor/lessons/les-1');
  });

  it('uses POST /instructor/sections/:sectionId/lessons/reorder for lesson reorder', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      data: { success: true, message: 'Reordered.', data: { sectionId: 'sec-1', totalReordered: 2 } },
    } as any);

    await instructorLessonsService.reorder('sec-1', ['les-2', 'les-1']);
    expect(apiClient.post).toHaveBeenCalledWith('/instructor/sections/sec-1/lessons/reorder', {
      orderedLessonIds: ['les-2', 'les-1'],
    });
  });
});
