'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { supabase } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setErrorMessage(error.message || 'Unable to sign in. Please check your credentials.');
      setIsSubmitting(false);
      return;
    }

    const redirectTo = searchParams?.get('redirectTo');
    const destination = redirectTo && redirectTo.startsWith('/') ? redirectTo : '/';

    router.replace(destination);
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-100">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-md">
        <h1 className="mb-6 text-2xl font-semibold text-zinc-900">Sign in</h1>
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
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-base text-zinc-900 shadow-sm transition focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-200"
            />
          </label>
          <button
            type="submit"
            disabled={isSubmitting || email.trim().length === 0 || password.trim().length === 0}
            className="w-full rounded-md bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400"
          >
            {isSubmitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        {errorMessage && (
          <p className="mt-4 text-sm font-medium text-red-600">{errorMessage}</p>
        )}
        <p className="mt-6 text-center text-sm text-zinc-600">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="font-semibold text-zinc-900 hover:underline">
            Create one
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
