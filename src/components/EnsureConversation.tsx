'use client';

import { useEffect, useState } from 'react';
import { createConversation } from '@/lib/supabase/conversations';
import { CONVERSATION_STORAGE_KEY } from '@/hooks/useConversationId';

type EnsureConversationProps = {
  onReady: (id: string) => void;
};

export function EnsureConversation({ onReady }: EnsureConversationProps) {
  const [isSettingUp, setIsSettingUp] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function ensureConversation() {
      const existingId =
        typeof window !== 'undefined' ? localStorage.getItem(CONVERSATION_STORAGE_KEY) : null;

      if (!active) return;

      if (existingId) {
        setErrorMessage(null);
        onReady(existingId);
        setIsSettingUp(false);
        return;
      }

      try {
        setErrorMessage(null);

        const newId = await createConversation();
        if (!active) return;

        localStorage.setItem(CONVERSATION_STORAGE_KEY, newId);
        onReady(newId);
      } catch (error) {
        if (!active) return;

        console.error('Failed to create conversation', error);
        setErrorMessage('Unable to finish setup. Please refresh.');
      } finally {
        if (active) {
          setIsSettingUp(false);
        }
      }
    }

    ensureConversation();

    return () => {
      active = false;
    };
  }, [onReady]);

  if (!isSettingUp) {
    return errorMessage ? (
      <div className="rounded-xl border border-red-200 bg-red-50 px-6 py-4 text-sm font-medium text-red-700">
        {errorMessage}
      </div>
    ) : null;
  }

  return (
    <div className="flex min-h-[200px] items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-white px-6 py-10 text-sm font-medium text-zinc-600">
      Setting up your space…
    </div>
  );
}
