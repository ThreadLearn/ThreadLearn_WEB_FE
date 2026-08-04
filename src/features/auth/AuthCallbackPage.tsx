'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { AuthShell } from './AuthShell';
import { normalizeUser } from '../../services/auth.service';
import { useAuthStore } from '../../store';
import { getRoleHomePath } from '../../utils/roleNavigation';
import { queueAdaptivePathNudge } from '../../utils/adaptive-path-nudge';

type CallbackStatus = 'processing' | 'error';

const decodeUserParam = (value: string) => {
  try {
    return JSON.parse(value);
  } catch {
    try {
      return JSON.parse(decodeURIComponent(value));
    } catch {
      const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
      return JSON.parse(window.atob(base64));
    }
  }
};

export const AuthCallbackPage: React.FC = () => {
  const searchParams = useSearchParams();
  const setAuth = useAuthStore((state) => state.setAuth);
  const processedRef = useRef(false);
  const [status, setStatus] = useState<CallbackStatus>('processing');

  useEffect(() => {
    if (processedRef.current) return;
    processedRef.current = true;

    const error = searchParams.get('error');
    const accessToken = searchParams.get('accessToken');
    const refreshToken = searchParams.get('refreshToken');
    const userParam = searchParams.get('user');
    if (error || !accessToken || !refreshToken || !userParam) {
      setStatus('error');
      return;
    }

    try {
      const user = normalizeUser(decodeUserParam(userParam));
      setAuth(user, accessToken, refreshToken);
      if (user.role === 'STUDENT') queueAdaptivePathNudge();
      toast.success('Welcome back!');
      // The callback lives outside the authenticated route group. A hard
      // navigation avoids a client-router transition getting stuck here while
      // the persisted auth store is updating.
      window.location.replace(getRoleHomePath(user.role));
    } catch {
      setStatus('error');
    }
  }, [searchParams, setAuth]);

  if (status === 'error') {
    return (
      <AuthShell>
        <div className="flex flex-col items-center text-center">
          <div className="mb-4 grid h-11 w-11 place-items-center rounded-full bg-rose-500/10 text-rose-700">
            <AlertCircle size={19} />
          </div>
          <h1 className="text-xl font-light tracking-tight text-ink">
            Google sign-in could not be completed
          </h1>
          <p className="mt-2 text-sm text-ink-muted">
            Please return to sign in and try again.
          </p>
          <Link
            href="/login"
            className="mt-6 inline-flex w-full items-center justify-center rounded-full border border-transparent bg-black px-4 py-2 text-sm font-medium text-white transition-all duration-150 hover:bg-black/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/25 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas-cream"
          >
            Back to sign in
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <div className="flex flex-col items-center py-3 text-center">
        <Loader2 className="mb-4 animate-spin text-ink-muted" size={24} />
        <h1 className="text-xl font-light tracking-tight text-ink">
          Completing sign-in
        </h1>
        <p className="mt-2 text-sm text-ink-muted">
          Preparing your learning space.
        </p>
      </div>
    </AuthShell>
  );
};
