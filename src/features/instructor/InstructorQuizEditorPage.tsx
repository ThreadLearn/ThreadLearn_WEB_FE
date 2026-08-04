'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  instructorQuizzesService,
  coursesService,
  lessonsService,
  type InstructorQuizManagement,
  type InstructorQuizBankQuestion,
  type InstructorQuestionOption,
  type InstructorQuizBankSummary,
} from '../../services';

interface InstructorQuizEditorPageProps {
  quizId: string;
}

export function InstructorQuizEditorPage({ quizId }: InstructorQuizEditorPageProps) {
  const router = useRouter();

  // State
  const [loading, setLoading] = useState(true);
  const [quiz, setQuiz] = useState<InstructorQuizManagement | null>(null);
  const [bankSummary, setBankSummary] = useState<InstructorQuizBankSummary | null>(null);
  const [questions, setQuestions] = useState<InstructorQuizBankQuestion[]>([]);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'disabled'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [readOnly, setReadOnly] = useState(false);
  const [readOnlyReason, setReadOnlyReason] = useState<string | null>(null);

  // Form states for Quiz Metadata
  const [quizTitle, setQuizTitle] = useState('');
  const [quizDescription, setQuizDescription] = useState('');
  const [passingScorePercent, setPassingScorePercent] = useState(80);
  const [timeLimitSeconds, setTimeLimitSeconds] = useState(1800);
  const [randomQuestionCount, setRandomQuestionCount] = useState(5);
  const [savingQuiz, setSavingQuiz] = useState(false);

  // Question Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<InstructorQuizBankQuestion | null>(null);
  const [qText, setQText] = useState('');
  const [qExplanation, setQExplanation] = useState('');
  const [qDifficulty, setQDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [qTags, setQTags] = useState('');
  const [qOptions, setQOptions] = useState<InstructorQuestionOption[]>([
    { optionId: 'o1', text: '' },
    { optionId: 'o2', text: '' },
  ]);
  const [qCorrectOptionId, setQCorrectOptionId] = useState('o1');
  const [savingQuestion, setSavingQuestion] = useState(false);
  const [questionFormError, setQuestionFormError] = useState<string | null>(null);

  // Load Quiz Data
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const quizData = await instructorQuizzesService.getQuizById(quizId);
      setQuiz(quizData);
      setQuizTitle(quizData.title);
      setQuizDescription(quizData.description || '');
      setPassingScorePercent(quizData.passingScorePercent);
      setTimeLimitSeconds(quizData.timeLimitSeconds);
      setRandomQuestionCount(quizData.randomQuestionCount);

      // Check course status and lesson status for read-only condition
      if (quizData.lessonId) {
        try {
          const lesson = await lessonsService.getById(quizData.lessonId);
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
          // If lesson or course fetch fails with 403/404, default to read-only
          setReadOnly(true);
          setReadOnlyReason('Course access permission required.');
        }
      }

      // Fetch summary & questions
      try {
        const summary = await instructorQuizzesService.getBankSummary(quizId);
        setBankSummary(summary);
      } catch {
        setBankSummary(null);
      }

      const qList = await instructorQuizzesService.listQuestions(quizId, {
        page,
        limit: 20,
        status: statusFilter === 'all' ? undefined : statusFilter,
        search: searchQuery.trim() || undefined,
      });
      setQuestions(qList.items);
      setTotalQuestions(qList.meta.total);
    } catch (err: any) {
      const status = err?.response?.status || err?.status;
      if (status === 403) {
        setReadOnly(true);
        setReadOnlyReason('Access denied or course ownership changed.');
        toast.error('Forbidden: You do not have permission to manage this quiz.');
      } else if (status === 404) {
        toast.error('Quiz not found or deleted.');
        router.push('/instructor/courses');
      } else {
        toast.error(err?.message || 'Failed to load quiz data.');
      }
    } finally {
      setLoading(false);
    }
  }, [quizId, page, statusFilter, searchQuery, router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle Save Quiz Metadata
  const handleSaveQuizMetadata = async (e: React.FormEvent) => {
    e.preventDefault();
    if (readOnly) {
      toast.error('Quiz is in read-only mode.');
      return;
    }
    try {
      setSavingQuiz(true);
      const updated = await instructorQuizzesService.updateQuiz(quizId, {
        title: quizTitle.trim(),
        description: quizDescription.trim(),
        passingScorePercent: Number(passingScorePercent),
        timeLimitSeconds: Number(timeLimitSeconds),
      });
      setQuiz(updated);
      toast.success('Quiz metadata updated successfully.');
    } catch (err: any) {
      const status = err?.response?.status || err?.status;
      if (status === 403) {
        setReadOnly(true);
        setReadOnlyReason('Permission revoked or course status changed.');
        toast.error('Permission denied. Switched editor to read-only mode.');
      } else {
        toast.error(err?.message || err?.response?.data?.message || 'Failed to update quiz metadata.');
      }
    } finally {
      setSavingQuiz(false);
    }
  };

  // Handle Open Create / Edit Question Modal
  const openCreateQuestionModal = () => {
    if (readOnly) return;
    setEditingQuestion(null);
    setQText('');
    setQExplanation('');
    setQDifficulty('medium');
    setQTags('');
    setQOptions([
      { optionId: 'o1', text: '' },
      { optionId: 'o2', text: '' },
      { optionId: 'o3', text: '' },
      { optionId: 'o4', text: '' },
    ]);
    setQCorrectOptionId('o1');
    setQuestionFormError(null);
    setModalOpen(true);
  };

  const openEditQuestionModal = (q: InstructorQuizBankQuestion) => {
    if (readOnly) return;
    setEditingQuestion(q);
    setQText(q.questionText);
    setQExplanation(q.explanation || '');
    setQDifficulty(q.difficulty || 'medium');
    setQTags((q.tags || []).join(', '));
    setQOptions(q.options && q.options.length > 0 ? q.options.map(opt => ({ ...opt })) : [
      { optionId: 'o1', text: '' },
      { optionId: 'o2', text: '' },
    ]);
    setQCorrectOptionId(q.correctOptionId || q.options?.[0]?.optionId || 'o1');
    setQuestionFormError(null);
    setModalOpen(true);
  };

  // Option helper functions (preserving stable optionId)
  const handleOptionChange = (idx: number, text: string) => {
    const updated = [...qOptions];
    updated[idx] = { ...updated[idx], text };
    setQOptions(updated);
  };

  const handleAddOption = () => {
    if (qOptions.length >= 6) {
      toast.error('A question can have at most 6 options.');
      return;
    }
    const nextId = `o${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    setQOptions([...qOptions, { optionId: nextId, text: '' }]);
  };

  const handleRemoveOption = (idx: number) => {
    if (qOptions.length <= 2) {
      toast.error('A question must contain at least 2 options.');
      return;
    }
    const removedId = qOptions[idx].optionId;
    const updated = qOptions.filter((_, i) => i !== idx);
    setQOptions(updated);

    // Rule: When removing the option that is currently set as correctOptionId,
    // force correctOptionId to reset to the first available option.
    if (removedId === qCorrectOptionId) {
      setQCorrectOptionId(updated[0].optionId);
      toast.info('Selected correct option was removed. Reset to first option.');
    }
  };

  // Save Question Form Submission
  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (readOnly) return;
    setQuestionFormError(null);

    // Validation
    const trimmedText = qText.trim();
    if (!trimmedText) {
      setQuestionFormError('Question text is required.');
      return;
    }

    if (qOptions.length < 2 || qOptions.length > 6) {
      setQuestionFormError('Question must contain between 2 and 6 options.');
      return;
    }

    for (let i = 0; i < qOptions.length; i++) {
      if (!qOptions[i].text.trim()) {
        setQuestionFormError(`Option ${i + 1} text cannot be empty.`);
        return;
      }
    }

    // Check duplicate option texts
    const normTexts = qOptions.map(o => o.text.trim().toLowerCase());
    if (new Set(normTexts).size !== normTexts.length) {
      setQuestionFormError('Option texts cannot be duplicated.');
      return;
    }

    // Correct option MUST belong to current options list
    const validCorrectOption = qOptions.some(o => o.optionId === qCorrectOptionId);
    if (!validCorrectOption) {
      setQuestionFormError('Please select a valid correct option from the options list.');
      return;
    }

    const payload = {
      questionText: trimmedText,
      options: qOptions.map(o => ({ optionId: o.optionId, text: o.text.trim() })),
      correctOptionId: qCorrectOptionId,
      explanation: qExplanation.trim() || undefined,
      difficulty: qDifficulty,
      tags: qTags.split(',').map(t => t.trim()).filter(Boolean),
    };

    try {
      setSavingQuestion(true);
      if (editingQuestion) {
        await instructorQuizzesService.updateQuestion(quizId, editingQuestion.id, payload);
        toast.success('Question updated successfully.');
      } else {
        await instructorQuizzesService.createQuestion(quizId, payload);
        toast.success('Question created successfully.');
      }
      setModalOpen(false);
      loadData();
    } catch (err: any) {
      const status = err?.response?.status || err?.status;
      if (status === 403) {
        setReadOnly(true);
        setReadOnlyReason('Permission revoked while saving question.');
        toast.error('Permission denied. Editor is now in read-only mode.');
        setModalOpen(false);
      } else {
        const msg = err?.response?.data?.message || err?.message || 'Failed to save question.';
        setQuestionFormError(Array.isArray(msg) ? msg.join(', ') : String(msg));
      }
    } finally {
      setSavingQuestion(false);
    }
  };

  // Toggle Question Active / Disabled Status
  const handleToggleQuestionStatus = async (q: InstructorQuizBankQuestion) => {
    if (readOnly) return;
    const newStatus = q.status === 'active' ? 'disabled' : 'active';
    try {
      await instructorQuizzesService.setQuestionStatus(quizId, q.id, newStatus);
      toast.success(`Question status updated to ${newStatus}.`);
      loadData();
    } catch (err: any) {
      const status = err?.response?.status || err?.status;
      if (status === 403) {
        setReadOnly(true);
        setReadOnlyReason('Permission revoked while updating question status.');
        toast.error('Permission denied. Switched to read-only mode.');
      } else if (status === 409 || status === 400) {
        const errMsg = err?.response?.data?.message || err?.message || '';
        toast.error(`Cannot ${newStatus} question: ${errMsg || 'the quiz would not have enough active questions.'}`);
      } else {
        toast.error(err?.message || 'Failed to update question status.');
      }
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-400">
        <p className="text-lg font-medium">Loading Quiz Editor...</p>
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
            <span>Quiz Editor</span>
          </div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            {quizTitle || 'Quiz Editor'}
            {readOnly && (
              <span className="text-xs font-semibold px-2.5 py-1 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Read-Only ({readOnlyReason || 'Course/Lesson locked'})
              </span>
            )}
          </h1>
        </div>
      </div>

      {/* Quiz Metadata Settings Card */}
      <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-white mb-4">Quiz Settings</h2>
        <form onSubmit={handleSaveQuizMetadata} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="quiz-title-input" className="block text-sm font-medium text-slate-300 mb-1">
                Quiz Title
              </label>
              <input
                id="quiz-title-input"
                type="text"
                value={quizTitle}
                onChange={e => setQuizTitle(e.target.value)}
                disabled={readOnly}
                required
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500 disabled:opacity-60"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Random Questions per Attempt
              </label>
              <div className="w-full bg-slate-900/60 border border-slate-700/60 rounded-lg px-3 py-2 text-slate-300 text-sm">
                <span className="font-semibold text-white">{randomQuestionCount}</span> questions
                <p className="text-[11px] text-slate-400 mt-0.5">
                  This value is currently managed by the Quiz Question Bank or import workflow.
                </p>
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="quiz-description-input" className="block text-sm font-medium text-slate-300 mb-1">
              Description
            </label>
            <textarea
              id="quiz-description-input"
              rows={2}
              value={quizDescription}
              onChange={e => setQuizDescription(e.target.value)}
              disabled={readOnly}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500 disabled:opacity-60"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="passing-score-percent-input" className="block text-sm font-medium text-slate-300 mb-1">
                Passing Score (%)
              </label>
              <input
                id="passing-score-percent-input"
                type="number"
                min={0}
                max={100}
                value={passingScorePercent}
                onChange={e => setPassingScorePercent(Number(e.target.value))}
                disabled={readOnly}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500 disabled:opacity-60"
              />
            </div>

            <div>
              <label htmlFor="time-limit-seconds-input" className="block text-sm font-medium text-slate-300 mb-1">
                Time Limit (Seconds)
              </label>
              <input
                id="time-limit-seconds-input"
                type="number"
                min={60}
                max={7200}
                value={timeLimitSeconds}
                onChange={e => setTimeLimitSeconds(Number(e.target.value))}
                disabled={readOnly}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500 disabled:opacity-60"
              />
            </div>
          </div>

          {!readOnly && (
            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={savingQuiz}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-4 py-2 rounded-lg transition disabled:opacity-50"
              >
                {savingQuiz ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          )}
        </form>
      </div>

      {/* Quiz Question Bank Panel */}
      <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-6 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-white">Quiz Question Bank</h2>
            <p className="text-xs text-slate-400">
              Questions for this Quiz. Bank status: <span className="font-semibold text-slate-200">{bankSummary?.status || 'draft'}</span> | Active questions: <span className="font-semibold text-emerald-400">{bankSummary?.activeQuestionCount ?? 0}</span> / Required: <span className="font-semibold text-slate-200">{randomQuestionCount}</span>
            </p>
          </div>

          {!readOnly && (
            <button
              onClick={openCreateQuestionModal}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-4 py-2 rounded-lg transition text-sm flex items-center gap-2 self-start md:self-auto"
            >
              + Add Question
            </button>
          )}
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            placeholder="Search questions..."
            value={searchQuery}
            onChange={e => { setSearchQuery(e.target.value); setPage(1); }}
            className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
          />

          <select
            aria-label="Filter status"
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value as any); setPage(1); }}
            className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="disabled">Disabled Only</option>
          </select>
        </div>

        {/* Questions List */}
        {questions.length === 0 ? (
          <div className="p-8 text-center border border-dashed border-slate-700 rounded-lg text-slate-400">
            No questions found in this bank. Click &quot;+ Add Question&quot; to populate the question bank.
          </div>
        ) : (
          <div className="space-y-4">
            {questions.map((q, idx) => (
              <div
                key={q.id}
                className="bg-slate-900/90 border border-slate-700/80 rounded-lg p-4 space-y-3"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                        #{ (page - 1) * 20 + idx + 1 }
                      </span>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                        q.status === 'active'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      }`}>
                        {q.status}
                      </span>
                      <span className="text-xs font-medium px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300">
                        {q.difficulty}
                      </span>
                    </div>

                    {/* Plain text question rendering — NO dangerouslySetInnerHTML */}
                    <h3 className="text-white font-medium text-base pt-1">
                      {q.questionText}
                    </h3>
                  </div>

                  {!readOnly && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEditQuestionModal(q)}
                        className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded transition"
                      >
                        Edit
                      </button>

                      <button
                        onClick={() => handleToggleQuestionStatus(q)}
                        className={`text-xs px-3 py-1.5 rounded transition ${
                          q.status === 'active'
                            ? 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30'
                            : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30'
                        }`}
                      >
                        {q.status === 'active' ? 'Disable' : 'Activate'}
                      </button>
                    </div>
                  )}
                </div>

                {/* Options list */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-800">
                  {q.options.map(opt => {
                    const isCorrect = opt.optionId === q.correctOptionId;
                    return (
                      <div
                        key={opt.optionId}
                        className={`text-xs px-3 py-2 rounded-md flex items-center justify-between border ${
                          isCorrect
                            ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-200'
                            : 'bg-slate-800/60 border-slate-700/60 text-slate-300'
                        }`}
                      >
                        <span>{opt.text}</span>
                        {isCorrect && (
                          <span className="font-semibold text-emerald-400 ml-2">✓ Correct</span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {q.explanation && (
                  <p className="text-xs text-slate-400 italic pt-1">
                    Explanation: {q.explanation}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalQuestions > 20 && (
          <div className="flex items-center justify-between pt-4 text-xs text-slate-400">
            <span>Showing {(page - 1) * 20 + 1}–{Math.min(page * 20, totalQuestions)} of {totalQuestions}</span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className="px-3 py-1 bg-slate-900 border border-slate-700 rounded disabled:opacity-40"
              >
                Previous
              </button>
              <button
                disabled={page * 20 >= totalQuestions}
                onClick={() => setPage(p => p + 1)}
                className="px-3 py-1 bg-slate-900 border border-slate-700 rounded disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add / Edit Question Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 max-w-2xl w-full space-y-5 my-8">
            <h3 className="text-xl font-bold text-white">
              {editingQuestion ? 'Edit Question' : 'Add Question'}
            </h3>

            {questionFormError && (
              <div className="p-3 rounded bg-rose-500/20 border border-rose-500/30 text-rose-300 text-sm">
                {questionFormError}
              </div>
            )}

            <form onSubmit={handleSaveQuestion} className="space-y-4">
              <div>
                <label htmlFor="modal-question-text" className="block text-sm font-medium text-slate-300 mb-1">
                  Question Text *
                </label>
                <textarea
                  id="modal-question-text"
                  rows={3}
                  required
                  value={qText}
                  onChange={e => setQText(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Options Form */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium text-slate-300">
                    Options (2–6) *
                  </label>
                  {qOptions.length < 6 && (
                    <button
                      type="button"
                      onClick={handleAddOption}
                      className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
                    >
                      + Add Option
                    </button>
                  )}
                </div>

                {qOptions.map((opt, idx) => (
                  <div key={opt.optionId} className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="correctOptionRadio"
                      checked={qCorrectOptionId === opt.optionId}
                      onChange={() => setQCorrectOptionId(opt.optionId)}
                      className="w-4 h-4 text-indigo-600 bg-slate-900 border-slate-700 focus:ring-indigo-500"
                    />
                    <input
                      type="text"
                      placeholder={`Option ${idx + 1} text`}
                      value={opt.text}
                      onChange={e => handleOptionChange(idx, e.target.value)}
                      required
                      className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
                    />
                    {qOptions.length > 2 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveOption(idx)}
                        className="text-rose-400 hover:text-rose-300 text-xs px-2 py-1"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="modal-question-difficulty" className="block text-sm font-medium text-slate-300 mb-1">
                    Difficulty
                  </label>
                  <select
                    id="modal-question-difficulty"
                    value={qDifficulty}
                    onChange={e => setQDifficulty(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="modal-question-tags" className="block text-sm font-medium text-slate-300 mb-1">
                    Tags (Comma-separated)
                  </label>
                  <input
                    id="modal-question-tags"
                    type="text"
                    placeholder="e.g. javascript, functions"
                    value={qTags}
                    onChange={e => setQTags(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="modal-question-explanation" className="block text-sm font-medium text-slate-300 mb-1">
                  Explanation (Optional)
                </label>
                <textarea
                  id="modal-question-explanation"
                  rows={2}
                  value={qExplanation}
                  onChange={e => setQExplanation(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-700">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm font-medium transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingQuestion}
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition disabled:opacity-50"
                >
                  {savingQuestion ? 'Saving...' : 'Save Question'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
