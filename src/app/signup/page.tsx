'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, Suspense, useState } from 'react';
import { supabase } from '@/lib/supabase/client';

export default function SignupPage() {
  return (
    <Suspense fallback={<SignupFallback />}>
      <SignupForm />
    </Suspense>
  );
}

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function getRedirectDestination() {
    const redirectTo = searchParams?.get('redirectTo');
    return redirectTo && redirectTo.startsWith('/') ? redirectTo : '/';
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);
    setInfoMessage(null);

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      setIsSubmitting(false);
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setErrorMessage(error.message || 'Unable to create account. Please try again.');
      setIsSubmitting(false);
      return;
    }

    if (data.session) {
      router.replace(getRedirectDestination());
      router.refresh();
      return;
    }

    setInfoMessage('Account created! Check your email to confirm your address.');
    setIsSubmitting(false);
  }

  const canSubmit =
    !isSubmitting &&
    email.trim().length > 0 &&
    password.trim().length > 0 &&
    confirmPassword.trim().length > 0;

  return (
    <div className="flex min-h-dvh items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-6 text-fg">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-semibold tracking-tight">Create account</h1>
          <p className="text-sm text-fg/70">
            Set the tone and Adapt will follow your lead.
          </p>
        </div>
        <div className="adapt-panel space-y-5 px-6 py-6">
          <form className="space-y-4" onSubmit={handleSubmit}>
            <label className="flex flex-col gap-2 text-sm font-medium text-fg/70">
              Email address
              <input
                type="email"
                name="email"
                required
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-xl border border-white/10 bg-bg/40 px-4 py-2.5 text-sm text-fg shadow-inner transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium text-fg/70">
              Password
              <input
                type="password"
                name="password"
                required
                autoComplete="new-password"
                minLength={6}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Create a password"
                className="w-full rounded-xl border border-white/10 bg-bg/40 px-4 py-2.5 text-sm text-fg shadow-inner transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium text-fg/70">
              Confirm password
              <input
                type="password"
                name="confirm-password"
                required
                autoComplete="new-password"
                minLength={6}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Re-enter password"
                className="w-full rounded-xl border border-white/10 bg-bg/40 px-4 py-2.5 text-sm text-fg shadow-inner transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </label>
            <button
              type="submit"
              disabled={!canSubmit}
              className="adapt-btn w-full rounded-xl px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? 'Creating account…' : 'Create account'}
            </button>
          </form>

          {errorMessage ? (
            <p className="text-sm font-medium text-red-400" role="alert">
              {errorMessage}
            </p>
          ) : null}
          {infoMessage ? (
            <p className="text-sm font-medium text-emerald-400" role="status">
              {infoMessage}
            </p>
          ) : null}
        </div>
        <p className="text-center text-sm text-fg/70">
          Already have an account?{' '}
          <Link href="/login" className="font-semibold text-primary hover:underline">
            Sign in
          </Link>
          .
        </p>
      </div>
    </div>
  );
}

function SignupFallback() {
  return (
    <div className="flex min-h-dvh items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-xl border border-white/10 bg-bg/40 p-6 text-center text-sm text-fg/70 shadow-sm">
        Loading sign-up form…
      </div>
    </div>
  );
}
