'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  instructorCodeAssignmentsService,
  coursesService,
  lessonsService,
  type InstructorCodeAssignmentManagement,
} from '../../services';

export interface EditableExerciseTestCase {
  clientKey: string;
  persistedId?: string;
  input: string;
  expectedOutput: string;
  isHidden: boolean;
  points: number;
}

interface InstructorCodeAssignmentEditorPageProps {
  exerciseId: string;
}

const generateClientKey = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `ck-${Math.random().toString(36).slice(2, 9)}-${Math.random().toString(36).slice(2, 9)}`;
};

export function InstructorCodeAssignmentEditorPage({ exerciseId }: InstructorCodeAssignmentEditorPageProps) {
  const router = useRouter();

  // State
  const [loading, setLoading] = useState(true);
  const [exercise, setExercise] = useState<InstructorCodeAssignmentManagement | null>(null);
  const [readOnly, setReadOnly] = useState(false);
  const [readOnlyReason, setReadOnlyReason] = useState<string | null>(null);

  // Form states for Exercise Metadata
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [starterCode, setStarterCode] = useState('');
  const [language, setLanguage] = useState<'javascript' | 'python' | 'java' | 'cpp' | 'c'>('javascript');
  const [timeLimitMs, setTimeLimitMs] = useState(5000);
  const [memoryLimitKb, setMemoryLimitKb] = useState(131072);
  const [deadline, setDeadline] = useState<string>('');
  const [maxSubmissions, setMaxSubmissions] = useState<string>('');
  const [statusDisplay, setStatusDisplay] = useState('DRAFT');
  const [saving, setSaving] = useState(false);

  // Local Editable Test Cases State
  const [testCases, setTestCases] = useState<EditableExerciseTestCase[]>([]);
  const [tcModalOpen, setTcModalOpen] = useState(false);
  const [tcEditingIndex, setTcEditingIndex] = useState<number | null>(null);
  const [tcInput, setTcInput] = useState('');
  const [tcExpectedOutput, setTcExpectedOutput] = useState('');
  const [tcIsHidden, setTcIsHidden] = useState(false);
  const [tcPoints, setTcPoints] = useState(1);
  const [tcError, setTcError] = useState<string | null>(null);

  // Load Exercise Data & Context
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await instructorCodeAssignmentsService.get(exerciseId);
      setExercise(data);
      setTitle(data.title || '');
      setDescription(data.description || '');
      setStarterCode(data.starterCode || '');
      setLanguage((data.language as any) || 'javascript');
      setTimeLimitMs(data.timeLimitMs || 5000);
      setMemoryLimitKb(data.memoryLimitKb || 131072);
      setStatusDisplay(data.status || 'DRAFT');
      setDeadline(data.deadline ? new Date(data.deadline).toISOString().slice(0, 16) : '');
      setMaxSubmissions(data.maxSubmissions !== undefined && data.maxSubmissions !== null ? String(data.maxSubmissions) : '');
      setTestCases(
        data.testCases && data.testCases.length > 0
          ? data.testCases.map((tc) => ({
              clientKey: generateClientKey(),
              persistedId: tc.id || tc._id,
              input: tc.input || '',
              expectedOutput: tc.expectedOutput || '',
              isHidden: Boolean(tc.isHidden),
              points: tc.points ?? 1,
            }))
          : []
      );

      // Check lesson and course status for read-only conditions
      if (data.lessonId) {
        try {
          const lesson = await lessonsService.getById(data.lessonId);
          if (lesson.isLocked) {
            setReadOnly(true);
            setReadOnlyReason('Lesson is locked.');
          }
          if (lesson.courseId) {
            const courseDetail = await coursesService.getById(lesson.courseId);
            const courseStatus = courseDetail.course.status;
            // Rule: ONLY draft course allows mutation. hidden, published, archived, deleted are read-only!
            if (courseStatus !== 'draft') {
              setReadOnly(true);
              setReadOnlyReason(`Course status is "${courseStatus || 'non-draft'}". Authoring is read-only.`);
            }
          }
        } catch {
          setReadOnly(true);
          setReadOnlyReason('Course access permission required.');
        }
      }
    } catch (err: any) {
      const status = err?.response?.status || err?.status;
      if (status === 403) {
        setReadOnly(true);
        setReadOnlyReason('Access denied or course ownership changed.');
        toast.error('Forbidden: You do not have permission to manage this exercise.');
      } else if (status === 404) {
        toast.error('Exercise not found or deleted.');
        router.push('/instructor/courses');
      } else {
        toast.error(err?.message || 'Failed to load coding exercise.');
      }
    } finally {
      setLoading(false);
    }
  }, [exerciseId, router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle Save Exercise
  const handleSaveExercise = async (e: React.FormEvent) => {
    e.preventDefault();
    if (readOnly) {
      toast.error('Exercise is in read-only mode.');
      return;
    }

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      toast.error('Exercise title is required.');
      return;
    }

    if (timeLimitMs < 100 || timeLimitMs > 30000) {
      toast.error('Time limit must be between 100ms and 30000ms.');
      return;
    }

    if (memoryLimitKb < 16384 || memoryLimitKb > 524288) {
      toast.error('Memory limit must be between 16384KB (16MB) and 524288KB (512MB).');
      return;
    }

    const parsedMaxSubmissions = maxSubmissions.trim() ? Number(maxSubmissions) : null;
    if (parsedMaxSubmissions !== null && (isNaN(parsedMaxSubmissions) || parsedMaxSubmissions < 1)) {
      toast.error('Max submissions must be a positive integer.');
      return;
    }

    const formattedDeadline = deadline.trim() ? new Date(deadline).toISOString() : null;

    // Strict payload mapping: ONLY input, expectedOutput, isHidden, points sent to Backend
    const payload = {
      title: trimmedTitle,
      description: description.trim(),
      starterCode,
      language,
      timeLimitMs: Number(timeLimitMs),
      memoryLimitKb: Number(memoryLimitKb),
      deadline: formattedDeadline,
      maxSubmissions: parsedMaxSubmissions,
      testCases: testCases.map((tc) => ({
        input: tc.input || '',
        expectedOutput: tc.expectedOutput || '',
        isHidden: Boolean(tc.isHidden),
        points: Number(tc.points) || 1,
      })),
    };

    try {
      setSaving(true);
      const updated = await instructorCodeAssignmentsService.update(exerciseId, payload);
      setExercise(updated);
      toast.success('Coding exercise updated successfully.');
    } catch (err: any) {
      const status = err?.response?.status || err?.status;
      if (status === 403) {
        setReadOnly(true);
        setReadOnlyReason('Permission revoked or course status changed.');
        toast.error('Permission denied. Switched editor to read-only mode.');
      } else {
        toast.error(err?.response?.data?.message || err?.message || 'Failed to update exercise.');
      }
    } finally {
      setSaving(false);
    }
  };

  // Test Case Modal Handlers
  const openCreateTestCaseModal = () => {
    if (readOnly) return;
    setTcEditingIndex(null);
    setTcInput('');
    setTcExpectedOutput('');
    setTcIsHidden(false);
    setTcPoints(1);
    setTcError(null);
    setTcModalOpen(true);
  };

  const openEditTestCaseModal = (index: number) => {
    if (readOnly) return;
    const tc = testCases[index];
    if (!tc) return;
    setTcEditingIndex(index);
    setTcInput(tc.input || '');
    setTcExpectedOutput(tc.expectedOutput || '');
    setTcIsHidden(Boolean(tc.isHidden));
    setTcPoints(tc.points ?? 1);
    setTcError(null);
    setTcModalOpen(true);
  };

  const handleSaveTestCaseModal = (e: React.FormEvent) => {
    e.preventDefault();
    setTcError(null);

    const normOutput = tcExpectedOutput.trim();
    if (!normOutput) {
      setTcError('Expected output is required.');
      return;
    }

    if (tcPoints < 0 || isNaN(tcPoints)) {
      setTcError('Points must be a non-negative number.');
      return;
    }

    const updated = [...testCases];

    if (tcEditingIndex !== null) {
      // Maintain clientKey stably when editing
      updated[tcEditingIndex] = {
        ...updated[tcEditingIndex],
        input: tcInput,
        expectedOutput: normOutput,
        isHidden: tcIsHidden,
        points: Number(tcPoints),
      };
    } else {
      // Assign new clientKey when creating new test case
      updated.push({
        clientKey: generateClientKey(),
        input: tcInput,
        expectedOutput: normOutput,
        isHidden: tcIsHidden,
        points: Number(tcPoints),
      });
    }

    setTestCases(updated);
    setTcModalOpen(false);
    toast.success(tcEditingIndex !== null ? 'Test case updated in form.' : 'Test case added to form.');
  };

  const handleRemoveTestCase = (index: number) => {
    if (readOnly) return;
    setTestCases(testCases.filter((_, i) => i !== index));
    toast.info('Test case removed from form.');
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-400">
        <p className="text-lg font-medium">Loading Coding Exercise Editor...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8">
      {/* Header Navigation */}
      <div className="flex items-center justify-between border-b border-slate-700 pb-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-400 mb-1">
            <Link href="/instructor/courses" className="hover:text-white transition">
              Courses
            </Link>
            <span>/</span>
            <span>Coding Exercise Editor</span>
          </div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            {title || 'Coding Exercise Editor'}
            {readOnly && (
              <span className="text-xs font-semibold px-2.5 py-1 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Read-Only ({readOnlyReason || 'Course/Lesson locked'})
              </span>
            )}
          </h1>
        </div>
      </div>

      {/* Exercise Metadata Settings Form */}
      <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-white mb-4">Exercise Configuration</h2>
        <form onSubmit={handleSaveExercise} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="exercise-title-input" className="block text-sm font-medium text-slate-300 mb-1">
                Exercise Title *
              </label>
              <input
                id="exercise-title-input"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={readOnly}
                required
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500 disabled:opacity-60"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Exercise Status
              </label>
              <div className="w-full bg-slate-900/60 border border-slate-700/60 rounded-lg px-3 py-2 text-slate-300 text-sm">
                <span className="font-semibold text-emerald-400 uppercase">{statusDisplay}</span>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Publishing status is read-only in Instructor workspace.
                </p>
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="exercise-description-input" className="block text-sm font-medium text-slate-300 mb-1">
              Problem Description / Instructions
            </label>
            <textarea
              id="exercise-description-input"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={readOnly}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500 disabled:opacity-60"
              placeholder="Describe problem statement, input/output formats, and constraints..."
            />
          </div>

          {/* Language & Starter Code */}
          <div className="space-y-4 pt-2 border-t border-slate-700/60">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="exercise-language-select" className="block text-sm font-medium text-slate-300 mb-1">
                  Programming Language *
                </label>
                <select
                  id="exercise-language-select"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as any)}
                  disabled={readOnly}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500 disabled:opacity-60"
                >
                  <option value="javascript">JavaScript</option>
                  <option value="python">Python</option>
                  <option value="java">Java</option>
                  <option value="cpp">C++</option>
                  <option value="c">C</option>
                </select>
              </div>

              <div>
                <label htmlFor="exercise-timelimit-input" className="block text-sm font-medium text-slate-300 mb-1">
                  Time Limit (ms)
                </label>
                <input
                  id="exercise-timelimit-input"
                  type="number"
                  min={100}
                  max={30000}
                  value={timeLimitMs}
                  onChange={(e) => setTimeLimitMs(Number(e.target.value))}
                  disabled={readOnly}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500 disabled:opacity-60"
                />
              </div>

              <div>
                <label htmlFor="exercise-memorylimit-input" className="block text-sm font-medium text-slate-300 mb-1">
                  Memory Limit (KB)
                </label>
                <input
                  id="exercise-memorylimit-input"
                  type="number"
                  min={16384}
                  max={524288}
                  value={memoryLimitKb}
                  onChange={(e) => setMemoryLimitKb(Number(e.target.value))}
                  disabled={readOnly}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500 disabled:opacity-60"
                />
              </div>
            </div>

            <div>
              <label htmlFor="exercise-startercode-input" className="block text-sm font-medium text-slate-300 mb-1">
                Starter Template Code
              </label>
              <textarea
                id="exercise-startercode-input"
                rows={6}
                value={starterCode}
                onChange={(e) => setStarterCode(e.target.value)}
                disabled={readOnly}
                className="w-full font-mono bg-slate-900 border border-slate-700 rounded-lg p-3 text-emerald-300 text-sm focus:outline-none focus:border-indigo-500 disabled:opacity-60"
                placeholder="// Enter starter code template for students..."
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-700/60">
            <div>
              <label htmlFor="exercise-deadline-input" className="block text-sm font-medium text-slate-300 mb-1">
                Deadline (Optional)
              </label>
              <input
                id="exercise-deadline-input"
                type="datetime-local"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                disabled={readOnly}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500 disabled:opacity-60"
              />
            </div>

            <div>
              <label htmlFor="exercise-maxsubmissions-input" className="block text-sm font-medium text-slate-300 mb-1">
                Max Allowed Submissions (Optional)
              </label>
              <input
                id="exercise-maxsubmissions-input"
                type="number"
                min={1}
                max={1000}
                placeholder="Unlimited if empty"
                value={maxSubmissions}
                onChange={(e) => setMaxSubmissions(e.target.value)}
                disabled={readOnly}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500 disabled:opacity-60"
              />
            </div>
          </div>

          {!readOnly && (
            <div className="flex justify-end pt-4">
              <button
                type="submit"
                disabled={saving}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-4 py-2 rounded-lg transition disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Configuration'}
              </button>
            </div>
          )}
        </form>
      </div>

      {/* Test Cases Management Card */}
      <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-6 shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">Test Cases Manager</h2>
            <p className="text-xs text-slate-400">
              Total test cases: <span className="font-semibold text-white">{testCases.length}</span> | Public samples: <span className="font-semibold text-emerald-400">{testCases.filter((t) => !t.isHidden).length}</span> | Hidden evaluation: <span className="font-semibold text-amber-400">{testCases.filter((t) => t.isHidden).length}</span>
            </p>
          </div>

          {!readOnly && (
            <button
              onClick={openCreateTestCaseModal}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-4 py-2 rounded-lg transition text-sm flex items-center gap-2"
            >
              + Add Test Case
            </button>
          )}
        </div>

        {testCases.length === 0 ? (
          <div className="p-8 text-center border border-dashed border-slate-700 rounded-lg text-slate-400">
            No test cases added yet. Click &quot;+ Add Test Case&quot; to configure public or hidden test cases.
          </div>
        ) : (
          <div className="space-y-3">
            {testCases.map((tc, idx) => (
              <div
                key={tc.clientKey}
                className="bg-slate-900/90 border border-slate-700/80 rounded-lg p-4 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                      #{idx + 1}
                    </span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                      tc.isHidden
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    }`}>
                      {tc.isHidden ? 'Hidden Evaluation' : 'Public Sample'}
                    </span>
                    <span className="text-xs text-slate-400">
                      Points: <span className="text-white font-semibold">{tc.points ?? 1}</span>
                    </span>
                  </div>

                  {!readOnly && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEditTestCaseModal(idx)}
                        className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1 rounded transition"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleRemoveTestCase(idx)}
                        className="text-xs bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 px-3 py-1 rounded transition"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-xs">
                  <div>
                    <span className="text-slate-400 block mb-0.5">Input (stdin):</span>
                    <pre className="bg-slate-950 border border-slate-800 p-2 rounded text-slate-200 overflow-x-auto whitespace-pre-wrap">
                      {tc.input || '(empty)'}
                    </pre>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">Expected Output:</span>
                    <pre className="bg-slate-950 border border-slate-800 p-2 rounded text-emerald-300 overflow-x-auto whitespace-pre-wrap">
                      {tc.expectedOutput || '(empty)'}
                    </pre>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add / Edit Test Case Modal */}
      {tcModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 max-w-xl w-full space-y-4 my-8">
            <h3 className="text-xl font-bold text-white">
              {tcEditingIndex !== null ? 'Edit Test Case' : 'Add Test Case'}
            </h3>

            {tcError && (
              <div className="p-3 rounded bg-rose-500/20 border border-rose-500/30 text-rose-300 text-sm">
                {tcError}
              </div>
            )}

            <form onSubmit={handleSaveTestCaseModal} className="space-y-4">
              <div>
                <label htmlFor="modal-tc-input" className="block text-sm font-medium text-slate-300 mb-1">
                  Input (stdin)
                </label>
                <textarea
                  id="modal-tc-input"
                  rows={3}
                  value={tcInput}
                  onChange={(e) => setTcInput(e.target.value)}
                  className="w-full font-mono bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
                  placeholder="Input text passed to program stdin..."
                />
              </div>

              <div>
                <label htmlFor="modal-tc-expected" className="block text-sm font-medium text-slate-300 mb-1">
                  Expected Output *
                </label>
                <textarea
                  id="modal-tc-expected"
                  rows={3}
                  required
                  value={tcExpectedOutput}
                  onChange={(e) => setTcExpectedOutput(e.target.value)}
                  className="w-full font-mono bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
                  placeholder="Expected stdout text..."
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="modal-tc-points" className="block text-sm font-medium text-slate-300 mb-1">
                    Points
                  </label>
                  <input
                    id="modal-tc-points"
                    type="number"
                    min={0}
                    max={1000}
                    value={tcPoints}
                    onChange={(e) => setTcPoints(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="flex items-center pt-6">
                  <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-300">
                    <input
                      type="checkbox"
                      checked={tcIsHidden}
                      onChange={(e) => setTcIsHidden(e.target.checked)}
                      className="w-4 h-4 text-indigo-600 bg-slate-900 border-slate-700 rounded focus:ring-indigo-500"
                    />
                    <span>Hidden Evaluation Test Case</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-700">
                <button
                  type="button"
                  onClick={() => setTcModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm font-medium transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition"
                >
                  Save Test Case
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
