'use client';

import { createPortal } from 'react-dom';
import { supabase } from '@/lib/supabase/client';

type CornerActionsProps = {
  conversationId: string;
  emotion?: string | null;
  intent?: string | null;
};

export function CornerActions({ conversationId, emotion, intent }: CornerActionsProps) {
  const container =
    typeof window !== 'undefined' ? document.getElementById('corner-actions') : null;
  if (!container) {
    return null;
  }

  const moodLabel = formatLabel(emotion) ?? formatLabel(intent);

  return createPortal(
    <div className="flex items-center gap-2" data-conversation-id={conversationId}>
      {moodLabel ? (
        <span className="hidden sm:inline-flex items-center gap-1 rounded-full border border-white/10 bg-bg/30 px-2.5 py-1 text-xs font-medium uppercase tracking-[0.25em] text-fg/70 backdrop-blur-md">
          {moodLabel}
        </span>
      ) : null}
      <button
        type="button"
        onClick={handleSignOut}
        className="rounded-full border border-white/10 bg-bg/30 px-3 py-1.5 text-sm font-medium text-fg/80 backdrop-blur-md transition hover:bg-bg/40 focus:outline-none focus:ring-2 focus:ring-primary/40"
      >
        Sign out
      </button>
    </div>,
    container,
  );
}

async function handleSignOut() {
  await supabase.auth.signOut();
  window.location.assign('/login');
}

function formatLabel(value?: string | null) {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}
