'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import axios from 'axios';
import { Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { authService } from '../../services/auth.service';
import { extractApiError } from '../../services/apiClient';
import { useAuthStore } from '../../store';
import { Button, Input } from '../../components/shared';
import { AuthShell } from './AuthShell';
import { getPostLoginPath } from '../../utils/roleNavigation';
import { queueAdaptivePathNudge } from '../../utils/adaptive-path-nudge';

const schema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});
type FormData = z.infer<typeof schema>;

const ACCOUNT_LOCKED_MESSAGE = 'Your account has been locked. Please contact support.';
const INVALID_CREDENTIALS_MESSAGE = 'Invalid credentials. Please try again.';

const getLoginErrorMessage = (error: unknown): string => {
  const backendMessage = extractApiError(error, '');

  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    const normalizedMessage = backendMessage.toLowerCase();

    if (
      status === 403 &&
      (normalizedMessage.includes('locked') || normalizedMessage.includes('inactive'))
    ) {
      return ACCOUNT_LOCKED_MESSAGE;
    }

    if (status === 403 && normalizedMessage.includes('verify')) {
      return backendMessage || 'Please verify your email before logging in.';
    }

    if (status === 400 || status === 401) {
      return backendMessage || INVALID_CREDENTIALS_MESSAGE;
    }
  }

  return backendMessage || INVALID_CREDENTIALS_MESSAGE;
};

export const LoginPage: React.FC = () => {
  const [showPassword, setShowPassword] = useState(false);
  const { setAuth } = useAuthStore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get('from');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    try {
      const result = await authService.login(data);
      setAuth(result.user, result.accessToken, result.refreshToken);
      if (result.user.role === 'STUDENT') queueAdaptivePathNudge();
      toast.success('Welcome back!');
      router.replace(getPostLoginPath(result.user.role, from));
    } catch (error) {
      toast.error(getLoginErrorMessage(error));
    }
  };

  return (
    <AuthShell
      footer={
        <>
          No account?{' '}
          <Link href="/register" className="font-medium text-ink hover:underline">
            Create one
          </Link>
        </>
      }
    >
      <div className="mb-6">
        <h1 className="text-2xl font-light tracking-tight text-ink">Sign in</h1>
        <p className="mt-1 text-sm text-ink-muted">Continue your learning journey</p>
      </div>

      <button
        type="button"
        onClick={authService.loginWithGoogle}
        className="mb-5 flex w-full items-center justify-center gap-3 rounded-full border border-black/10 py-2.5 text-sm text-ink transition hover:bg-black/[0.03]"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
        </svg>
        Continue with Google
      </button>

      <div className="mb-5 flex items-center gap-3">
        <div className="h-px flex-1 bg-black/10" />
        <span className="text-[11px] text-ink-faint">or</span>
        <div className="h-px flex-1 bg-black/10" />
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <Input
          label="Email"
          type="email"
          placeholder="you@example.com"
          prefix={<Mail size={13} />}
          error={errors.email?.message}
          {...register('email')}
        />
        <Input
          label="Password"
          type={showPassword ? 'text' : 'password'}
          placeholder="••••••••"
          prefix={<Lock size={13} />}
          suffix={
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="text-ink-faint hover:text-ink transition-colors"
            >
              {showPassword ? <EyeOff size={13} /> : <Eye size={13} />}
            </button>
          }
          error={errors.password?.message}
          {...register('password')}
        />

        <div className="flex justify-end">
          <Link
            href="/forgot-password"
            className="text-xs font-medium text-ink-muted hover:text-ink transition-colors"
          >
            Forgot password?
          </Link>
        </div>

        <Button type="submit" loading={isSubmitting} className="w-full justify-center">
          <span>Sign in</span>
          <ArrowRight size={14} />
        </Button>
      </form>
    </AuthShell>
  );
};
