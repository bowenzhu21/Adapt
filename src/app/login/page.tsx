'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, Suspense, useState } from 'react';
import { supabase } from '@/lib/supabase/client';

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
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

  const canSubmit = email.trim().length > 0 && password.trim().length > 0 && !isSubmitting;

  return (
    <div className="flex min-h-dvh items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-6 text-fg">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-semibold tracking-tight">Welcome back</h1>
          <p className="text-sm text-fg/70">
            Sign in to continue adapting your space.
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
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-white/10 bg-bg/40 px-4 py-2.5 text-sm text-fg shadow-inner transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </label>
            <button
              type="submit"
              disabled={!canSubmit}
              className="adapt-btn w-full rounded-xl px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
          {errorMessage ? (
            <p className="text-sm font-medium text-red-400" role="alert">
              {errorMessage}
            </p>
          ) : null}
        </div>
        <p className="text-center text-sm text-fg/70">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="font-semibold text-primary hover:underline">
            Create one
          </Link>
          .
        </p>
      </div>
    </div>
  );
}

function LoginFallback() {
  return (
    <div className="flex min-h-dvh items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-xl border border-white/10 bg-bg/40 p-6 text-center text-sm text-fg/70 shadow-sm">
        Loading sign-in form…
      </div>
    </div>
  );
}
