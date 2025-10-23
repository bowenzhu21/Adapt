'use client';

import { useCallback, useMemo } from 'react';

type ExploreHandlers = {
  focus: () => void;
  calm: () => void;
  create: () => void;
  plan: () => void;
  reflect: () => void;
};

export function useExploreHandlers(conversationId: string | null | undefined): ExploreHandlers {
  const nudge = useCallback(
    async (message: string) => {
      if (!conversationId) return;
      await fetch('/api/interpret', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ conversationId, message }),
      });
    },
    [conversationId],
  );

  return useMemo(
    () => ({
      focus: () => nudge('Help me focus for 25 minutes. Add a timer and a start button.'),
      calm: () => nudge('Help me calm down with a breathing exercise. Suggest the 4-7-8 pattern.'),
      create: () => nudge('Inspire me with a creative prompt or mood image. Keep it minimal.'),
      plan: () => nudge('Help me schedule my day. Start the planner wizard and do not invent any tasks.'),
      reflect: () => nudge('I want to reflect. Show a journal prompt and a space to write.'),
    }),
    [nudge],
  );
}
