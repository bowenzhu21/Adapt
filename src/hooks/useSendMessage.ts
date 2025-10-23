'use client';

import { useState, useCallback } from 'react';
import { applyTheme, type ThemeInput } from '@/lib/ui/applyTheme';
import { useConversationId } from '@/hooks/useConversationId';

type InterpretResponse = {
  theme: unknown;
  components: Array<{ type: string; props: Record<string, unknown> }>;
  emotion?: string | null;
  intent?: string | null;
  reply?: string | null;
};

export function useSendMessage() {
  const { conversationId } = useConversationId();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = useCallback(
    async (text: string) => {
      const message = (text || '').trim();
      if (!message) return null;
      if (!conversationId) {
        setError('No conversation ready yet.');
        return null;
      }
      setPending(true);
      setError(null);

      try {
        const res = await fetch('/api/interpret', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ conversationId, message }),
        });

        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j?.error || `Request failed (${res.status})`);
        }

        const data: InterpretResponse = await res.json();

        window.dispatchEvent(
          new CustomEvent('ui-state:update', {
            detail: {
              conversationId,
              theme: data.theme,
              components: data.components,
              emotion: data.emotion ?? null,
              intent: data.intent ?? null,
              source: 'optimistic',
              updatedAt: Date.now(),
            },
          }),
        );

        applyTheme(data.theme as ThemeInput | undefined);
        return data.reply ?? null;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Send failed.';
        setError(message);
        return null;
      } finally {
        setPending(false);
      }
    },
    [conversationId],
  );

  return { send, pending, error };
}
