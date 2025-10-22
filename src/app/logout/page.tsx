'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

export default function LogoutPage() {
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function handleSignOut() {
    setIsSigningOut(true);
    setErrorMessage(null);

    const { error } = await supabase.auth.signOut();

    if (error) {
      setErrorMessage(error.message || 'Unable to sign out. Please try again.');
      setIsSigningOut(false);
      return;
    }

    router.replace('/login');
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-100">
      <div className="w-full max-w-md rounded-lg bg-white p-6 text-center shadow-md">
        <h1 className="mb-4 text-2xl font-semibold text-zinc-900">Sign out</h1>
        <p className="mb-6 text-sm text-zinc-600">
          You are about to end your session. Click the button below to continue.
        </p>
        <button
          type="button"
          onClick={handleSignOut}
          disabled={isSigningOut}
          className="w-full rounded-md bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400"
        >
          {isSigningOut ? 'Signing out…' : 'Sign out'}
        </button>
        {errorMessage && (
          <p className="mt-4 text-sm font-medium text-red-600">{errorMessage}</p>
        )}
      </div>
    </div>
  );
}
