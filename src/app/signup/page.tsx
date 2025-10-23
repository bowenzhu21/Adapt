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

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-100">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-md">
        <h1 className="mb-6 text-2xl font-semibold text-zinc-900">Create account</h1>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <label className="flex flex-col gap-2 text-sm font-medium text-zinc-700">
            Email address
            <input
              type="email"
              name="email"
              required
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-base text-zinc-900 shadow-sm transition focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-200"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium text-zinc-700">
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
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-base text-zinc-900 shadow-sm transition focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-200"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium text-zinc-700">
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
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-base text-zinc-900 shadow-sm transition focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-200"
            />
          </label>
          <button
            type="submit"
            disabled={
              isSubmitting ||
              email.trim().length === 0 ||
              password.trim().length === 0 ||
              confirmPassword.trim().length === 0
            }
            className="w-full rounded-md bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400"
          >
            {isSubmitting ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        {errorMessage && (
          <p className="mt-4 text-sm font-medium text-red-600">{errorMessage}</p>
        )}
        {infoMessage && (
          <p className="mt-4 text-sm font-medium text-emerald-600">{infoMessage}</p>
        )}
        <p className="mt-6 text-center text-sm text-zinc-600">
          Already have an account?{' '}
          <Link href="/login" className="font-semibold text-zinc-900 hover:underline">
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
    <div className="flex min-h-screen items-center justify-center bg-zinc-100">
      <div className="w-full max-w-md rounded-lg bg-white p-6 text-center text-sm text-zinc-600 shadow-md">
        Loading sign-up form…
      </div>
    </div>
  );
}
