'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Code2, CornerDownRight, FilePlus2, MessageSquare, Send } from 'lucide-react';
import { toast } from 'sonner';
import { Avatar, Button } from '../../components/shared';
import { codeExecutionService, codeShareService, discussionService, notesService } from '../../services';
import { useAuthStore } from '../../store';
import { subscribeRealtimeSocket } from '../../hooks/useSocket';
import type { CodeExecutionResult, CodeShare, Comment } from '../../types';

type TargetType = 'COURSE' | 'LESSON';
type RootPostType = Exclude<NonNullable<Comment['postType']>, 'CODE_SOLUTION'>;

type Props = {
  targetType: TargetType;
  targetId: string;
  lessonId?: string;
  onApplyCode?: (share: CodeShare) => void;
};

const postLabels: Record<RootPostType, string> = {
  GENERAL: 'Thảo luận chung',
  QUESTION: 'Câu hỏi',
  CODE_HELP: 'Cần hỗ trợ code',
  CODE_REVIEW: 'Xin review code',
  EXPLANATION_REQUEST: 'Cần giải thích',
};

const getHttpStatus = (error: unknown) =>
  (error as { response?: { status?: number } })?.response?.status;

const queryKey = (targetType: TargetType, targetId: string) => ['discussion', targetType, targetId];

function CodeSharePreview({
  codeShareId,
  lessonId,
  onApplyCode,
}: {
  codeShareId: string;
  lessonId?: string;
  onApplyCode?: (share: CodeShare) => void;
}) {
  const { data: share, isLoading, isError } = useQuery({
    queryKey: ['code-share', codeShareId],
    queryFn: () => codeShareService.get(codeShareId),
  });
  const [expanded, setExpanded] = useState(false);
  const { mutate: saveNote, isPending: isSavingNote } = useMutation({
    mutationFn: (noteLessonId: string) => notesService.createFromCodeShare({ codeShareId, lessonId: noteLessonId }),
    onSuccess: () => toast.success('Đã lưu lời giải vào ghi chú của bài học.'),
    onError: () => toast.error('Không thể lưu lời giải vào ghi chú.'),
  });

  if (isLoading) return <div className="mt-3 h-24 rounded-lg skeleton" />;
  if (isError || !share) return <p className="mt-3 text-xs text-rose-600">Đoạn code này không còn khả dụng.</p>;

  const noteLessonId = lessonId ?? share.lessonId;
  const output = [share.stdout, share.stderr, share.compileOutput].filter(Boolean).join('\n');
  return (
    <div className="mt-3 overflow-hidden rounded-lg border border-black/10 bg-black text-white">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-3 py-2">
        <span className="inline-flex items-center gap-1.5 font-mono text-xs text-[#d9f99d]">
          <Code2 size={13} /> {share.language}
        </span>
        <span className="text-xs text-white/55">Đã chạy: {share.status}</span>
      </div>
      <pre className={`overflow-x-auto p-3 font-mono text-xs leading-5 text-[#e5e7eb] ${expanded ? '' : 'max-h-40'}`}>
        {share.sourceCode}
      </pre>
      {output ? <pre className="border-t border-white/10 px-3 py-2 font-mono text-[11px] leading-5 text-white/60">{output}</pre> : null}
      <div className="flex flex-wrap gap-2 border-t border-white/10 p-2">
        <button type="button" onClick={() => setExpanded((value) => !value)} className="min-h-9 rounded-md px-2 text-xs text-white/70 hover:bg-white/10">
          {expanded ? 'Thu gọn' : 'Xem toàn bộ'}
        </button>
        {onApplyCode ? <button type="button" onClick={() => onApplyCode(share)} className="min-h-9 rounded-md bg-[#d9f99d] px-3 text-xs font-semibold text-black hover:bg-[#bef264]">So sánh & áp dụng</button> : null}
        {noteLessonId ? <button type="button" onClick={() => saveNote(noteLessonId)} disabled={isSavingNote} className="inline-flex min-h-9 items-center gap-1 rounded-md px-2 text-xs text-white/75 hover:bg-white/10 disabled:opacity-50"><FilePlus2 size={13} /> {isSavingNote ? 'Đang lưu...' : 'Lưu note'}</button> : null}
      </div>
    </div>
  );
}

function ReplyComposer({ comment, lessonId, onDone }: { comment: Comment; lessonId?: string; onDone: () => void }) {
  const [content, setContent] = useState('');
  const [attachCode, setAttachCode] = useState(false);
  const [executionId, setExecutionId] = useState('');
  const { data: history } = useQuery({ queryKey: ['code-execution-history', 'discussion', lessonId], queryFn: () => codeExecutionService.history(1, 10, lessonId), enabled: attachCode });
  const executions = history?.items ?? [];
  const { mutate: submit, isPending } = useMutation({
    mutationFn: async () => {
      let codeShareId: string | undefined;
      if (attachCode) {
        if (!executionId) throw new Error('Chọn một lần chạy code trước khi gửi lời giải.');
        const targetType = comment.targetType ?? 'LESSON';
        const targetId = comment.targetId ?? comment.lessonId!;
        codeShareId = (await codeShareService.createFromExecution({ sourceExecutionId: executionId, targetType, targetId }))._id;
      }
      return discussionService.reply(comment._id, { content, codeShareId });
    },
    onSuccess: () => { setContent(''); setExecutionId(''); setAttachCode(false); onDone(); toast.success('Đã gửi phản hồi.'); },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Không thể gửi phản hồi.'),
  });
  return <div className="mt-3 rounded-lg border border-black/10 bg-black/[0.025] p-3">
    <textarea value={content} onChange={(event) => setContent(event.target.value)} maxLength={2000} rows={2} placeholder="Giải thích cách tiếp cận hoặc gửi lời giải..." className="w-full resize-y bg-transparent text-sm outline-none" />
    {attachCode ? <select value={executionId} onChange={(event) => setExecutionId(event.target.value)} className="mt-2 min-h-10 w-full rounded-md border border-black/15 bg-white px-2 text-xs">
      <option value="">Chọn lần chạy code của bạn</option>
      {executions.map((execution: CodeExecutionResult) => <option key={execution._id} value={execution._id}>{execution.language} · {execution.status.description} · {new Date(execution.createdAt).toLocaleString()}</option>)}
    </select> : null}
    <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
      <label className="inline-flex min-h-9 items-center gap-2 text-xs text-black/60"><input type="checkbox" checked={attachCode} onChange={(event) => setAttachCode(event.target.checked)} /> Đính kèm lần chạy đã xác thực</label>
      <Button size="sm" onClick={() => submit()} disabled={isPending || !content.trim() || (attachCode && !executionId)} loading={isPending}><Send size={12} /> Gửi</Button>
    </div>
  </div>;
}

function ThreadCard({ comment, lessonId, onApplyCode }: { comment: Comment; lessonId?: string; onApplyCode?: (share: CodeShare) => void }) {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [replyOpen, setReplyOpen] = useState(false);
  const { data: replies = [] } = useQuery({ queryKey: ['discussion-replies', comment._id], queryFn: () => discussionService.replies(comment._id) });
  const refresh = () => { queryClient.invalidateQueries({ queryKey: ['discussion-replies', comment._id] }); queryClient.invalidateQueries({ queryKey: ['discussion'] }); };
  const { mutate: accept, isPending: accepting } = useMutation({ mutationFn: (replyId: string) => discussionService.accept(comment._id, replyId), onSuccess: () => { refresh(); toast.success('Đã đánh dấu lời giải được chọn.'); }, onError: () => toast.error('Không thể đánh dấu lời giải.') });
  const { mutate: close, isPending: closing } = useMutation({ mutationFn: () => discussionService.close(comment._id), onSuccess: () => { refresh(); toast.success('Đã đóng câu hỏi.'); }, onError: () => toast.error('Không thể đóng câu hỏi.') });
  const isOwner = user?._id === comment.userId;
  const isQuestion = ['QUESTION', 'CODE_HELP', 'CODE_REVIEW', 'EXPLANATION_REQUEST'].includes(comment.postType ?? 'GENERAL');
  const authorName = comment.isAnonymous ? 'Học viên ẩn danh' : comment.user?.name || 'Thành viên ThreadLearn';
  return <article className="rounded-lg border border-black/10 bg-white p-4">
    <div className="flex gap-3"><Avatar src={comment.isAnonymous ? undefined : comment.user?.avatarUrl} name={authorName} size="sm" /><div className="min-w-0 flex-1">
      <div className="flex flex-wrap items-center gap-2"><strong className="text-sm text-ink">{authorName}</strong><span className="rounded-full bg-black/[0.05] px-2 py-0.5 text-[11px] text-black/55">{postLabels[(comment.postType ?? 'GENERAL') as RootPostType] ?? 'Lời giải code'}</span>{comment.questionStatus ? <span className={`rounded-full px-2 py-0.5 text-[11px] ${comment.questionStatus === 'SOLVED' ? 'bg-[#d9f99d] text-black' : 'bg-black/[0.05] text-black/55'}`}>{comment.questionStatus}</span> : null}</div>
      <p className="mt-1 text-xs text-black/40">{new Date(comment.createdAt).toLocaleString()}</p>
      <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-ink-muted">{comment.content}</p>
      {comment.codeShareId ? <CodeSharePreview codeShareId={comment.codeShareId} lessonId={lessonId} onApplyCode={onApplyCode} /> : null}
      <div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={() => setReplyOpen((value) => !value)} className="inline-flex min-h-9 items-center gap-1 rounded-md px-2 text-xs text-black/60 hover:bg-black/[0.05]"><CornerDownRight size={13} /> Phản hồi ({replies.length})</button>{isOwner && isQuestion && comment.questionStatus === 'OPEN' ? <button type="button" onClick={() => close()} disabled={closing} className="min-h-9 rounded-md px-2 text-xs text-black/60 hover:bg-black/[0.05]">Đóng câu hỏi</button> : null}</div>
      {replyOpen ? <ReplyComposer comment={comment} lessonId={lessonId} onDone={refresh} /> : null}
      {replies.length ? <div className="mt-3 space-y-3 border-l-2 border-black/10 pl-3">{replies.map((reply) => <div key={reply._id} className="rounded-md bg-black/[0.025] p-3"><div className="flex flex-wrap items-center gap-2 text-xs"><strong>{reply.isAnonymous ? 'Học viên ẩn danh' : reply.user?.name || 'Thành viên'}</strong>{comment.acceptedReplyId === reply._id ? <span className="inline-flex items-center gap-1 rounded-full bg-[#d9f99d] px-2 py-0.5 font-medium text-black"><CheckCircle2 size={11} /> Lời giải được chọn</span> : null}</div><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-ink-muted">{reply.content}</p>{reply.codeShareId ? <CodeSharePreview codeShareId={reply.codeShareId} lessonId={lessonId} onApplyCode={onApplyCode} /> : null}{isOwner && isQuestion && comment.questionStatus === 'OPEN' && reply.postType === 'CODE_SOLUTION' ? <button type="button" onClick={() => accept(reply._id)} disabled={accepting} className="mt-2 min-h-9 rounded-md border border-black/15 px-3 text-xs font-medium hover:bg-[#d9f99d]">Chọn lời giải này</button> : null}</div>)}</div> : null}
    </div></div>
  </article>;
}

export const ContextualDiscussionRoom: React.FC<Props> = ({ targetType, targetId, lessonId, onApplyCode }) => {
  const queryClient = useQueryClient();
  const [content, setContent] = useState('');
  const [postType, setPostType] = useState<RootPostType>('GENERAL');
  const [anonymous, setAnonymous] = useState(false);
  const [attachCode, setAttachCode] = useState(false);
  const [executionId, setExecutionId] = useState('');
  const [filterType, setFilterType] = useState<RootPostType | ''>('');
  const [filterStatus, setFilterStatus] = useState<NonNullable<Comment['questionStatus']> | ''>('');
  const activeSocketRef = useRef<import('socket.io-client').Socket | null>(null);
  const socketHandlerRef = useRef<((event: { targetType: TargetType; targetId: string }) => void) | null>(null);
  const { data, isLoading, isError } = useQuery({ queryKey: [...queryKey(targetType, targetId), filterType, filterStatus], queryFn: () => discussionService.list(targetType, targetId, 1, 20, { ...(filterType ? { postType: filterType } : {}), ...(filterStatus ? { questionStatus: filterStatus } : {}) }), enabled: Boolean(targetId) });
  const { data: history } = useQuery({ queryKey: ['code-execution-history', 'discussion-root', lessonId], queryFn: () => codeExecutionService.history(1, 10, lessonId), enabled: attachCode });
  const executions = history?.items ?? [];
  const threads = useMemo(() => data?.items ?? [], [data]);
  useEffect(() => {
    const invalidate = () => {
      queryClient.invalidateQueries({ queryKey: queryKey(targetType, targetId) });
      queryClient.invalidateQueries({ queryKey: ['discussion-replies'] });
    };
    const unsubscribe = subscribeRealtimeSocket((socket) => {
      if (activeSocketRef.current && socketHandlerRef.current) activeSocketRef.current.off('discussion:update', socketHandlerRef.current);
      activeSocketRef.current = socket;
      if (!socket) return;
      const handler = (event: { targetType: TargetType; targetId: string }) => {
        if (event.targetType === targetType && event.targetId === targetId) invalidate();
      };
      socketHandlerRef.current = handler;
      socket.on('discussion:update', handler);
      const joinRoom = () => socket.emit('discussion:join', { targetType, targetId });
      socket.on('connect', joinRoom);
      joinRoom();
      (socketHandlerRef.current as typeof handler & { joinRoom?: () => void }).joinRoom = joinRoom;
    });
    return () => {
      if (activeSocketRef.current) {
        activeSocketRef.current.emit('discussion:leave', { targetType, targetId });
        if (socketHandlerRef.current) {
          activeSocketRef.current.off('discussion:update', socketHandlerRef.current);
          activeSocketRef.current.off('connect', (socketHandlerRef.current as { joinRoom?: () => void }).joinRoom);
        }
      }
      unsubscribe();
    };
  }, [queryClient, targetId, targetType]);
  const { mutate: create, isPending } = useMutation({
    mutationFn: async () => {
      const codeShareId = attachCode && executionId
        ? (await codeShareService.createFromExecution({ sourceExecutionId: executionId, targetType, targetId }))._id
        : undefined;
      return discussionService.create({ targetType, targetId, content, postType, isAnonymous: anonymous, codeShareId });
    },
    onSuccess: () => { setContent(''); setAnonymous(false); setAttachCode(false); setExecutionId(''); queryClient.invalidateQueries({ queryKey: queryKey(targetType, targetId) }); toast.success('Đã đăng vào phòng thảo luận.'); },
    onError: (error) => toast.error(getHttpStatus(error) === 403 ? 'Bạn cần quyền truy cập khóa học để thảo luận.' : error instanceof Error ? error.message : 'Không thể tạo thảo luận.'),
  });
  return <section className="space-y-4" aria-label="Phòng thảo luận theo ngữ cảnh">
    <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><MessageSquare size={17} /><h2 className="font-semibold text-ink">Phòng thảo luận</h2></div><span className="text-xs text-black/45">{threads.length} chủ đề</span></div>
    <div className="flex flex-wrap gap-2"><select aria-label="Lọc loại thảo luận" value={filterType} onChange={(event) => setFilterType(event.target.value as RootPostType | '')} className="min-h-9 rounded-md border border-black/10 bg-white px-2 text-xs"><option value="">Tất cả loại</option>{Object.entries(postLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><select aria-label="Lọc trạng thái câu hỏi" value={filterStatus} onChange={(event) => setFilterStatus(event.target.value as NonNullable<Comment['questionStatus']> | '')} className="min-h-9 rounded-md border border-black/10 bg-white px-2 text-xs"><option value="">Mọi trạng thái</option><option value="OPEN">Đang mở</option><option value="SOLVED">Đã giải</option><option value="CLOSED">Đã đóng</option></select></div>
    <p className="text-sm leading-6 text-ink-faint">Hỏi đúng bài học, phản hồi bằng lần chạy code đã xác thực và chỉ áp dụng khi bạn đã xem so sánh.</p>
    <div className="rounded-lg border border-black/10 bg-black/[0.025] p-3"><div className="mb-2 flex flex-wrap gap-2"><select value={postType} onChange={(event) => setPostType(event.target.value as RootPostType)} className="min-h-10 rounded-md border border-black/15 bg-white px-2 text-xs">{Object.entries(postLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><label className="inline-flex min-h-10 items-center gap-2 text-xs text-black/60"><input type="checkbox" checked={anonymous} disabled={attachCode} onChange={(event) => setAnonymous(event.target.checked)} /> Ẩn danh</label></div><textarea value={content} onChange={(event) => setContent(event.target.value)} maxLength={2000} rows={3} placeholder="Nêu rõ điều bạn đang vướng, đoạn kiến thức hoặc kết quả mong đợi..." className="w-full resize-y rounded-md border border-black/10 bg-white p-3 text-sm outline-none focus:border-black/35" /><><label className="mt-2 inline-flex min-h-9 items-center gap-2 text-xs text-black/60"><input type="checkbox" checked={attachCode} onChange={(event) => { setAttachCode(event.target.checked); if (event.target.checked) setAnonymous(false); }} /> Đính kèm lần chạy code đã xác thực</label>{attachCode ? <select value={executionId} onChange={(event) => setExecutionId(event.target.value)} className="mt-2 min-h-10 w-full rounded-md border border-black/15 bg-white px-2 text-xs"><option value="">Chọn lần chạy code của bạn</option>{executions.map((execution: CodeExecutionResult) => <option key={execution._id} value={execution._id}>{execution.language} · {execution.status.description} · {new Date(execution.createdAt).toLocaleString()}</option>)}</select> : null}</><div className="mt-2 flex justify-end"><Button size="sm" onClick={() => create()} disabled={isPending || !content.trim() || (attachCode && !executionId)} loading={isPending}><Send size={12} /> Đăng thảo luận</Button></div></div>
    {isLoading ? <div className="space-y-3"><div className="h-32 rounded-lg skeleton" /><div className="h-32 rounded-lg skeleton" /></div> : isError ? <p className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">Không thể tải phòng thảo luận. Hãy kiểm tra quyền truy cập bài học.</p> : threads.length ? <div className="space-y-3">{threads.map((comment) => <ThreadCard key={comment._id} comment={comment} lessonId={lessonId} onApplyCode={onApplyCode} />)}</div> : <p className="rounded-lg border border-dashed border-black/15 p-5 text-center text-sm text-black/50">Chưa có chủ đề. Hãy mở đầu bằng một câu hỏi cụ thể.</p>}
  </section>;
};
