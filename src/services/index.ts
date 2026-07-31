import { apiClient } from './apiClient';
export { certificatesService } from './certificates.service';
import type {
  ApiResponse,
  PaginatedApiResponse,
  PaginatedResponse,
  Course,
  CourseDetail,
  CourseCreatePayload,
  CourseUpdatePayload,
  CourseStatusPayload,
  CourseFilters,
  Lesson,
  LessonManagementPayload,
  LessonCompleteResult,
  CourseSection,
  CourseSectionPayload,
  Quiz,
  QuizAttempt,
  PaginationMeta,
  QuizSubmitResult,
  QuizCreatePayload,
  QuizUpdatePayload,
  QuestionPayload,
  SubmitAttemptPayload,
  Comment,
  CodeShare,
  CodeExecutionResult,
  Bookmark,
  BookmarkToggleResult,
  Note,
  Notification,
  LeaderboardEntry,
  SubscriptionPlan,
  SubscriptionFeature,
  UserSubscription,
  SubscriptionPurchase,
  PlanCreatePayload,
  PlanUpdatePayload,
  PurchasePlanPayload,
  PaymentConfirmationPayload,
  AIHistoryLog,
  PlatformStats,
  AdminDashboardStatistics,
  AdminDashboardStatisticsParams,
  Enrollment,
  LearningPlan,
  CourseLearningGoal,
  CourseGoalPriority,
  UpdateLearningPlanPayload,
  UserStats,
  User,
  AdminStudentFilters,
  AdminStudentCreatePayload,
  AdminStudentUpdatePayload,
} from '../types';

// ─── Courses (UC15–UC25) ──────────────────────────────────────────────────────
export const coursesService = {
  list: async (filters: CourseFilters = {}) => {
    const { tags, ...query } = filters;
    const { data } = await apiClient.get<ApiResponse<Course[]>>('/courses', {
      params: { ...query, tag: filters.tag ?? tags?.[0] },
    });
    const meta = data.meta ?? {
      page: filters.page ?? 1,
      limit: filters.limit ?? data.data.length,
      total: data.data.length,
      totalPages: 1,
    };

    return {
      items: data.data,
      total: meta.total,
      page: meta.page,
      limit: meta.limit,
      totalPages: meta.totalPages,
    };
  },
  getById: async (id: string) => {
    const { data } = await apiClient.get<ApiResponse<CourseDetail>>(`/courses/${id}`);
    return data.data;
  },
  create: async (payload: CourseCreatePayload) => {
    const { data } = await apiClient.post<ApiResponse<Course>>('/courses', payload);
    return data.data;
  },
  update: async (id: string, payload: CourseUpdatePayload) => {
    const { data } = await apiClient.put<ApiResponse<Course>>(`/courses/${id}`, payload);
    return data.data;
  },
  uploadThumbnail: async (courseId: string, file: File) => {
    const form = new FormData();
    form.append('thumbnail', file);
    const { data } = await apiClient.post<ApiResponse<{ thumbnailUrl: string; course: Course }>>(
      `/courses/${courseId}/thumbnail`,
      form,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return data.data;
  },
  setStatus: async (id: string, payload: CourseStatusPayload) => {
    const { data } = await apiClient.patch<ApiResponse<Course>>(`/courses/${id}/publish`, payload);
    return data.data;
  },
  remove: async (id: string) => {
    const { data } = await apiClient.delete<ApiResponse<Course>>(`/courses/${id}`);
    return data.data;
  },
  restore: async (id: string) => {
    const { data } = await apiClient.post<ApiResponse<Course>>(`/courses/${id}/restore`);
    return data.data;
  },
};

// ─── Lessons (UC19–UC25) ──────────────────────────────────────────────────────
export const lessonsService = {
  getByCourse: async (courseId: string) => {
    const { data } = await apiClient.get<ApiResponse<Lesson[]>>(
      `/lessons?courseId=${courseId}`
    );
    return data.data;
  },
  getById: async (id: string) => {
    const { data } = await apiClient.get<ApiResponse<Lesson>>(`/lessons/${id}`);
    return data.data;
  },
  create: async (payload: LessonManagementPayload) => {
    const { data } = await apiClient.post<ApiResponse<Lesson>>('/lessons', payload);
    return data.data;
  },
  update: async (id: string, payload: Partial<LessonManagementPayload>) => {
    const { data } = await apiClient.put<ApiResponse<Lesson>>(`/lessons/${id}`, payload);
    return data.data;
  },
  delete: async (id: string) => {
    const { data } = await apiClient.delete<ApiResponse<null>>(`/lessons/${id}`);
    return data;
  },
  setLock: async (id: string, locked: boolean) => {
    const { data } = await apiClient.patch<ApiResponse<Lesson>>(`/lessons/${id}/lock`, { locked });
    return data.data;
  },
  complete: async (id: string) => {
    const { data } = await apiClient.post<ApiResponse<LessonCompleteResult>>(
      `/lessons/${id}/complete`
    );
    return data.data;
  },
};

// ——— Course sections (UC54) ————————————————————————————————————————————
export const sectionsService = {
  listByCourse: async (courseId: string) => {
    const { data } = await apiClient.get<ApiResponse<CourseSection[]>>('/sections', {
      params: { courseId },
    });
    return data.data;
  },
  create: async (payload: CourseSectionPayload) => {
    const { data } = await apiClient.post<ApiResponse<CourseSection>>('/sections', payload);
    return data.data;
  },
  update: async (id: string, payload: Partial<CourseSectionPayload>) => {
    const { data } = await apiClient.patch<ApiResponse<CourseSection>>(`/sections/${id}`, payload);
    return data.data;
  },
  remove: async (id: string) => {
    const { data } = await apiClient.delete<ApiResponse<{ id: string }>>(`/sections/${id}`);
    return data.data;
  },
  reorder: async (courseId: string, items: Array<{ id: string; orderIndex: number }>) => {
    const { data } = await apiClient.post<ApiResponse<CourseSection[]>>('/sections/reorder', {
      courseId,
      items,
    });
    return data.data;
  },
};

// ─── Enrollments (UC33) ───────────────────────────────────────────────────────
export const enrollmentsService = {
  enroll: async (courseId: string) => {
    const { data } = await apiClient.post<ApiResponse<Enrollment>>('/enrollments', {
      courseId,
    });
    return data.data;
  },
  getMyEnrollments: async () => {
    const { data } = await apiClient.get<ApiResponse<Enrollment[]>>('/enrollments/me');
    return data.data;
  },
  updateProgress: async (enrollmentId: string, lessonId: string) => {
    const { data } = await apiClient.post<ApiResponse<Enrollment>>(
      `/enrollments/${enrollmentId}/progress`,
      { lessonId }
    );
    return data.data;
  },
};

// ─── Students (progress/resume) ───────────────────────────────────────────────
export const studentsService = {
  getResume: async () => {
    const { data } = await apiClient.get<ApiResponse<Enrollment | null>>(
      '/students/me/resume'
    );
    return data.data;
  },
};

export const learningPlanService = {
  getMine: async () => {
    const { data } = await apiClient.get<ApiResponse<LearningPlan>>('/learning-plan/me');
    return data.data;
  },
  update: async (payload: UpdateLearningPlanPayload) => {
    const { data } = await apiClient.put<ApiResponse<LearningPlan>>('/learning-plan/me', payload);
    return data.data;
  },
  getCourseGoal: async (courseId: string) => {
    const { data } = await apiClient.get<ApiResponse<CourseLearningGoal | null>>(
      '/learning-plan/goals/' + courseId,
    );
    return data.data;
  },
  updateCourseGoal: async (courseId: string, payload: { targetDate: string; priority: CourseGoalPriority }) => {
    const { data } = await apiClient.put<ApiResponse<CourseLearningGoal>>(
      '/learning-plan/goals/' + courseId,
      payload,
    );
    return data.data;
  },
  removeCourseGoal: async (courseId: string) => {
    const { data } = await apiClient.delete<ApiResponse<{ deleted: boolean }>>(
      '/learning-plan/goals/' + courseId,
    );
    return data.data;
  },
};

// ─── Quiz (UC26–UC29, UC41–UC43, UC49) ───────────────────────────────────────
export interface QuizAttemptHistoryQuery {
  page?: number;
  limit?: number;
}

export interface QuizAttemptHistoryResult {
  items: QuizAttempt[];
  meta?: PaginationMeta;
}

export const quizService = {
  listAll: async () => {
    const { data } = await apiClient.get<ApiResponse<Quiz[]>>('/quiz');
    return data.data;
  },
  getByIdAdmin: async (id: string) => {
    const { data } = await apiClient.get<ApiResponse<Quiz>>(`/quiz/${id}`);
    return data.data;
  },
  getByLesson: async (lessonId: string) => {
    const { data } = await apiClient.get<ApiResponse<Quiz>>(
      `/quiz/lesson/${lessonId}`
    );
    return data.data;
  },
  getAttemptById: async (attemptId: string) => {
    const { data } = await apiClient.get<ApiResponse<QuizAttempt>>(
      `/quiz/attempts/${attemptId}`
    );
    return data.data;
  },
  create: async (payload: QuizCreatePayload) => {
    const { data } = await apiClient.post<ApiResponse<Quiz>>('/quiz', payload);
    return data.data;
  },
  update: async (id: string, payload: QuizUpdatePayload) => {
    const { data } = await apiClient.put<ApiResponse<Quiz>>(`/quiz/${id}`, payload);
    return data.data;
  },
  remove: async (id: string) => {
    const { data } = await apiClient.delete<ApiResponse<null>>(`/quiz/${id}`);
    return data.data;
  },
  addQuestion: async (id: string, payload: QuestionPayload) => {
    const { data } = await apiClient.post<ApiResponse<Quiz>>(
      `/quiz/${id}/questions`,
      payload
    );
    return data.data;
  },
  updateQuestion: async (
    id: string,
    questionId: string,
    payload: Partial<QuestionPayload>
  ) => {
    const { data } = await apiClient.put<ApiResponse<Quiz>>(
      `/quiz/${id}/questions/${questionId}`,
      payload
    );
    return data.data;
  },
  deleteQuestion: async (id: string, questionId: string) => {
    const { data } = await apiClient.delete<ApiResponse<Quiz>>(
      `/quiz/${id}/questions/${questionId}`
    );
    return data.data;
  },
  submit: async (payload: SubmitAttemptPayload) => {
    const { data } = await apiClient.post<ApiResponse<QuizSubmitResult>>(
      '/quiz/submit',
      payload
    );
    return data.data;
  },
  getMyAttempts: async (query?: QuizAttemptHistoryQuery): Promise<QuizAttempt[]> => {
    const { data } = await apiClient.get<ApiResponse<QuizAttempt[]>>('/quiz/attempts/me', {
      params: query?.page || query?.limit ? query : undefined,
    });
    return data.data;
  },
  getMyAttemptsPage: async (query: Required<QuizAttemptHistoryQuery>): Promise<QuizAttemptHistoryResult> => {
    const { data } = await apiClient.get<ApiResponse<QuizAttempt[]>>('/quiz/attempts/me', {
      params: query,
    });
    return {
      items: data.data,
      meta: data.meta,
    };
  },
};

// ─── Comments (UC34–UC37) ─────────────────────────────────────────────────────
export const commentsService = {
  getByLesson: async (lessonId: string) => {
    const { data } = await apiClient.get<ApiResponse<Comment[]>>('/comments', {
      params: { targetType: 'LESSON', targetId: lessonId },
    });
    return data.data;
  },
  create: async (payload: { lessonId: string; content: string; isAnonymous?: boolean }) => {
    const { data } = await apiClient.post<ApiResponse<Comment>>('/comments', {
      targetType: 'LESSON',
      targetId: payload.lessonId,
      content: payload.content,
      isAnonymous: payload.isAnonymous ?? false,
    });
    return data.data;
  },
  getReplies: async (commentId: string) => {
    const { data } = await apiClient.get<ApiResponse<Comment[]>>(`/comments/${commentId}/replies`);
    return data.data;
  },
  reply: async (commentId: string, payload: { content: string; isAnonymous?: boolean }) => {
    const { data } = await apiClient.post<ApiResponse<Comment>>(`/comments/${commentId}/replies`, {
      content: payload.content,
      isAnonymous: payload.isAnonymous ?? false,
    });
    return data.data;
  },
  update: async (id: string, content: string) => {
    const { data } = await apiClient.patch<ApiResponse<Comment>>(`/comments/${id}`, {
      content,
    });
    return data.data;
  },
  delete: async (id: string) => {
    const { data } = await apiClient.delete<ApiResponse<null>>(`/comments/${id}`);
    return data;
  },
};

export const discussionService = {
  list: async (targetType: 'COURSE' | 'LESSON', targetId: string, page = 1, limit = 20, filters?: { postType?: NonNullable<Comment['postType']>; questionStatus?: NonNullable<Comment['questionStatus']> }) => {
    const { data } = await apiClient.get<ApiResponse<Comment[]>>('/comments', {
      params: { targetType, targetId, page, limit, ...filters },
    });
    return { items: data.data, meta: data.meta };
  },
  create: async (payload: {
    targetType: 'COURSE' | 'LESSON'; targetId: string; content: string; isAnonymous?: boolean;
    postType?: Comment['postType']; codeShareId?: string;
    learningContext?: { expectedResult: string; actualResult: string; tried: string };
  }) => {
    const { data } = await apiClient.post<ApiResponse<Comment>>('/comments', payload);
    return data.data;
  },
  replies: commentsService.getReplies,
  reply: async (commentId: string, payload: { content: string; isAnonymous?: boolean; codeShareId?: string }) => {
    const { data } = await apiClient.post<ApiResponse<Comment>>(`/comments/${commentId}/replies`, {
      content: payload.content,
      isAnonymous: payload.isAnonymous ?? false,
      postType: payload.codeShareId ? 'CODE_SOLUTION' : 'TEXT_REPLY',
      codeShareId: payload.codeShareId,
    });
    return data.data;
  },
  accept: async (commentId: string, replyId: string) => {
    const { data } = await apiClient.patch<ApiResponse<Comment>>(`/comments/${commentId}/accept`, { replyId });
    return data.data;
  },
  close: async (commentId: string) => {
    const { data } = await apiClient.patch<ApiResponse<Comment>>(`/comments/${commentId}/close`);
    return data.data;
  },
  reopen: async (commentId: string) => {
    const { data } = await apiClient.patch<ApiResponse<Comment>>(`/comments/${commentId}/reopen`);
    return data.data;
  },
  toggleHelpful: async (commentId: string) => {
    const { data } = await apiClient.put<ApiResponse<{ helpful: boolean; comment: Comment }>>(`/comments/${commentId}/helpful`);
    return data.data;
  },
  report: async (commentId: string, payload: { reason: 'SPAM' | 'ABUSE' | 'INCORRECT' | 'SPOILER' | 'UNSAFE_CODE' | 'OTHER'; details?: string }) => {
    const { data } = await apiClient.post<ApiResponse<{ _id: string; status: string }>>(`/comments/${commentId}/reports`, payload);
    return data.data;
  },
  verify: async (commentId: string) => {
    const { data } = await apiClient.patch<ApiResponse<Comment>>(`/comments/${commentId}/verify`);
    return data.data;
  },
  moderate: async (commentId: string, payload: { action: 'HIDE' | 'RESTORE'; reason: string }) => {
    const { data } = await apiClient.patch<ApiResponse<Comment>>(`/comments/${commentId}/moderation`, payload);
    return data.data;
  },
};

export const codeShareService = {
  createFromExecution: async (payload: { sourceExecutionId: string; targetType: 'COURSE' | 'LESSON'; targetId: string; visibility?: 'COURSE' }) => {
    const { data } = await apiClient.post<ApiResponse<CodeShare>>('/code-shares/from-execution', payload);
    return data.data;
  },
  get: async (id: string) => {
    const { data } = await apiClient.get<ApiResponse<CodeShare>>(`/code-shares/${id}`);
    return data.data;
  },
};

// ─── Bookmarks (UC38–UC39) ────────────────────────────────────────────────────
export const bookmarksService = {
  getAll: async (page = 1, limit = 20, targetType?: 'COURSE' | 'LESSON') => {
    const { data } = await apiClient.get<ApiResponse<Bookmark[]>>('/bookmarks', {
      params: { targetType, page, limit },
    });
    return {
      data: data.data,
      meta: data.meta,
    };
  },
  check: async (lessonId: string) => {
    const { data } = await apiClient.get<ApiResponse<{ bookmarked: boolean }>>('/bookmarks/check', {
      params: { targetType: 'LESSON', targetId: lessonId },
    });
    return data.data.bookmarked;
  },
  toggle: async (lessonId: string) => {
    const { data } = await apiClient.post<ApiResponse<BookmarkToggleResult>>(
      '/bookmarks/toggle',
      { targetType: 'LESSON', targetId: lessonId }
    );
    return data.data;
  },
  remove: async (bookmarkId: string) => {
    const { data } = await apiClient.delete<ApiResponse<{ deleted: boolean }>>(
      `/bookmarks/${bookmarkId}`
    );
    return data.data;
  },
};

// ─── Notes (UC40) ─────────────────────────────────────────────────────────────
export const notesService = {
  list: async (page = 1, limit = 12) => {
    const { data } = await apiClient.get<ApiResponse<Note[]>>('/notes', {
      params: { page, limit },
    });
    return {
      data: data.data,
      meta: data.meta,
    };
  },
  getByLesson: async (lessonId: string) => {
    const { data } = await apiClient.get<ApiResponse<Note[]>>(
      `/notes?lessonId=${lessonId}`
    );
    return data.data;
  },
  create: async (payload: { lessonId: string; noteText: string; codeSnippet?: string; anchorText?: string; anchorStart?: number | null; anchorEnd?: number | null }) => {
    const { data } = await apiClient.post<ApiResponse<Note>>('/notes', payload);
    return data.data;
  },
  update: async (noteId: string, payload: { noteText?: string; codeSnippet?: string; anchorText?: string; anchorStart?: number | null; anchorEnd?: number | null }) => {
    const { data } = await apiClient.patch<ApiResponse<Note>>(`/notes/${noteId}`, payload);
    return data.data;
  },
  remove: async (noteId: string) => {
    const { data } = await apiClient.delete<ApiResponse<{ deleted: boolean }>>(`/notes/${noteId}`);
    return data.data;
  },
  createFromCodeShare: async (payload: { codeShareId: string; lessonId: string; noteText?: string }) => {
    const { data } = await apiClient.post<ApiResponse<Note>>('/notes/from-code-share', payload);
    return data.data;
  },
};

// ─── Code execution (UC44–UC45) ─────────────────────────────────────────────
export const codeExecutionService = {
  run: async (payload: {
    sourceCode: string;
    language: string;
    stdin?: string;
    courseId?: string;
    lessonId?: string;
    exerciseId?: string;
  }) => {
    const { data } = await apiClient.post<ApiResponse<CodeExecutionResult>>('/code-execution/run', payload);
    return data.data;
  },
  history: async (page = 1, limit = 20, lessonId?: string, exerciseId?: string) => {
    const { data } = await apiClient.get<ApiResponse<import('../types').HistoryPage<CodeExecutionResult>>>('/code-execution/history', { params: { page, limit, lessonId, exerciseId } });
    return data.data;
  },
  detail: async (id: string) => {
    const { data } = await apiClient.get<ApiResponse<CodeExecutionResult>>(`/code-execution/${id}`);
    return data.data;
  },
  remove: async (bookmarkId: string) => {
    const { data } = await apiClient.delete<ApiResponse<{ deleted: boolean }>>(`/bookmarks/${bookmarkId}`);
    return data.data;
  },
};

// ─── Notifications (UC32) ─────────────────────────────────────────────────────
export const notificationsService = {
  getAll: async () => {
    const { data } = await apiClient.get<ApiResponse<Notification[]>>('/notifications');
    return data.data;
  },
  getPage: async (page = 1, limit = 20) => {
    const { data } = await apiClient.get<ApiResponse<Notification[]>>('/notifications', {
      params: { page, limit },
    });
    return { data: data.data, meta: data.meta };
  },
  getUnreadCount: async () => {
    const { data } = await apiClient.get<ApiResponse<{ count: number }>>('/notifications/unread-count');
    return data.data.count;
  },
  markRead: async (id: string) => {
    const { data } = await apiClient.patch<ApiResponse<Notification>>(
      `/notifications/${id}/read`
    );
    return data.data;
  },
  markAllRead: async () => {
    const { data } = await apiClient.patch<ApiResponse<{ updated: boolean }>>(
      '/notifications/read-all'
    );
    return data.data;
  },
};

export const adminNotificationsService = {
  getAdminNotifications: async (filters: import('../types').AdminNotificationFilters = {}) => {
    const { data } = await apiClient.get<ApiResponse<Notification[]>>('/admin/notifications', { params: filters });
    return { items: data.data ?? [], meta: data.meta };
  },
  getAdminUnreadNotificationCount: async () => {
    const { data } = await apiClient.get<ApiResponse<{ count: number }>>('/admin/notifications/unread-count');
    return data.data.count;
  },
  markAdminNotificationRead: async (id: string) => {
    const { data } = await apiClient.patch<ApiResponse<Notification>>(`/admin/notifications/${id}/read`);
    return data.data;
  },
  markAllAdminNotificationsRead: async () => {
    const { data } = await apiClient.patch<ApiResponse<{ updated: boolean }>>('/admin/notifications/read-all');
    return data.data;
  },
};

// ─── Leaderboard (UC46) ───────────────────────────────────────────────────────
export const leaderboardService = {
  getTop: async (limit = 50) => {
    const { data } = await apiClient.get<ApiResponse<LeaderboardEntry[]>>(
      `/leaderboard?limit=${limit}`
    );
    return data.data;
  },
  getMyRank: async () => {
    const { data } = await apiClient.get<ApiResponse<LeaderboardEntry>>(
      '/leaderboard/me'
    );
    return data.data;
  },
};

// ─── Gamification (UC44–UC45) ─────────────────────────────────────────────────
export const gamificationService = {
  getStats: async () => {
    const { data } = await apiClient.get<ApiResponse<UserStats>>('/gamification/stats');
    return data.data;
  },
};

// ─── Subscription (UC51–UC52) ─────────────────────────────────────────────────
export const subscriptionService = {
  getAvailableFeatures: async () => {
    const { data } = await apiClient.get<ApiResponse<SubscriptionFeature[]>>(
      '/subscription/plans/features'
    );
    return data.data;
  },
  getPlans: async () => {
    const { data } = await apiClient.get<ApiResponse<SubscriptionPlan[]>>('/subscription/plans');
    return data.data;
  },
  listPlans: async (includeInactive = false) => {
    const { data } = await apiClient.get<ApiResponse<SubscriptionPlan[]>>('/subscription/plans', {
      params: includeInactive ? { includeInactive: true } : undefined,
    });
    return data.data;
  },
  getPlanById: async (id: string) => {
    const { data } = await apiClient.get<ApiResponse<SubscriptionPlan>>(
      `/subscription/plans/${id}`
    );
    return data.data;
  },
  createPlan: async (payload: PlanCreatePayload) => {
    const { data } = await apiClient.post<ApiResponse<SubscriptionPlan>>(
      '/subscription/plans',
      payload
    );
    return data.data;
  },
  updatePlan: async (id: string, payload: PlanUpdatePayload) => {
    const { data } = await apiClient.put<ApiResponse<SubscriptionPlan>>(
      `/subscription/plans/${id}`,
      payload
    );
    return data.data;
  },
  deletePlan: async (id: string) => {
    const { data } = await apiClient.delete<ApiResponse<SubscriptionPlan>>(
      `/subscription/plans/${id}`
    );
    return data.data;
  },
  getMyPlan: async () => {
    const { data } = await apiClient.get<ApiResponse<UserSubscription | null>>(
      '/subscription/my-subscription'
    );
    return data.data;
  },
  purchase: async (payload: PurchasePlanPayload) => {
    const { data } = await apiClient.post<ApiResponse<SubscriptionPurchase>>(
      '/subscription/purchase',
      payload
    );
    return data.data;
  },
  getPurchase: async (purchaseId: string) => {
    const { data } = await apiClient.get<ApiResponse<SubscriptionPurchase>>(
      `/subscription/purchases/${purchaseId}`
    );
    return data.data;
  },
  reconcilePurchase: async (purchaseId: string) => {
    const { data } = await apiClient.post<ApiResponse<SubscriptionPurchase>>(
      `/subscription/purchases/${purchaseId}/reconcile`
    );
    return data.data;
  },
  confirmPayment: async (payload: PaymentConfirmationPayload) => {
    const { data } = await apiClient.post<ApiResponse<SubscriptionPurchase>>(
      '/subscription/webhook/payment',
      payload
    );
    return data.data;
  },
};

// ─── AI (UC47–UC48) ───────────────────────────────────────────────────────────
export const aiService = {
  analyzeCode: async (inputCode: string, language: string) => {
    const { data } = await apiClient.post<ApiResponse<AIHistoryLog>>(
      '/ai/recommendation',
      { inputCode, language },
      { timeout: 120000 } // AI inference can take up to ~1min, especially right after a server restart
    );
    return data.data;
  },
  getHistory: async (page = 1, limit = 20) => {
    const { data } = await apiClient.get<ApiResponse<import('../types').HistoryPage<AIHistoryLog>>>('/ai/history', { params: { page, limit } });
    return data.data;
  },
  getHistoryById: async (id: string) => {
    const { data } = await apiClient.get<ApiResponse<AIHistoryLog>>(`/ai/history/${id}`);
    return data.data;
  },
};

// ─── Admin (UC10–UC14) ────────────────────────────────────────────────────────
type GetDashboardStatistics = {
  (): Promise<AdminDashboardStatistics>;
  (params: AdminDashboardStatisticsParams): Promise<AdminDashboardStatistics>;
};

const getDashboardStatistics: GetDashboardStatistics = async (
  { months }: AdminDashboardStatisticsParams = {}
) => {
  const { data } = await apiClient.get<ApiResponse<AdminDashboardStatistics>>(
    '/admin/dashboard/statistics',
    { params: { months } }
  );
  return data.data;
};

export const adminService = {
  getStats: async () => {
    const { data } = await apiClient.get<ApiResponse<PlatformStats>>(
      '/admin/stats'
    );
    return data.data;
  },
  getDashboardStatistics,
  listUsers: async (pageOrFilters: number | AdminStudentFilters = 1, limit = 20) => {
    const filters: AdminStudentFilters =
      typeof pageOrFilters === 'number'
        ? { page: pageOrFilters, limit }
        : pageOrFilters;
    const page = filters.page ?? 1;
    const pageSize = filters.limit ?? limit;
    const params = {
      page,
      limit: pageSize,
      search: filters.search || undefined,
      isActive: filters.isActive,
      isVerified: filters.isVerified,
    };

    const { data } = await apiClient.get<ApiResponse<User[] | PaginatedResponse<User>>>(
      '/admin/students',
      { params }
    );
    const meta = data.meta;
    const payload = data.data;
    const items = Array.isArray(payload) ? payload : payload.items;

    return {
      items: items ?? [],
      total: meta?.total ?? (Array.isArray(payload) ? payload.length : payload.total) ?? 0,
      page: meta?.page ?? (Array.isArray(payload) ? page : payload.page) ?? page,
      limit: meta?.limit ?? (Array.isArray(payload) ? pageSize : payload.limit) ?? pageSize,
      totalPages: meta?.totalPages ?? (Array.isArray(payload) ? 1 : payload.totalPages) ?? 1,
    } satisfies PaginatedResponse<User>;
  },
  createStudent: async (payload: AdminStudentCreatePayload) => {
    const { data } = await apiClient.post<ApiResponse<User>>(
      '/admin/students',
      payload
    );
    return data.data;
  },
  updateUser: async (id: string, payload: AdminStudentUpdatePayload) => {
    const { data } = await apiClient.patch<ApiResponse<User>>(
      `/admin/students/${id}`,
      payload
    );
    return data.data;
  },
  lockStudent: async (id: string, lockedReason?: string) => {
    const payload = lockedReason?.trim() ? { lockedReason: lockedReason.trim() } : undefined;
    const { data } = await apiClient.patch<ApiResponse<User>>(
      `/admin/students/${id}/lock`,
      payload
    );
    return data.data;
  },
  unlockStudent: async (id: string) => {
    const { data } = await apiClient.patch<ApiResponse<User>>(
      `/admin/students/${id}/unlock`
    );
    return data.data;
  },
  toggleUserLock: async (id: string, isLocked: boolean, lockedReason?: string) => {
    return isLocked
      ? adminService.unlockStudent(id)
      : adminService.lockStudent(id, lockedReason);
  },
  toggleCoursePublish: async (id: string, status: 'published' | 'hidden' | 'draft' = 'published') => {
    const { data } = await apiClient.patch<ApiResponse<Course>>(
      `/courses/${id}/publish`,
      { status }
    );
    return data.data;
  },
  deleteCourse: async (id: string) => {
    const { data } = await apiClient.delete<ApiResponse<null>>(
      `/courses/${id}`
    );
    return data;
  },
};
