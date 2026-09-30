'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff, Lock, Mail, User, Loader2, AlertCircle, Home, LogIn, UserPlus } from 'lucide-react';
import { signIn, signUp } from '@/lib/auth-client';
import { DASHBOARD_ROLES } from '@/lib/role-config';

export const dynamic = 'force-dynamic';

const withTimeout = <T,>(promise: Promise<T>, timeoutMs = 12000): Promise<T> => {
  let timer: any;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error('Connection timed out. Please check your network and try again.'));
    }, timeoutMs);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timer) clearTimeout(timer);
  });
};

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') ?? '/dashboard';

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (mode === 'signin') {
        const executeSignIn = async () => {
          return await withTimeout(
            signIn.email({
              email: email.trim(),
              password,
            }),
            12000
          );
        };

        let res: any;
        try {
          res = await executeSignIn();
        } catch (firstErr: any) {
          console.warn('[Login] Initial attempt stalled or timed out, retrying immediately...', firstErr);
          await new Promise((r) => setTimeout(r, 400));
          res = await executeSignIn();
        }

        if (res.error) {
          const msg = res.error.message?.toLowerCase() || '';
          const status = (res.error as any).status;

          if (status === 401 || msg.includes('invalid') || msg.includes('credential') || msg.includes('password')) {
            setError('Invalid email or password. Please verify your credentials.');
          } else if (status === 404 || msg.includes('user not found') || msg.includes('not found')) {
            setError('No account found with this email address.');
          } else if (status >= 500 || msg.includes('database') || msg.includes('econnrefused') || msg.includes('connect')) {
            setError('Database unreachable or server temporarily unavailable. Please try again shortly.');
          } else {
            setError(res.error.message || 'Failed to sign in. Please try again.');
          }
          return;
        }

        if (res.data) {
          const user = res.data.user as any;
          const role = user?.role;

          if (callbackUrl && callbackUrl !== '/dashboard' && callbackUrl.startsWith('/')) {
            router.push(callbackUrl);
          } else if (role === 'agency') {
            router.push('/agency/contracts');
          } else if (DASHBOARD_ROLES.includes(role)) {
            router.push('/dashboard');
          } else {
            router.push('/');
          }
        }
      } else {
        // Sign Up Mode
        const displayName = name.trim() || email.split('@')[0];
        const executeSignUp = async () => {
          return await withTimeout(
            signUp.email({
              email: email.trim(),
              password,
              name: displayName,
            }),
            12000
          );
        };

        let res: any;
        try {
          res = await executeSignUp();
        } catch (firstErr: any) {
          console.warn('[Signup] Initial attempt stalled or timed out, retrying immediately...', firstErr);
          await new Promise((r) => setTimeout(r, 400));
          res = await executeSignUp();
        }

        if (res.error) {
          const msg = res.error.message?.toLowerCase() || '';
          if (msg.includes('already exists') || (res.error as any).code === 'USER_ALREADY_EXISTS') {
            setError('An account with this email already exists. Please sign in instead.');
          } else {
            setError(res.error.message || 'Failed to create account.');
          }
          return;
        }

        if (res.data) {
          if (callbackUrl && callbackUrl.startsWith('/') && callbackUrl !== '/') {
            router.push(callbackUrl);
          } else {
            router.push('/dashboard');
          }
        }
      }
    } catch (err: any) {
      console.error('Authentication Error:', err);
      const isTimeout = err?.message?.includes('timed out');
      if (isTimeout) {
        setError('Connection timed out. The server took too long to respond. Please check your network and try again.');
      } else if (err?.message?.includes('Failed to fetch') || err?.name === 'TypeError') {
        setError('Cannot connect to the authentication server. Please check your internet connection.');
      } else {
        setError(err?.message || 'An error occurred during authentication.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden bg-[#bce3fa] p-4">
      {/* Concentric circle rings in background */}
      {mounted && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden flex items-center justify-center">
          <div className="w-[1200px] h-[1200px] rounded-full border border-white/20 absolute" />
          <div className="w-[950px] h-[950px] rounded-full border border-white/30 absolute" />
          <div className="w-[700px] h-[700px] rounded-full border border-white/40 absolute" />
          <div className="w-[450px] h-[450px] rounded-full border border-white/50 absolute" />
        </div>
      )}

      <div className="relative z-10 flex flex-col items-center w-full max-w-md">
        {/* Back to Home Button */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/70 hover:bg-white border border-white/60 text-sky-800 text-xs font-semibold shadow-sm transition-all mb-6 cursor-pointer hover:scale-105"
        >
          <div className="w-5 h-5 rounded-full bg-sky-100 flex items-center justify-center text-sky-600">
            <Home size={12} />
          </div>
          <span>Back to Home</span>
        </Link>

        {/* Main Card */}
        <div className="w-full bg-white rounded-[2rem] shadow-xl border border-white/70 p-8 sm:p-10">
          {/* Card Icon */}
          <div className="w-12 h-12 rounded-2xl bg-sky-50 border border-sky-100 text-sky-600 flex items-center justify-center mx-auto mb-4 shadow-sm">
            {mode === 'signin' ? <LogIn size={20} /> : <UserPlus size={20} />}
          </div>

          {/* Mode Switch Tabs */}
          <div className="flex bg-slate-100 p-1 rounded-2xl mb-6">
            <button
              type="button"
              onClick={() => { setMode('signin'); setError(''); }}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                mode === 'signin'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setMode('signup'); setError(''); }}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                mode === 'signup'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Sign Up
            </button>
          </div>

          {/* Title & Subtitle */}
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              {mode === 'signin' ? 'Sign in with email' : 'Create an account'}
            </h1>
            <p className="text-slate-400 text-xs font-medium mt-1.5">
              {mode === 'signin'
                ? 'Welcome back to the Coolstaff agency portal.'
                : 'Join the Coolstaff agency platform.'}
            </p>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-red-50 border border-red-200 text-red-600 text-xs mb-5">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name for Sign Up */}
            {mode === 'signup' && (
              <div className="relative">
                <User
                  size={16}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Full Name"
                  required
                  disabled={isLoading}
                  className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-slate-50/80 border border-slate-200/80 text-slate-900 placeholder:text-slate-400 text-sm focus:outline-none focus:border-sky-500 focus:bg-white focus:ring-2 focus:ring-sky-500/10 transition-all disabled:opacity-50 font-medium"
                />
              </div>
            )}

            {/* Email Field */}
            <div className="relative">
              <Mail
                size={16}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                required
                disabled={isLoading}
                className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-slate-50/80 border border-slate-200/80 text-slate-900 placeholder:text-slate-400 text-sm focus:outline-none focus:border-sky-500 focus:bg-white focus:ring-2 focus:ring-sky-500/10 transition-all disabled:opacity-50 font-medium"
              />
            </div>

            {/* Password Field */}
            <div>
              <div className="relative">
                <Lock
                  size={16}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  required
                  disabled={isLoading}
                  className="w-full pl-11 pr-11 py-3.5 rounded-2xl bg-slate-50/80 border border-slate-200/80 text-slate-900 placeholder:text-slate-400 text-sm focus:outline-none focus:border-sky-500 focus:bg-white focus:ring-2 focus:ring-sky-500/10 transition-all disabled:opacity-50 font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((p) => !p)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                >
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {mode === 'signin' && (
                <div className="text-right mt-2">
                  <button
                    type="button"
                    onClick={() => alert('Please contact administrator to reset your password.')}
                    className="text-xs text-slate-400 hover:text-slate-600 font-medium transition-colors cursor-pointer"
                  >
                    Forgot password?
                  </button>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || !email || !password}
              className="w-full py-3.5 mt-2 rounded-2xl bg-slate-800 hover:bg-slate-900 disabled:bg-slate-300 text-white font-bold text-sm transition-all shadow-md hover:shadow-lg disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  {mode === 'signin' ? 'Signing in…' : 'Creating account…'}
                </>
              ) : mode === 'signin' ? (
                'Sign In'
              ) : (
                'Create Account'
              )}
            </button>
          </form>

          {/* Toggle Footer inside Card */}
          <div className="text-center text-xs text-slate-500 mt-6 font-medium">
            {mode === 'signin' ? (
              <>
                <span>Don't have an account? </span>
                <button
                  type="button"
                  onClick={() => { setMode('signup'); setError(''); }}
                  className="text-sky-600 hover:underline font-semibold cursor-pointer"
                >
                  Sign up
                </button>
              </>
            ) : (
              <>
                <span>Already have an account? </span>
                <button
                  type="button"
                  onClick={() => { setMode('signin'); setError(''); }}
                  className="text-sky-600 hover:underline font-semibold cursor-pointer"
                >
                  Sign in
                </button>
              </>
            )}
          </div>
        </div>

        {/* System Footer Text */}
        <p className="text-center text-sky-700/60 text-xs font-semibold mt-6 tracking-wide">
          Coolstaff Foreign Employment Agency System
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#bce3fa] flex items-center justify-center"><Loader2 className="animate-spin text-sky-600" /></div>}>
      <LoginForm />
    </Suspense>
  );
}
