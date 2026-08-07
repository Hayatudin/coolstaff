'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff, Lock, Mail, Loader2, AlertCircle, Home, LogIn } from 'lucide-react';
import { signIn, signUp } from '@/lib/auth-client';
import { DASHBOARD_ROLES } from '@/lib/role-config';

export const dynamic = 'force-dynamic';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') ?? '/dashboard';

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
      // 1. Attempt Sign In
      const { data: signInData, error: signInError } = await signIn.email({
        email,
        password,
      });

      if (!signInError) {
        // Sign in success! Check role for redirection
        const user = signInData.user as any;
        const role = user?.role;
        console.log("Sign in successful. User role:", role);

        if (role === 'agency') {
          router.push('/agency/contracts');
        } else if (DASHBOARD_ROLES.includes(role)) {
          router.push('/dashboard');
        } else {
          router.push('/');
        }
        return;
      }

      console.log("Sign in failed with:", signInError.message, ". Attempting auto-registration...");

      const namePrefix = email.split('@')[0];
      const displayName = namePrefix.charAt(0).toUpperCase() + namePrefix.slice(1);

      const { data: signUpData, error: signUpError } = await signUp.email({
        email,
        password,
        name: displayName,
      });

      if (!signUpError) {
        console.log("Auto-registration successful for new user.");
        router.push('/');
        return;
      }

      if (signUpError.message?.toLowerCase().includes('already exists') || signUpError.code === 'USER_ALREADY_EXISTS') {
        setError('Invalid email or password');
      } else {
        const errorMessage = signUpError.message || signInError.message || 'Authentication failed';
        setError(errorMessage);
        console.error("Auth Fail Details:", { signInError, signUpError });
      }

    } catch (err: any) {
      console.error("Critical Auth Error:", err);
      if (err.message === 'Failed to fetch') {
        setError('Network error: Could not reach the server. Please check your internet or server connection.');
      } else {
        setError(err.message || 'An error occurred during authentication');
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

        {/* Main Login Card */}
        <div className="w-full bg-white rounded-[2rem] shadow-xl border border-white/70 p-8 sm:p-10">
          {/* Card Icon */}
          <div className="w-12 h-12 rounded-2xl bg-sky-50 border border-sky-100 text-sky-600 flex items-center justify-center mx-auto mb-4 shadow-sm">
            <LogIn size={20} />
          </div>

          {/* Title & Subtitle */}
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Sign in with email</h1>
            <p className="text-slate-400 text-xs font-medium mt-1.5">Welcome back to the Coolstaff agency portal.</p>
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

              {/* Forgot password link */}
              <div className="text-right mt-2">
                <button
                  type="button"
                  onClick={() => alert("Please contact administrator to reset your password.")}
                  className="text-xs text-slate-400 hover:text-slate-600 font-medium transition-colors cursor-pointer"
                >
                  Forgot password?
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || !email || !password}
              className="w-full py-3.5 mt-2 rounded-2xl bg-slate-500 hover:bg-slate-600 disabled:bg-slate-300 text-white font-bold text-sm transition-all shadow-md hover:shadow-lg disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Signing in…
                </>
              ) : (
                'Get Started'
              )}
            </button>
          </form>

          {/* Sign Up Footer inside Card */}
          <div className="text-center text-xs text-slate-500 mt-6 font-medium">
            <span>Don't have an account? </span>
            <button
              type="button"
              onClick={() => alert("Please contact administrator for account registration.")}
              className="text-blue-600 hover:underline font-semibold cursor-pointer"
            >
              Sign up
            </button>
          </div>
        </div>

        {/* System Footer Text below card */}
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
