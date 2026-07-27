'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  CheckCircle2,
  Edit2,
  LockKeyhole,
  Plus,
  RefreshCw,
  Search,
  UnlockKeyhole,
  Users,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button, EmptyState, Input, Skeleton } from '../../components/shared';
import { Modal } from '../../components/shared/Modal';
import { extractApiError } from '../../services/apiClient';
import { adminService } from '../../services';
import { useUIStore } from '../../store';
import type {
  AdminStudentCreatePayload,
  AdminStudentFilters,
  AdminStudentUpdatePayload,
  User,
} from '../../types';
import {
  DemoDisplayTitle,
  DemoHeroWhite,
  DemoMuted,
  DemoPageRoot,
  DemoPill,
  DemoWhitePanel,
} from '../ui-reskin/demo-ui';

const STUDENT_FORM_MODAL = 'admin-student-form';
const LOCK_STUDENT_MODAL = 'admin-lock-student';
const UNLOCK_STUDENT_MODAL = 'admin-unlock-student';

type StudentFormMode = 'create' | 'edit';

interface StudentFormErrors {
  firstName?: string;
  lastName?: string;
  email?: string;
  password?: string;
  avatarUrl?: string;
}

const getStudentId = (student: User) => student.id ?? student._id;

const getStudentName = (student: User) => {
  const fullName = [student.firstName, student.lastName].filter(Boolean).join(' ');
  return student.name || fullName || student.email;
};

const getIsActive = (student: User) => student.isActive ?? !student.isLocked;
const getIsVerified = (student: User) => student.isEmailVerified ?? student.isVerified ?? false;

const formatDate = (value?: string) => {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleDateString();
};

const toOptionalBoolean = (value: string): boolean | undefined => {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return undefined;
};

const StatusPill: React.FC<{
  active: boolean;
  children: React.ReactNode;
}> = ({ active, children }) => (
  <span
    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
      active ? 'bg-[#d9f99d] text-black' : 'bg-black/5 text-black/55'
    }`}
  >
    {active ? <CheckCircle2 size={11} /> : <XCircle size={11} />}
    {children}
  </span>
);

interface StudentFormProps {
  mode: StudentFormMode;
  student?: User | null;
  onSaved: () => void;
}

const StudentForm: React.FC<StudentFormProps> = ({ mode, student, onSaved }) => {
  const queryClient = useQueryClient();
  const isEditing = mode === 'edit' && Boolean(student);
  const [firstName, setFirstName] = useState(student?.firstName ?? '');
  const [lastName, setLastName] = useState(student?.lastName ?? '');
  const [email, setEmail] = useState(student?.email ?? '');
  const [password, setPassword] = useState('');
  const [avatarUrl, setAvatarUrl] = useState(student?.avatarUrl ?? '');
  const [isVerified, setIsVerified] = useState(getIsVerified(student ?? ({} as User)));
  const [errors, setErrors] = useState<StudentFormErrors>({});

  const invalidateStudents = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-students'] });
    queryClient.invalidateQueries({ queryKey: ['admin-users'] });
  };

  const createMutation = useMutation({
    mutationFn: (payload: AdminStudentCreatePayload) => adminService.createStudent(payload),
    onSuccess: () => {
      invalidateStudents();
      toast.success('Student created');
      onSaved();
    },
    onError: (error) => toast.error(extractApiError(error)),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: AdminStudentUpdatePayload }) =>
      adminService.updateUser(id, payload),
    onSuccess: () => {
      invalidateStudents();
      toast.success('Student updated');
      onSaved();
    },
    onError: (error) => toast.error(extractApiError(error)),
  });

  const validate = () => {
    const nextErrors: StudentFormErrors = {};
    if (!firstName.trim()) nextErrors.firstName = 'First name is required';
    if (!lastName.trim()) nextErrors.lastName = 'Last name is required';
    if (!isEditing && !email.trim()) nextErrors.email = 'Email is required';
    if (!isEditing && email.trim() && !/^\S+@\S+\.\S+$/.test(email.trim())) {
      nextErrors.email = 'Enter a valid email';
    }
    if (password && password.length < 6) {
      nextErrors.password = 'Password must be at least 6 characters';
    }
    if (avatarUrl.trim()) {
      try {
        new URL(avatarUrl.trim());
      } catch {
        nextErrors.avatarUrl = 'Avatar URL must be valid';
      }
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!validate()) return;

    if (isEditing && student) {
      const payload: AdminStudentUpdatePayload = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        avatarUrl: avatarUrl.trim() || undefined,
        isVerified,
      };
      updateMutation.mutate({ id: getStudentId(student), payload });
      return;
    }

    const payload: AdminStudentCreatePayload = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim(),
      password: password || undefined,
    };
    createMutation.mutate(payload);
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="grid gap-4 md:grid-cols-2">
        <Input
          label="First name"
          value={firstName}
          onChange={(event) => setFirstName(event.target.value)}
          error={errors.firstName}
          placeholder="First name"
        />
        <Input
          label="Last name"
          value={lastName}
          onChange={(event) => setLastName(event.target.value)}
          error={errors.lastName}
          placeholder="Last name"
        />
      </div>

      {!isEditing ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            error={errors.email}
            placeholder="student@example.com"
          />
          <Input
            label="Password (optional)"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            error={errors.password}
            placeholder="Optional"
          />
        </div>
      ) : (
        <>
          <Input
            label="Avatar URL"
            value={avatarUrl}
            onChange={(event) => setAvatarUrl(event.target.value)}
            error={errors.avatarUrl}
            placeholder="https://..."
          />
          <label className="flex items-center gap-2 text-sm text-ink-muted">
            <input
              type="checkbox"
              checked={isVerified}
              onChange={(event) => setIsVerified(event.target.checked)}
              className="size-4 rounded border-black/20 accent-black"
            />
            Email verified
          </label>
        </>
      )}

      <div className="flex justify-end border-t border-black/10 pt-4">
        <Button type="submit" loading={isSubmitting}>
          {isEditing ? 'Save changes' : 'Create student'}
        </Button>
      </div>
    </form>
  );
};

interface LockStudentFormProps {
  student: User | null;
  onLocked: () => void;
}

const LockStudentForm: React.FC<LockStudentFormProps> = ({ student, onLocked }) => {
  const queryClient = useQueryClient();
  const [lockedReason, setLockedReason] = useState('');

  const lockMutation = useMutation({
    mutationFn: () => {
      if (!student) throw new Error('No student selected');
      return adminService.lockStudent(getStudentId(student), lockedReason);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-students'] });
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('Student locked');
      onLocked();
      setLockedReason('');
    },
    onError: (error) => toast.error(extractApiError(error)),
  });

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-black/60">
        Lock {student ? getStudentName(student) : 'this student'} and prevent account access.
      </p>
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-ink-muted">Locked reason (optional)</label>
        <textarea
          value={lockedReason}
          onChange={(event) => setLockedReason(event.target.value)}
          className="input-field min-h-24 resize-y"
          placeholder="Reason shown to administrators"
        />
      </div>
      <div className="flex justify-end gap-3 border-t border-black/10 pt-4">
        <Button
          type="button"
          variant="danger"
          loading={lockMutation.isPending}
          onClick={() => lockMutation.mutate()}
          disabled={!student}
        >
          <LockKeyhole size={14} />
          Lock student
        </Button>
      </div>
    </div>
  );
};

interface UnlockStudentConfirmProps {
  student: User | null;
  onUnlocked: () => void;
}

const UnlockStudentConfirm: React.FC<UnlockStudentConfirmProps> = ({ student, onUnlocked }) => {
  const queryClient = useQueryClient();

  const unlockMutation = useMutation({
    mutationFn: () => {
      if (!student) throw new Error('No student selected');
      return adminService.unlockStudent(getStudentId(student));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-students'] });
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('Student unlocked');
      onUnlocked();
    },
    onError: (error) => toast.error(extractApiError(error)),
  });

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-black/60">
        Unlock {student ? getStudentName(student) : 'this student'} and restore account access.
      </p>
      <div className="flex justify-end gap-3 border-t border-black/10 pt-4">
        <Button
          type="button"
          loading={unlockMutation.isPending}
          onClick={() => unlockMutation.mutate()}
          disabled={!student}
        >
          <UnlockKeyhole size={14} />
          Unlock student
        </Button>
      </div>
    </div>
  );
};

export const AdminStudentManagementPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { openModal, closeModal } = useUIStore();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('');
  const [verifiedFilter, setVerifiedFilter] = useState('');
  const [formMode, setFormMode] = useState<StudentFormMode>('create');
  const [selectedStudent, setSelectedStudent] = useState<User | null>(null);

  const filters = useMemo<AdminStudentFilters>(
    () => ({
      page,
      limit,
      search: search || undefined,
      isActive: toOptionalBoolean(activeFilter),
      isVerified: toOptionalBoolean(verifiedFilter),
    }),
    [activeFilter, limit, page, search, verifiedFilter]
  );

  const {
    data,
    isLoading,
    isFetching,
    isError,
  } = useQuery({
    queryKey: ['admin-students', filters],
    queryFn: () => adminService.listUsers(filters),
  });

  useEffect(() => {
    if (isError) toast.error('Failed to load students');
  }, [isError]);

  const students = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(data?.totalPages ?? 1, 1);

  const applyFilters = (event?: React.FormEvent) => {
    event?.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  const resetFilters = () => {
    setSearchInput('');
    setSearch('');
    setActiveFilter('');
    setVerifiedFilter('');
    setPage(1);
  };

  const openCreateForm = () => {
    setSelectedStudent(null);
    setFormMode('create');
    openModal(STUDENT_FORM_MODAL);
  };

  const openEditForm = (student: User) => {
    setSelectedStudent(student);
    setFormMode('edit');
    openModal(STUDENT_FORM_MODAL);
  };

  const openLockForm = (student: User) => {
    setSelectedStudent(student);
    openModal(LOCK_STUDENT_MODAL);
  };

  const openUnlockConfirm = (student: User) => {
    setSelectedStudent(student);
    openModal(UNLOCK_STUDENT_MODAL);
  };

  const closeStudentModal = () => {
    closeModal();
    setSelectedStudent(null);
  };

  if (isLoading) {
    return (
      <DemoPageRoot>
        <Skeleton className="h-36 rounded-lg" />
        <Skeleton className="h-72 rounded-lg" />
      </DemoPageRoot>
    );
  }

  if (isError) {
    return (
      <EmptyState
        icon={<AlertCircle size={36} />}
        title="Could not load students"
        description="Please try again in a moment"
        action={(
          <Button
            variant="outline"
            onClick={() => queryClient.invalidateQueries({ queryKey: ['admin-students'] })}
          >
            <RefreshCw size={14} />
            Retry
          </Button>
        )}
      />
    );
  }

  return (
    <DemoPageRoot>
      <DemoHeroWhite>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <DemoPill tone="pink">Admin</DemoPill>
              <Users size={18} className="text-black/45" />
            </div>
            <DemoDisplayTitle>Student management</DemoDisplayTitle>
            <DemoMuted>
              {total.toLocaleString()} student{total === 1 ? '' : 's'} found. Create, update,
              verify, lock, and unlock student accounts.
            </DemoMuted>
          </div>
          <button
            type="button"
            onClick={openCreateForm}
            className="inline-flex items-center gap-2 rounded-full bg-black px-5 py-2.5 text-sm font-medium text-white hover:bg-black/90"
          >
            <Plus size={14} />
            Add student
          </button>
        </div>
      </DemoHeroWhite>

      <DemoWhitePanel className="p-4">
        <form onSubmit={applyFilters} className="grid gap-3 lg:grid-cols-[1fr_160px_160px_120px_auto]">
          <Input
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Search name or email"
            prefix={<Search size={13} />}
            aria-label="Search students"
          />
          <select
            value={activeFilter}
            onChange={(event) => {
              setActiveFilter(event.target.value);
              setPage(1);
            }}
            className="input-field"
            aria-label="Active filter"
          >
            <option value="">All access</option>
            <option value="true">Active</option>
            <option value="false">Locked</option>
          </select>
          <select
            value={verifiedFilter}
            onChange={(event) => {
              setVerifiedFilter(event.target.value);
              setPage(1);
            }}
            className="input-field"
            aria-label="Verified filter"
          >
            <option value="">All verification</option>
            <option value="true">Verified</option>
            <option value="false">Unverified</option>
          </select>
          <select
            value={limit}
            onChange={(event) => {
              setLimit(Number(event.target.value));
              setPage(1);
            }}
            className="input-field"
            aria-label="Rows per page"
          >
            <option value={10}>10 / page</option>
            <option value={20}>20 / page</option>
            <option value={50}>50 / page</option>
          </select>
          <div className="flex gap-2">
            <Button type="submit" className="whitespace-nowrap">
              Apply
            </Button>
            <Button type="button" variant="outline" onClick={resetFilters}>
              Reset
            </Button>
          </div>
        </form>
      </DemoWhitePanel>

      {students.length === 0 ? (
        <DemoWhitePanel className="p-8">
          <EmptyState
            icon={<Users size={36} />}
            title="No students found"
            description="Try changing filters or create a new student account"
            action={(
              <button
                type="button"
                onClick={openCreateForm}
                className="inline-flex items-center gap-2 rounded-full bg-black px-4 py-2 text-sm font-medium text-white"
              >
                <Plus size={14} />
                Add student
              </button>
            )}
          />
        </DemoWhitePanel>
      ) : (
        <DemoWhitePanel>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px]">
              <thead>
                <tr className="border-b border-black/10 bg-[#f7f4ee]/80">
                  {['Student', 'Email', 'Role', 'Access', 'Verified', 'Created', 'Actions'].map(
                    (heading) => (
                      <th
                        key={heading}
                        className="px-4 py-3 text-left text-xs font-medium uppercase tracking-[0.12em] text-black/45"
                      >
                        {heading}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {students.map((student) => {
                  const studentId = getStudentId(student);
                  const active = getIsActive(student);
                  const verified = getIsVerified(student);

                  return (
                    <tr
                      key={studentId}
                      className="border-b border-black/10 transition-colors last:border-b-0 hover:bg-black/[0.02]"
                    >
                      <td className="min-w-56 px-4 py-3">
                        <p className="max-w-xs truncate text-sm font-medium text-ink">
                          {getStudentName(student)}
                        </p>
                        {student.lockedReason ? (
                          <p className="mt-0.5 line-clamp-1 text-xs text-rose-700">
                            {student.lockedReason}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-sm text-black/65">{student.email}</td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-[#f7f4ee] px-2.5 py-0.5 text-xs font-medium text-black/65">
                          {student.role}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <StatusPill active={active}>{active ? 'Active' : 'Locked'}</StatusPill>
                      </td>
                      <td className="px-4 py-3">
                        <StatusPill active={verified}>
                          {verified ? 'Verified' : 'Unverified'}
                        </StatusPill>
                      </td>
                      <td className="px-4 py-3 text-xs text-black/45">
                        {formatDate(student.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => openEditForm(student)}
                            className="inline-flex items-center gap-1.5 rounded-full border border-black/10 px-3 py-1.5 text-xs font-medium text-ink hover:bg-black/[0.03]"
                          >
                            <Edit2 size={12} />
                            Edit
                          </button>
                          {active ? (
                            <button
                              type="button"
                              onClick={() => openLockForm(student)}
                              className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-100"
                            >
                              <LockKeyhole size={12} />
                              Lock
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => openUnlockConfirm(student)}
                              className="inline-flex items-center gap-1.5 rounded-full border border-black/10 px-3 py-1.5 text-xs font-medium text-ink hover:bg-black/[0.03]"
                            >
                              <UnlockKeyhole size={12} />
                              Unlock
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-black/10 px-4 py-3">
            <p className="text-xs text-black/50">
              Page {page} of {totalPages}
              {isFetching ? ' - refreshing' : ''}
            </p>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              >
                Previous
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              >
                Next
              </Button>
            </div>
          </div>
        </DemoWhitePanel>
      )}

      <Modal
        name={STUDENT_FORM_MODAL}
        title={formMode === 'edit' ? 'Edit student' : 'Create student'}
        description={
          formMode === 'edit'
            ? 'Update allowed profile and verification fields'
            : 'Create a student account with an optional password'
        }
        size="xl"
        onClose={() => setSelectedStudent(null)}
      >
        <StudentForm
          key={formMode === 'edit' && selectedStudent ? getStudentId(selectedStudent) : 'new'}
          mode={formMode}
          student={selectedStudent}
          onSaved={closeStudentModal}
        />
      </Modal>

      <Modal
        name={LOCK_STUDENT_MODAL}
        title="Lock student"
        description="Use the dedicated lock endpoint. The reason is optional."
        size="md"
        onClose={() => setSelectedStudent(null)}
      >
        <LockStudentForm student={selectedStudent} onLocked={closeStudentModal} />
      </Modal>

      <Modal
        name={UNLOCK_STUDENT_MODAL}
        title="Unlock student"
        description="Use the dedicated unlock endpoint with no request body."
        size="sm"
        onClose={() => setSelectedStudent(null)}
      >
        <UnlockStudentConfirm student={selectedStudent} onUnlocked={closeStudentModal} />
      </Modal>
    </DemoPageRoot>
  );
};
