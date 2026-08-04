'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Save, Upload, Video, FileText, Lock, AlertTriangle } from 'lucide-react';
import { instructorLessonsService } from '../../services';

export default function InstructorLessonEditorPage({ lessonId }: { lessonId: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [saving, setSaving] = useState(false);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const lessonQuery = useQuery({
    queryKey: ['instructor-lesson-detail', lessonId],
    queryFn: () => instructorLessonsService.getById(lessonId),
  });

  const lesson = lessonQuery.data;

  const [formData, setFormData] = useState<{
    title: string;
    description: string;
    contentMarkdown: string;
    videoUrl: string;
    transcript: string;
    transcriptLanguage: string;
    estimatedTime: number;
  }>({
    title: '',
    description: '',
    contentMarkdown: '',
    videoUrl: '',
    transcript: '',
    transcriptLanguage: 'en',
    estimatedTime: 10,
  });

  const [initialized, setInitialized] = useState(false);
  if (lesson && !initialized) {
    setFormData({
      title: lesson.title || '',
      description: lesson.description || '',
      contentMarkdown: lesson.contentMarkdown || lesson.content || '',
      videoUrl: lesson.videoUrl || '',
      transcript: lesson.transcript || '',
      transcriptLanguage: lesson.transcriptLanguage || 'en',
      estimatedTime: lesson.estimatedTime || 10,
    });
    setInitialized(true);
  }

  const isReadOnly =
    lesson?.isLocked ||
    (lesson as any)?.status === 'locked' ||
    ['quiz', 'coding', 'assignment', 'mixed'].includes(lesson?.lessonType || '');

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;

    setSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      await instructorLessonsService.update(lessonId, {
        title: formData.title,
        description: formData.description || undefined,
        contentMarkdown: formData.contentMarkdown || undefined,
        videoUrl: formData.videoUrl || undefined,
        transcript: formData.transcript || undefined,
        transcriptLanguage: formData.transcriptLanguage || undefined,
        estimatedTime: Number(formData.estimatedTime) || 0,
      });

      setSuccessMsg('Lesson content saved successfully.');
      queryClient.invalidateQueries({ queryKey: ['instructor-lesson-detail', lessonId] });
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.message || err?.message || 'Failed to save lesson.');
    } finally {
      setSaving(false);
    }
  };

  const handleAttachmentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || isReadOnly) return;

    setUploadingAttachment(true);
    setErrorMsg(null);

    try {
      await instructorLessonsService.uploadAttachment(lessonId, file);
      setSuccessMsg('Attachment uploaded successfully.');
      queryClient.invalidateQueries({ queryKey: ['instructor-lesson-detail', lessonId] });
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.message || err?.message || 'Failed to upload attachment.');
    } finally {
      setUploadingAttachment(false);
    }
  };

  if (lessonQuery.isLoading) {
    return (
      <main className="min-h-screen bg-canvas-cream px-6 py-10">
        <div className="mx-auto max-w-4xl">
          <div className="h-44 animate-pulse rounded-2xl bg-white" />
        </div>
      </main>
    );
  }

  if (lessonQuery.isError || !lesson) {
    return (
      <main className="min-h-screen bg-canvas-cream px-6 py-10">
        <div className="mx-auto max-w-4xl">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 text-sm text-ink-muted hover:text-ink"
          >
            <ArrowLeft size={15} /> Back
          </button>
          <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-800">
            <h2 className="font-medium">Lesson Not Found or Access Denied</h2>
            <p className="mt-1 text-sm">
              You may not have authoring permission for this lesson, or the parent course/section has been locked or modified.
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-canvas-cream px-6 py-10 text-ink md:px-12">
      <div className="mx-auto max-w-4xl space-y-8">
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 text-sm text-ink-muted hover:text-ink"
          >
            <ArrowLeft size={15} /> Back to Course Editor
          </button>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-black/5 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-ink-muted">
              Type: {lesson.lessonType}
            </span>
            {isReadOnly ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800">
                <Lock size={12} /> Read-Only
              </span>
            ) : null}
          </div>
        </div>

        {errorMsg ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
            {errorMsg}
          </div>
        ) : null}

        {successMsg ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            {successMsg}
          </div>
        ) : null}

        {isReadOnly ? (
          <div className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            <AlertTriangle size={18} />
            <span>
              This lesson is locked or of type &quot;{lesson.lessonType}&quot;. Instructors cannot edit or delete read-only lessons.
            </span>
          </div>
        ) : null}

        <section className="rounded-3xl border border-black/10 bg-white p-7 shadow-sm">
          <div className="flex items-center justify-between border-b border-black/5 pb-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-muted">Lesson Authoring</p>
              <h1 className="text-2xl font-light tracking-tight">{lesson.title}</h1>
            </div>
            {lesson.lessonType === 'video' ? (
              <Video className="text-black/40" />
            ) : (
              <FileText className="text-black/40" />
            )}
          </div>

          <form onSubmit={handleSave} className="mt-6 flex flex-col gap-5">
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-ink-muted">Title *</label>
              <input
                type="text"
                required
                disabled={isReadOnly}
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="mt-1 w-full rounded-xl border border-black/15 bg-white px-4 py-2.5 text-sm outline-none focus:border-black disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-ink-muted">Description</label>
              <textarea
                rows={2}
                disabled={isReadOnly}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="mt-1 w-full rounded-xl border border-black/15 bg-white px-4 py-2.5 text-sm outline-none focus:border-black disabled:opacity-50"
              />
            </div>

            {lesson.lessonType === 'video' ? (
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-ink-muted">
                  Video URL (http:// or https://)
                </label>
                <input
                  type="url"
                  disabled={isReadOnly}
                  placeholder="https://example.com/video.mp4"
                  value={formData.videoUrl}
                  onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-black/15 bg-white px-4 py-2.5 text-sm outline-none focus:border-black disabled:opacity-50"
                />
              </div>
            ) : null}

            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-ink-muted">Content (Markdown)</label>
              <textarea
                rows={8}
                disabled={isReadOnly}
                value={formData.contentMarkdown}
                onChange={(e) => setFormData({ ...formData, contentMarkdown: e.target.value })}
                placeholder="Write your lesson content using Markdown..."
                className="mt-1 w-full font-mono rounded-xl border border-black/15 bg-white px-4 py-2.5 text-sm outline-none focus:border-black disabled:opacity-50"
              />
            </div>

            {lesson.lessonType === 'video' ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider text-ink-muted">Transcript</label>
                  <textarea
                    rows={4}
                    disabled={isReadOnly}
                    value={formData.transcript}
                    onChange={(e) => setFormData({ ...formData, transcript: e.target.value })}
                    placeholder="Video transcript text..."
                    className="mt-1 w-full rounded-xl border border-black/15 bg-white px-4 py-2.5 text-sm outline-none disabled:opacity-50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider text-ink-muted">Transcript Language</label>
                  <input
                    type="text"
                    disabled={isReadOnly}
                    value={formData.transcriptLanguage}
                    onChange={(e) => setFormData({ ...formData, transcriptLanguage: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-black/15 bg-white px-4 py-2.5 text-sm outline-none disabled:opacity-50"
                  />
                </div>
              </div>
            ) : null}

            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-ink-muted">
                Attachments ({lesson.attachments?.length || 0})
              </label>
              <div className="mt-2 flex items-center gap-3">
                <label className={`inline-flex cursor-pointer items-center gap-2 rounded-xl border border-black/15 bg-white px-4 py-2 text-xs font-medium hover:bg-black/5 ${isReadOnly ? 'opacity-50 pointer-events-none' : ''}`}>
                  <Upload size={14} />
                  {uploadingAttachment ? 'Uploading...' : 'Upload Attachment File'}
                  <input type="file" onChange={handleAttachmentUpload} disabled={uploadingAttachment || isReadOnly} className="hidden" />
                </label>
              </div>
              {lesson.attachments && lesson.attachments.length > 0 ? (
                <ul className="mt-2 space-y-1 text-xs text-ink-muted">
                  {lesson.attachments.map((att: string, idx: number) => (
                    <li key={idx} className="truncate font-mono">
                      • {att}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>

            <div className="flex items-center justify-between border-t border-black/10 pt-5">
              <button
                type="button"
                onClick={() => router.back()}
                className="rounded-xl border border-black/15 px-4 py-2 text-xs font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || isReadOnly}
                className="inline-flex items-center gap-2 rounded-xl bg-black px-5 py-2 text-sm font-medium text-white shadow-sm hover:bg-black/80 disabled:opacity-50"
              >
                <Save size={15} />
                {saving ? 'Saving...' : 'Save Lesson'}
              </button>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}
