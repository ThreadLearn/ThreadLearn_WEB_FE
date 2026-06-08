import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Zap, Mail, Lock, Eye, EyeOff, ArrowRight, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { authService } from '../../services/auth.service';
import { extractApiError } from '../../services/apiClient';
import { useAuthStore } from '../../store';
import { Button, Input } from '../../components/shared';

const schema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  rememberMe: z.boolean().optional(),
});
type FormData = z.infer<typeof schema>;

export const LoginPage: React.FC = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [requiresVerification, setRequiresVerification] = useState(false);
  const { setAuth } = useAuthStore();
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      rememberMe: false,
    },
  });

  const onSubmit = async (data: FormData) => {
    setAuthError(null);
    setRequiresVerification(false);

    try {
      const result = await authService.login({
        email: data.email,
        password: data.password,
      });
      setAuth(
        result.user,
        result.accessToken,
        result.refreshToken,
        data.rememberMe ? 'local' : 'session'
      );
      toast.success('Welcome back!');
      router.replace(result.user.role === 'ADMIN' ? '/admin' : '/dashboard');
    } catch (error) {
      const message = extractApiError(error);
      const normalized = message.toLowerCase();
      const isUnverified =
        normalized.includes('verify') ||
        normalized.includes('verified') ||
        normalized.includes('verification') ||
        normalized.includes('unverified');

      if (isUnverified) {
        setRequiresVerification(true);
        setAuthError('Please verify your email before signing in. Use the verify email page to resend the verification link if needed.');
      } else {
        setAuthError(message || 'Invalid credentials. Please try again.');
      }

      toast.error(isUnverified ? 'Email verification required' : 'Invalid credentials. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4" style={{
      backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='32' height='32' viewBox='0 0 32 32' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 .5H31.5V32' fill='none' stroke='%23ffffff06' stroke-width='1'/%3E%3C/svg%3E\")"
    }}>
      {/* Glow orb */}
      <div className="fixed top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center gap-2.5 mb-8 justify-center">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center">
            <Zap size={16} className="text-white" />
          </div>
          <span className="font-mono font-bold text-lg text-gray-100 tracking-tight">ThreadLearn</span>
        </div>

        {/* Card */}
        <div className="bg-[#111118] border border-white/[0.07] rounded-2xl p-6 panel-shadow">
          <div className="mb-6">
            <h1 className="font-mono font-semibold text-xl text-gray-100">Sign in</h1>
            <p className="text-sm text-gray-600 font-mono mt-1">Continue your learning journey</p>
          </div>

          {/* Google OAuth */}
          <button
            type="button"
            onClick={authService.loginWithGoogle}
            className="w-full flex items-center justify-center gap-3 py-2.5 rounded-lg border border-white/10 hover:border-white/20 hover:bg-white/5 transition-all font-mono text-sm text-gray-300 mb-5"
          >
            <svg width="16" height="16" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>

          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px bg-white/[0.06]" />
            <span className="text-[11px] text-gray-700 font-mono">or</span>
            <div className="flex-1 h-px bg-white/[0.06]" />
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            {authError && (
              <div className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2.5 flex gap-2">
                <AlertCircle size={14} className="text-rose-400 mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-rose-300 font-mono">{authError}</p>
                  {requiresVerification && (
                    <p className="text-[11px] text-gray-500 font-mono mt-1">
                      Check your inbox, or open the verify email page to request a new link.
                    </p>
                  )}
                </div>
              </div>
            )}

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
                  className="hover:text-gray-400 transition-colors"
                >
                  {showPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
              }
              error={errors.password?.message}
              {...register('password')}
            />

            <div className="flex items-center justify-between gap-3">
              <label className="flex items-center gap-2 text-xs text-gray-500 font-mono">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-white/10 bg-white/5 accent-violet-600"
                  {...register('rememberMe')}
                />
                Remember me
              </label>

              <Link
                href="/forgot-password"
                className="text-xs text-violet-400 hover:text-violet-300 font-mono transition-colors"
              >
                Forgot password?
              </Link>
            </div>

            <Button type="submit" loading={isSubmitting} className="w-full justify-center">
              <span>Sign in</span>
              <ArrowRight size={14} />
            </Button>
          </form>
        </div>

        <p className="text-center text-sm text-gray-700 font-mono mt-5">
          No account?{' '}
          <Link href="/register" className="text-violet-400 hover:text-violet-300 transition-colors">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
};
