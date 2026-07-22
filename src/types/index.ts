// ─── Auth & User ────────────────────────────────────────────────────────────

export type UserRole = 'STUDENT' | 'ADMIN';

export type PlanType = 'FREE' | 'PREMIUM';

export interface User {
  _id: string;
  id?: string;
  email: string;
  name: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
  role: UserRole;
  planType: PlanType;
  subscriptionExpiresAt?: string;
  subscriptionFeatures?: string[];
  isLocked?: boolean;
  isActive?: boolean;
  isVerified?: boolean;
  isEmailVerified?: boolean;
  lockedReason?: string;
  googleId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

export interface VerifyEmailPayload {
  email: string;
  code: string;
}

export interface AdminStudentFilters {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
  isVerified?: boolean;
}

export interface AdminStudentCreatePayload {
  email: string;
  firstName: string;
  lastName: string;
  password?: string;
}

export interface AdminStudentUpdatePayload {
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
  isVerified?: boolean;
}

// ─── User Stats & Gamification ───────────────────────────────────────────────

export interface UserStats {
  userId: string;
  xp: number;
  level: number;
  streak?: number;
  currentStreak?: number;
  highestStreak?: number;
  lastActivityAt?: string;
  lastActiveDate?: string;
  totalQuizzesPassed?: number;
  quizzesCompleted?: number;
  totalLessonsCompleted: number;
  coursesCompleted?: number;
}

// ─── Courses ─────────────────────────────────────────────────────────────────

export type CourseLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';

export interface Course {
  _id: string;
  id?: string;
  title: string;
  slug?: string;
  description: string;
  shortDescription?: string;
  thumbnailUrl?: string;
  tags: string[];
  level: CourseLevel;
  language: string;
  isPublished: boolean;
  isPremium?: boolean;
  price?: number;
  status?: string;
  prerequisites?: string[];
  prerequisiteThreshold?: number;
  isDeleted?: boolean;
  lessonCount?: number;
  enrollmentCount?: number;
  totalLessons?: number;
  totalEnrollments?: number;
  averageRating?: number;
  estimatedDuration?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CourseCreatePayload {
  title: string;
  description: string;
  tags?: string[];
  level?: CourseLevel;
  language?: string;
  thumbnailUrl?: string;
}

export interface CourseSection {
  _id: string;
  id?: string;
  courseId: string;
  title: string;
  description?: string;
  orderIndex: number;
  isPublished?: boolean;
  status?: string;
}

export interface CourseDetail {
  course: Course;
  sections: CourseSection[];
  lessons: Lesson[];
}

// ─── Lessons ─────────────────────────────────────────────────────────────────

export interface LessonCodeSnippet {
  language: string;
  code: string;
  description?: string;
}

export interface Lesson {
  _id: string;
  id?: string;
  courseId: string;
  sectionId?: string;
  title: string;
  slug?: string;
  description?: string;
  content?: string; // Markdown (legacy mirror)
  contentMarkdown?: string; // Canonical body — Markdown
  lessonType?: 'article' | 'video' | 'coding' | 'quiz' | 'assignment' | 'mixed' | string;
  attachmentUrl?: string;
  attachments?: string[];
  videoUrl?: string;
  codeSnippets?: LessonCodeSnippet[];
  duration?: number; // minutes
  estimatedTime?: number;
  order?: number;
  orderIndex?: number;
  isPreview?: boolean;
  isLocked?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LessonCompleteResult {
  xpAwarded?: number;
  enrollment: Enrollment | null;
}

// ─── Enrollments ─────────────────────────────────────────────────────────────

export interface Enrollment {
  _id: string;
  id?: string;
  userId: string;
  courseId: string | EnrollmentCourseView;
  progress: number; // 0-100
  progressPercent?: number;
  completedLessons: string[];
  totalLessons?: number;
  lastLessonId?: string;
  completed: boolean;
  enrolledAt?: string;
  lastAccessedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface EnrollmentCourseView {
  _id?: string;
  id?: string;
  title?: string;
  slug?: string;
  thumbnailUrl?: string;
  level?: string;
  language?: string;
  status?: string;
  isPremium?: boolean;
  totalLessons?: number;
}

// ─── Quiz ─────────────────────────────────────────────────────────────────────

export interface QuizQuestion {
  _id: string;
  id?: string;
  questionText: string;
  options: string[];
  correctAnswerIndex?: number;
}

export interface Quiz {
  _id: string;
  id?: string;
  lessonId: string;
  title: string;
  description?: string;
  questions: QuizQuestion[];
  xpReward: number;
  timeLimit: number; // seconds
  timeLimitSeconds?: number;
  passingScore: number; // percentage
  passingScorePercent?: number;
  createdAt: string;
}

export interface QuizAttempt {
  _id: string;
  id?: string;
  userId: string;
  quizId: string;
  answers: { questionId: string; selectedOption: number }[] | Record<string, number>;
  score: number;
  passed: boolean;
  timeTaken?: number; // seconds
  createdAt?: string;
  startedAt?: string;
  completedAt?: string;
  xpRewarded?: number;
  passingScorePercent?: number;
  isTimeout?: boolean;
}

export interface SubmitAttemptPayload {
  quizId: string;
  answers: Record<string, number>;
  startTime?: string;
}

export interface QuestionPayload {
  questionText: string;
  options: string[];
  correctAnswerIndex: number;
}

export interface QuizCreatePayload {
  lessonId: string;
  title: string;
  description?: string;
  passingScorePercent?: number;
  timeLimitSeconds?: number;
  xpReward?: number;
  questions: QuestionPayload[];
}

export interface QuizUpdatePayload {
  title?: string;
  description?: string;
  passingScorePercent?: number;
  timeLimitSeconds?: number;
  xpReward?: number;
  questions?: QuestionPayload[];
}

export interface QuizSubmitResult {
  attempt: QuizAttempt;
  score: number;
  passed: boolean;
  xpRewarded: number;
  passingScorePercent: number;
  isTimeout: boolean;
}

// ─── Comments ─────────────────────────────────────────────────────────────────

export interface Comment {
  _id: string;
  lessonId: string;
  userId: string;
  user?: Pick<User, '_id' | 'name' | 'avatarUrl'>;
  content: string;
  parentId?: string;
  isAnonymous: boolean;
  likes: string[];
  createdAt: string;
  updatedAt: string;
}

// ─── Bookmarks & Notes ────────────────────────────────────────────────────────

export interface Bookmark {
  _id: string;
  userId: string;
  targetType: 'COURSE' | 'LESSON';
  targetId: string;
  title: string;
  lessonId?: string;
  anchorText?: string;
  position?: number;
  note?: string;
  tags?: string[];
  status?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface BookmarkToggleResult {
  bookmarked: boolean;
  bookmark?: Bookmark;
}

export interface Note {
  _id: string;
  userId: string;
  lessonId: string;
  noteText: string;
  codeSnippet?: string;
  anchorText?: string;
  anchorStart?: number;
  anchorEnd?: number;
  updatedAt: string;
  createdAt?: string;
  lesson?: {
    _id: string;
    title: string;
    courseId: string;
  };
}

export interface CodeExecutionResult {
  _id: string;
  stdout: string;
  stderr: string;
  compileOutput: string;
  status: { id: number; description: string };
  runtime: string;
  memory: number;
  language: string;
  languageId: number;
  createdAt: string;
}

// ─── Notifications ────────────────────────────────────────────────────────────

export type NotificationType =
  | 'SYSTEM'
  | 'ACHIEVEMENT'
  | 'LEADERBOARD'
  | 'ENROLLMENT'
  | 'LESSON_COMPLETED'
  | 'COURSE_COMPLETED'
  | 'COURSE_ENROLLED'
  | 'QUIZ_PASSED'
  | 'QUIZ_FAILED'
  | 'LEVEL_UP'
  | 'BOOKMARK_COURSE_UPDATED'
  | 'PAYMENT_SUCCESS'
  | 'USER_REGISTERED'
  | 'NEW_USER_REGISTERED'
  | 'STUDENT_COMMENT_REPORT'
  | 'COMMENT_REPLY'
  | 'AI_FEEDBACK'
  | 'SYSTEM_ERROR';

export interface Notification {
  _id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  readAt?: string;
  link?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt?: string;
}

export interface AdminNotificationFilters {
  page?: number;
  limit?: number;
  isRead?: boolean;
  type?: NotificationType;
}

// ─── Leaderboard ──────────────────────────────────────────────────────────────

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  avatar?: string;
  xp: number;
  level?: number;
}

// ─── Subscription ─────────────────────────────────────────────────────────────

export interface SubscriptionPlan {
  _id: string;
  id?: string;
  name: string;
  description?: string;
  price: number;
  currency: string;
  durationDays: number;
  features: string[];
  featureDetails?: SubscriptionFeature[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SubscriptionFeature {
  key: string;
  label: string;
  description: string;
}

export interface PlanCreatePayload {
  name: string;
  description?: string;
  price: number;
  currency?: string;
  durationDays: number;
  features?: string[];
  isActive?: boolean;
}

export type PlanUpdatePayload = Partial<PlanCreatePayload>;

export type UserSubscriptionStatus = 'active' | 'expired' | 'cancelled';

export interface UserSubscription {
  _id: string;
  id?: string;
  userId: string;
  planId: string;
  status: UserSubscriptionStatus;
  startedAt: string;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
}

export type SubscriptionPurchaseStatus = 'pending' | 'succeeded' | 'failed';

export interface SubscriptionPurchase {
  _id: string;
  id?: string;
  userId: string;
  planId: string;
  amount: number;
  currency: string;
  status: SubscriptionPurchaseStatus;
  transactionId?: string;
  paymentUrl?: string;
  paidAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PurchasePlanPayload {
  planId: string;
}

export type PaymentConfirmationPayload = Record<string, string>;

// ─── AI ───────────────────────────────────────────────────────────────────────

export interface AIIssue {
  patternId: string;
  lineRange: string;
  severity: 'high' | 'medium' | 'low';
  description: string;
  fix: string;
  codeSnippet?: string;
}

export interface AIKnowledgeDoc {
  id: string;
  title: string;
  category?: string;
  content?: string;
  score?: number;
}

export interface AIHistoryLog {
  _id: string;
  userId: string;
  courseId?: string;
  lessonId?: string;
  codeExecutionId?: string;
  inputCode?: string;
  language?: string;
  prompt: string;
  response: string;
  suggestions?: string[];
  raceConditions?: string[];
  optimizedCode?: string;
  explanation?: string;
  tokenUsage?: number;
  modelName?: string;
  feedbackRating?: number;
  status?: string;
  category?: string;
  issues?: AIIssue[];
  docsUsed?: AIKnowledgeDoc[];
  cached?: boolean;
  analyzeTimeMs?: number;
  createdAt: string;
}

// ─── Analytics (Admin) ────────────────────────────────────────────────────────

export interface PlatformStats {
  totalUsers?: number;
  totalStudents?: number;
  totalCourses?: number;
  totalEnrollments?: number;
  totalQuizAttempts?: number;
  courseCompletionRate?: number;
  quizPassRate?: number;
}

export type AdminDashboardMetricValue = string | number | boolean | null | undefined;

export interface AdminDashboardSummary {
  totalUsers: number;
  totalStudents?: number;
  totalCourses: number;
  totalEnrollments: number;
  totalQuizAttempts: number;
  totalRevenue: number;
  successfulPayments: number;
  lockedUsers: number;
  unreadNotifications: number;
  courseCompletionRate?: number;
  quizPassRate?: number;
  [key: string]: AdminDashboardMetricValue;
}

export interface AdminDashboardChartPoint {
  label?: string;
  name?: string;
  date?: string;
  month?: string;
  type?: string;
  status?: string;
  value?: number;
  count?: number;
  total?: number;
  users?: number;
  courses?: number;
  enrollments?: number;
  attempts?: number;
  [key: string]: AdminDashboardMetricValue;
}

export type AdminDashboardChartValue =
  | AdminDashboardChartPoint[]
  | Record<string, AdminDashboardMetricValue>
  | null
  | undefined;

export interface UserGrowthPoint extends AdminDashboardChartPoint {
  label: string;
  count: number;
}

export interface RevenueTrendPoint extends AdminDashboardChartPoint {
  label: string;
  revenue: number;
}

export interface TopPurchasedCoursePoint extends AdminDashboardChartPoint {
  courseId: string;
  title: string;
  purchases: number;
  revenue: number;
}

export interface PaymentStatusPoint extends AdminDashboardChartPoint {
  status: string;
  count: number;
}

export interface UserStatusPoint extends AdminDashboardChartPoint {
  status: string;
  count: number;
}

export interface NotificationTypePoint extends AdminDashboardChartPoint {
  type: string;
  count: number;
}

export interface AdminDashboardStatisticsResponse {
  summary: AdminDashboardSummary;
  charts: {
    userGrowth: UserGrowthPoint[];
    revenueTrend: RevenueTrendPoint[];
    topPurchasedCourses: TopPurchasedCoursePoint[];
    paymentStatusDistribution: PaymentStatusPoint[];
    userStatusDistribution: UserStatusPoint[];
    notificationsByType: NotificationTypePoint[];
  };
}

export type AdminDashboardStatistics = AdminDashboardStatisticsResponse;

export interface AdminDashboardStatisticsParams {
  months?: number;
}

// ─── API Responses ────────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  meta?: PaginationMeta;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore?: boolean;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export type PaginatedApiResponse<T> = ApiResponse<PaginatedResponse<T>>;

// ─── Filters ──────────────────────────────────────────────────────────────────

export interface CourseFilters {
  search?: string;
  level?: CourseLevel;
  language?: string;
  tags?: string[];
  page?: number;
  limit?: number;
}
