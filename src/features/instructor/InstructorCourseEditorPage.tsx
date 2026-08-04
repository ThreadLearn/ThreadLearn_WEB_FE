'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Upload,
  Layers,
  Edit2,
  FileText,
  Video,
  Lock,
} from 'lucide-react';
import { coursesService, sectionsService, instructorLessonsService } from '../../services';

function SectionLessonsList({
  sectionId,
  isCoursePublished,
}: {
  sectionId: string;
  isCoursePublished: boolean;
}) {
  const queryClient = useQueryClient();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [lessonTitle, setLessonTitle] = useState('');
  const [lessonType, setLessonType] = useState<'article' | 'video'>('article');
  const [creating, setCreating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const lessonsQuery = useQuery({
    queryKey: ['instructor-section-lessons', sectionId],
    queryFn: () => instructorLessonsService.listBySection(sectionId),
    enabled: !!sectionId,
  });

  const lessons = lessonsQuery.data || [];

  const handleCreateLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lessonTitle.trim()) return;

    setCreating(true);
    setErrorMsg(null);

    try {
      await instructorLessonsService.create(sectionId, {
        title: lessonTitle,
        lessonType,
      });

      setCreateModalOpen(false);
      setLessonTitle('');
      queryClient.invalidateQueries({ queryKey: ['instructor-section-lessons', sectionId] });
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.message || err?.message || 'Failed to create lesson.');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteLesson = async (lessonId: string) => {
    if (!confirm('Are you sure you want to delete this lesson?')) return;

    try {
      await instructorLessonsService.delete(lessonId);
      queryClient.invalidateQueries({ queryKey: ['instructor-section-lessons', sectionId] });
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || 'Failed to delete lesson.');
    }
  };

  const handleMoveLesson = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= lessons.length) return;

    const newList = [...lessons];
    const temp = newList[index];
    newList[index] = newList[targetIndex];
    newList[targetIndex] = temp;

    const orderedLessonIds = newList.map((l) => l.id || (l as any)._id);

    try {
      await instructorLessonsService.reorder(sectionId, orderedLessonIds);
      queryClient.invalidateQueries({ queryKey: ['instructor-section-lessons', sectionId] });
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || 'Failed to reorder lessons.');
    }
  };

  return (
    <div className="mt-4 rounded-xl border border-black/10 bg-white p-4">
      <div className="flex items-center justify-between border-b border-black/5 pb-2">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
          Lessons ({lessons.length})
        </h4>
        {!isCoursePublished ? (
          <button
            onClick={() => {
              setLessonTitle('');
              setErrorMsg(null);
              setCreateModalOpen(true);
            }}
            className="inline-flex items-center gap-1 rounded-lg border border-black/15 bg-white px-2.5 py-1 text-xs font-medium hover:bg-black/5"
          >
            <Plus size={13} /> Add Lesson
          </button>
        ) : null}
      </div>

      {lessons.length === 0 ? (
        <p className="mt-3 text-xs text-ink-muted italic">No lessons in this section yet.</p>
      ) : (
        <div className="mt-3 space-y-2">
          {lessons.map((les, idx) => {
            const lesId = les.id || (les as any)._id;
            const isReadOnlyType = ['quiz', 'coding', 'assignment', 'mixed'].includes(les.lessonType || '');
            const isLocked = les.isLocked || (les as any).status === 'locked';

            return (
              <div
                key={lesId}
                className="flex items-center justify-between rounded-lg border border-black/5 bg-canvas-cream/30 p-2.5"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-black/50">#{idx + 1}</span>
                  {les.lessonType === 'video' ? <Video size={14} /> : <FileText size={14} />}
                  <span className="text-xs font-medium">{les.title}</span>
                  <span className="rounded bg-black/5 px-1.5 py-0.5 text-[10px] uppercase font-semibold text-black/60">
                    {les.lessonType}
                  </span>
                  {isLocked ? (
                    <span className="inline-flex items-center gap-0.5 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-800">
                      <Lock size={10} /> Locked
                    </span>
                  ) : null}
                  {isReadOnlyType ? (
                    <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-600">
                      Read-Only
                    </span>
                  ) : null}
                </div>

                <div className="flex items-center gap-1">
                  {!isCoursePublished ? (
                    <>
                      <button
                        onClick={() => handleMoveLesson(idx, 'up')}
                        disabled={idx === 0}
                        title="Move Lesson Up"
                        className="rounded p-1 hover:bg-black/10 disabled:opacity-20"
                      >
                        <ArrowUp size={13} />
                      </button>
                      <button
                        onClick={() => handleMoveLesson(idx, 'down')}
                        disabled={idx === lessons.length - 1}
                        title="Move Lesson Down"
                        className="rounded p-1 hover:bg-black/10 disabled:opacity-20"
                      >
                        <ArrowDown size={13} />
                      </button>
                    </>
                  ) : null}

                  <Link
                    href={`/instructor/lessons/${lesId}/edit`}
                    className="rounded p-1 hover:bg-black/10 text-ink"
                    title="Edit Lesson"
                  >
                    <Edit2 size={13} />
                  </Link>

                  {!isCoursePublished && !isLocked && !isReadOnlyType ? (
                    <button
                      onClick={() => handleDeleteLesson(lesId)}
                      title="Delete Lesson"
                      className="rounded p-1 hover:bg-rose-100 text-rose-700"
                    >
                      <Trash2 size={13} />
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Lesson Modal */}
      {createModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
            <h3 className="text-base font-medium">Create New Lesson</h3>

            {errorMsg ? (
              <div className="mt-2 rounded-lg bg-rose-50 p-2.5 text-xs text-rose-800">
                {errorMsg}
              </div>
            ) : null}

            <form onSubmit={handleCreateLesson} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-medium uppercase text-ink-muted">Title *</label>
                <input
                  type="text"
                  required
                  value={lessonTitle}
                  onChange={(e) => setLessonTitle(e.target.value)}
                  placeholder="e.g. Introduction to Variables"
                  className="mt-1 w-full rounded-xl border border-black/15 px-3 py-2 text-xs outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium uppercase text-ink-muted">Lesson Type</label>
                <select
                  value={lessonType}
                  onChange={(e) => setLessonType(e.target.value as any)}
                  className="mt-1 w-full rounded-xl border border-black/15 px-3 py-2 text-xs outline-none"
                >
                  <option value="article">Article / Text</option>
                  <option value="video">Video</option>
                </select>
                <p className="mt-1 text-[11px] text-ink-muted">
                  Instructors can create Article or Video lessons. Quiz and Exercise types are Admin-managed.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="rounded-xl border border-black/15 px-3 py-1.5 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="rounded-xl bg-black px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-black/80 disabled:opacity-50"
                >
                  {creating ? 'Creating...' : 'Create Lesson'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function InstructorCourseEditorPage({ courseId }: { courseId: string }) {
  const queryClient = useQueryClient();

  const [savingCourse, setSavingCourse] = useState(false);
  const [courseError, setCourseError] = useState<string | null>(null);
  const [courseSuccess, setCourseSuccess] = useState<string | null>(null);

  // Section modal state
  const [sectionModalOpen, setSectionModalOpen] = useState(false);
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [sectionTitle, setSectionTitle] = useState('');
  const [sectionDesc, setSectionDesc] = useState('');
  const [sectionError, setSectionError] = useState<string | null>(null);

  // Thumbnail upload
  const [uploadingThumb, setUploadingThumb] = useState(false);

  // Load course details
  const courseQuery = useQuery({
    queryKey: ['instructor-course', courseId],
    queryFn: () => coursesService.getMyInstructorCourseById(courseId),
  });

  // Load sections
  const sectionsQuery = useQuery({
    queryKey: ['instructor-sections', courseId],
    queryFn: () => sectionsService.listByCourse(courseId),
    enabled: !!courseId,
  });

  const course = courseQuery.data?.course;
  const isCoursePublished = course?.status === 'published';

  // Local course form state
  const [formData, setFormData] = useState<{
    title: string;
    description: string;
    shortDescription: string;
    language: 'javascript' | 'java' | 'python';
    level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
    category: string;
    estimatedDuration: number;
    tagsInput: string;
  }>({
    title: '',
    description: '',
    shortDescription: '',
    language: 'javascript',
    level: 'BEGINNER',
    category: '',
    estimatedDuration: 60,
    tagsInput: '',
  });

  const [initialized, setInitialized] = useState(false);
  if (course && !initialized) {
    setFormData({
      title: course.title || '',
      description: course.description || '',
      shortDescription: course.shortDescription || '',
      language: (course.language as any) || 'javascript',
      level: (course.level as any) || 'BEGINNER',
      category: course.category || '',
      estimatedDuration: course.estimatedDuration || 60,
      tagsInput: Array.isArray(course.tags) ? course.tags.join(', ') : '',
    });
    setInitialized(true);
  }

  const handleUpdateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isCoursePublished) return;

    setSavingCourse(true);
    setCourseError(null);
    setCourseSuccess(null);

    try {
      const tags = formData.tagsInput
        ? formData.tagsInput.split(',').map((t) => t.trim()).filter(Boolean)
        : [];

      await coursesService.updateMyInstructorCourse(courseId, {
        title: formData.title,
        description: formData.description,
        shortDescription: formData.shortDescription || undefined,
        language: formData.language,
        level: formData.level,
        category: formData.category || undefined,
        estimatedDuration: Number(formData.estimatedDuration) || 0,
        tags,
      });

      setCourseSuccess('Course details updated successfully.');
      queryClient.invalidateQueries({ queryKey: ['instructor-course', courseId] });
    } catch (err: any) {
      setCourseError(err?.response?.data?.message || err?.message || 'Failed to update course.');
    } finally {
      setSavingCourse(false);
    }
  };

  const handleThumbnailChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || isCoursePublished) return;

    setUploadingThumb(true);
    setCourseError(null);

    try {
      await coursesService.uploadMyInstructorCourseThumbnail(courseId, file);
      setCourseSuccess('Thumbnail uploaded successfully.');
      queryClient.invalidateQueries({ queryKey: ['instructor-course', courseId] });
    } catch (err: any) {
      setCourseError(err?.response?.data?.message || err?.message || 'Failed to upload thumbnail.');
    } finally {
      setUploadingThumb(false);
    }
  };

  // Section handlers
  const openNewSectionModal = () => {
    setEditingSectionId(null);
    setSectionTitle('');
    setSectionDesc('');
    setSectionError(null);
    setSectionModalOpen(true);
  };

  const openEditSectionModal = (sec: any) => {
    setEditingSectionId(sec.id || sec._id);
    setSectionTitle(sec.title || '');
    setSectionDesc(sec.description || '');
    setSectionError(null);
    setSectionModalOpen(true);
  };

  const handleSaveSection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sectionTitle.trim() || isCoursePublished) return;

    setSectionError(null);

    try {
      if (editingSectionId) {
        await sectionsService.update(editingSectionId, {
          title: sectionTitle,
          description: sectionDesc || undefined,
        });
      } else {
        await sectionsService.create({
          courseId,
          title: sectionTitle,
          description: sectionDesc || undefined,
        });
      }

      setSectionModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['instructor-sections', courseId] });
    } catch (err: any) {
      setSectionError(err?.response?.data?.message || err?.message || 'Failed to save section.');
    }
  };

  const handleDeleteSection = async (secId: string) => {
    if (!confirm('Are you sure you want to delete this section?') || isCoursePublished) return;

    try {
      await sectionsService.remove(secId);
      queryClient.invalidateQueries({ queryKey: ['instructor-sections', courseId] });
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || 'Failed to delete section.');
    }
  };

  const handleMoveSection = async (index: number, direction: 'up' | 'down') => {
    const list = sectionsQuery.data || [];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= list.length || isCoursePublished) return;

    const newList = [...list];
    const temp = newList[index];
    newList[index] = newList[targetIndex];
    newList[targetIndex] = temp;

    const items = newList.map((sec, idx) => ({
      id: sec.id || (sec as any)._id,
      orderIndex: idx,
    }));

    try {
      await sectionsService.reorder(courseId, items);
      queryClient.invalidateQueries({ queryKey: ['instructor-sections', courseId] });
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || 'Failed to reorder sections.');
    }
  };

  if (courseQuery.isLoading) {
    return (
      <main className="min-h-screen bg-canvas-cream px-6 py-10">
        <div className="mx-auto max-w-5xl">
          <div className="h-44 animate-pulse rounded-2xl bg-white" />
        </div>
      </main>
    );
  }

  if (courseQuery.isError) {
    return (
      <main className="min-h-screen bg-canvas-cream px-6 py-10">
        <div className="mx-auto max-w-5xl">
          <Link href="/instructor/courses" className="inline-flex items-center gap-2 text-sm text-ink-muted hover:text-ink">
            <ArrowLeft size={15} /> Back to My Courses
          </Link>
          <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-800">
            <h2 className="font-medium">Access Denied or Course Not Found</h2>
            <p className="mt-1 text-sm">You do not have authoring permission for this course or it may have been reassigned.</p>
          </div>
        </div>
      </main>
    );
  }

  const sections = sectionsQuery.data || [];

  return (
    <main className="min-h-screen bg-canvas-cream px-6 py-10 text-ink md:px-12">
      <div className="mx-auto max-w-5xl space-y-8">
        <div className="flex items-center justify-between">
          <Link href="/instructor/courses" className="inline-flex items-center gap-2 text-sm text-ink-muted hover:text-ink">
            <ArrowLeft size={15} /> Back to My Courses
          </Link>
          <span className="rounded-full bg-black/5 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-ink-muted">
            Status: {course?.status ?? 'draft'}
          </span>
        </div>

        {courseError ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
            {courseError}
          </div>
        ) : null}

        {courseSuccess ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            {courseSuccess}
          </div>
        ) : null}

        {/* Course Info Form */}
        <section className="rounded-3xl border border-black/10 bg-white p-7 shadow-sm">
          <div className="flex items-center justify-between border-b border-black/5 pb-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-muted">Course Details</p>
              <h1 className="text-2xl font-light tracking-tight">{course?.title}</h1>
            </div>
            {course?.thumbnailUrl ? (
              <img src={course.thumbnailUrl} alt="Thumbnail" className="h-16 w-28 rounded-lg object-cover border" />
            ) : null}
          </div>

          <form onSubmit={handleUpdateCourse} className="mt-6 flex flex-col gap-5">
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-ink-muted">Title *</label>
              <input
                type="text"
                required
                disabled={isCoursePublished}
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="mt-1 w-full rounded-xl border border-black/15 bg-white px-4 py-2.5 text-sm outline-none focus:border-black disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-ink-muted">Short Description</label>
              <input
                type="text"
                disabled={isCoursePublished}
                value={formData.shortDescription}
                onChange={(e) => setFormData({ ...formData, shortDescription: e.target.value })}
                className="mt-1 w-full rounded-xl border border-black/15 bg-white px-4 py-2.5 text-sm outline-none focus:border-black disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-ink-muted">Full Description *</label>
              <textarea
                required
                rows={4}
                disabled={isCoursePublished}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="mt-1 w-full rounded-xl border border-black/15 bg-white px-4 py-2.5 text-sm outline-none focus:border-black disabled:opacity-50"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-ink-muted">Language</label>
                <select
                  disabled={isCoursePublished}
                  value={formData.language}
                  onChange={(e) => setFormData({ ...formData, language: e.target.value as any })}
                  className="mt-1 w-full rounded-xl border border-black/15 bg-white px-3 py-2.5 text-sm outline-none disabled:opacity-50"
                >
                  <option value="javascript">JavaScript</option>
                  <option value="java">Java</option>
                  <option value="python">Python</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-ink-muted">Level</label>
                <select
                  disabled={isCoursePublished}
                  value={formData.level}
                  onChange={(e) => setFormData({ ...formData, level: e.target.value as any })}
                  className="mt-1 w-full rounded-xl border border-black/15 bg-white px-3 py-2.5 text-sm outline-none disabled:opacity-50"
                >
                  <option value="BEGINNER">Beginner</option>
                  <option value="INTERMEDIATE">Intermediate</option>
                  <option value="ADVANCED">Advanced</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-ink-muted">Est. Duration (mins)</label>
                <input
                  type="number"
                  min="0"
                  disabled={isCoursePublished}
                  value={formData.estimatedDuration}
                  onChange={(e) => setFormData({ ...formData, estimatedDuration: Number(e.target.value) })}
                  className="mt-1 w-full rounded-xl border border-black/15 bg-white px-4 py-2.5 text-sm outline-none disabled:opacity-50"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-ink-muted">Category</label>
                <input
                  type="text"
                  disabled={isCoursePublished}
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-black/15 bg-white px-4 py-2.5 text-sm outline-none disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-ink-muted">Tags (comma separated)</label>
                <input
                  type="text"
                  disabled={isCoursePublished}
                  value={formData.tagsInput}
                  onChange={(e) => setFormData({ ...formData, tagsInput: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-black/15 bg-white px-4 py-2.5 text-sm outline-none disabled:opacity-50"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 border-t border-black/10 pt-5">
              <div>
                <label className={`inline-flex cursor-pointer items-center gap-2 rounded-xl border border-black/15 bg-white px-4 py-2 text-xs font-medium hover:bg-black/5 ${isCoursePublished ? 'opacity-50 pointer-events-none' : ''}`}>
                  <Upload size={14} />
                  {uploadingThumb ? 'Uploading...' : 'Upload Thumbnail'}
                  <input type="file" accept="image/*" onChange={handleThumbnailChange} disabled={uploadingThumb || isCoursePublished} className="hidden" />
                </label>
              </div>

              <button
                type="submit"
                disabled={savingCourse || isCoursePublished}
                className="inline-flex items-center gap-2 rounded-xl bg-black px-5 py-2 text-sm font-medium text-white shadow-sm hover:bg-black/80 disabled:opacity-50"
              >
                <Save size={15} />
                {savingCourse ? 'Saving...' : 'Save Course Details'}
              </button>
            </div>
          </form>
        </section>

        {/* Section & Lesson Management */}
        <section className="rounded-3xl border border-black/10 bg-white p-7 shadow-sm">
          <div className="flex items-center justify-between border-b border-black/5 pb-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-muted">Curriculum Authoring</p>
              <h2 className="text-xl font-medium tracking-tight">Sections & Lessons ({sections.length})</h2>
            </div>
            {!isCoursePublished ? (
              <button
                onClick={openNewSectionModal}
                className="inline-flex items-center gap-2 rounded-xl bg-black px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-black/80"
              >
                <Plus size={15} /> Add Section
              </button>
            ) : null}
          </div>

          {sections.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-black/15 bg-white p-8 text-center">
              <Layers className="mx-auto text-black/35" />
              <p className="mt-2 text-sm font-medium">No sections added yet</p>
              <p className="text-xs text-ink-muted">Add sections to structure your course curriculum.</p>
            </div>
          ) : (
            <div className="mt-6 space-y-6">
              {sections.map((sec, idx) => {
                const secId = sec.id || (sec as any)._id;
                return (
                  <div key={secId} className="rounded-2xl border border-black/10 bg-canvas-cream/40 p-5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="rounded-md bg-black/10 px-2 py-0.5 text-xs font-bold text-black/60">
                          #{idx + 1}
                        </span>
                        <h3 className="font-medium text-base">{sec.title}</h3>
                      </div>

                      <div className="flex items-center gap-2">
                        {!isCoursePublished ? (
                          <>
                            <button
                              onClick={() => handleMoveSection(idx, 'up')}
                              disabled={idx === 0}
                              title="Move Section Up"
                              className="rounded-lg p-1.5 hover:bg-black/10 disabled:opacity-30"
                            >
                              <ArrowUp size={14} />
                            </button>
                            <button
                              onClick={() => handleMoveSection(idx, 'down')}
                              disabled={idx === sections.length - 1}
                              title="Move Section Down"
                              className="rounded-lg p-1.5 hover:bg-black/10 disabled:opacity-30"
                            >
                              <ArrowDown size={14} />
                            </button>
                            <button
                              onClick={() => openEditSectionModal(sec)}
                              title="Edit Section"
                              className="rounded-lg p-1.5 hover:bg-black/10 text-ink"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              onClick={() => handleDeleteSection(secId)}
                              title="Delete Section"
                              className="rounded-lg p-1.5 hover:bg-rose-100 text-rose-700"
                            >
                              <Trash2 size={14} />
                            </button>
                          </>
                        ) : null}
                      </div>
                    </div>
                    {sec.description ? <p className="mt-1 text-xs text-ink-muted">{sec.description}</p> : null}

                    {/* Render Section Lessons list */}
                    <SectionLessonsList sectionId={secId} isCoursePublished={Boolean(isCoursePublished)} />
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* Section Create / Edit Modal */}
      {sectionModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-medium">
              {editingSectionId ? 'Edit Section' : 'Create Section'}
            </h3>

            {sectionError ? (
              <div className="mt-3 rounded-lg bg-rose-50 p-3 text-xs text-rose-800">
                {sectionError}
              </div>
            ) : null}

            <form onSubmit={handleSaveSection} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-medium uppercase text-ink-muted">Title *</label>
                <input
                  type="text"
                  required
                  value={sectionTitle}
                  onChange={(e) => setSectionTitle(e.target.value)}
                  placeholder="e.g. Section 1: Foundations"
                  className="mt-1 w-full rounded-xl border border-black/15 px-3 py-2 text-sm outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium uppercase text-ink-muted">Description</label>
                <textarea
                  rows={3}
                  value={sectionDesc}
                  onChange={(e) => setSectionDesc(e.target.value)}
                  placeholder="Overview of topics in this section..."
                  className="mt-1 w-full rounded-xl border border-black/15 px-3 py-2 text-sm outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSectionModalOpen(false)}
                  className="rounded-xl border border-black/15 px-4 py-2 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-black px-4 py-2 text-xs font-medium text-white shadow-sm hover:bg-black/80"
                >
                  {editingSectionId ? 'Save Changes' : 'Create Section'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </main>
  );
}
