'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase/client';

type UIState = {
  theme: any | null;
  components: Array<any>;
  emotion: string | null;
  intent: string | null;
};

type UIStateHookReturn = UIState & {
  loading: boolean;
  error: string | null;
};

const NOT_FOUND_ERROR = 'NOT_FOUND';

async function fetchUIState(conversationId: string): Promise<UIStateHookReturn> {
  try {
    const response = await fetch(`/api/ui-state?conversationId=${encodeURIComponent(conversationId)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (response.status === 404) {
      return {
        theme: null,
        components: [],
        emotion: null,
        intent: null,
        loading: false,
        error: NOT_FOUND_ERROR,
      };
    }

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      const message =
        typeof payload?.error === 'string'
          ? payload.error
          : `Failed to fetch UI state (status ${response.status}).`;
      return {
        theme: null,
        components: [],
        emotion: null,
        intent: null,
        loading: false,
        error: message,
      };
    }

    const data = await response.json();
    const theme = data?.theme ?? null;
    const components = Array.isArray(data?.components) ? data.components : [];

    return {
      theme,
      components,
      emotion: theme?.emotion ?? null,
      intent: theme?.intent ?? null,
      loading: false,
      error: null,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unexpected error fetching UI state.';
    return {
      theme: null,
      components: [],
      emotion: null,
      intent: null,
      loading: false,
      error: message,
    };
  }
}

export function useUIState(conversationId: string): UIStateHookReturn {
  const [theme, setTheme] = useState<any | null>(null);
  const [components, setComponents] = useState<Array<any>>([]);
  const [emotion, setEmotion] = useState<string | null>(null);
  const [intent, setIntent] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!conversationId) {
      setTheme(null);
      setComponents([]);
      setEmotion(null);
      setIntent(null);
      setError('Missing conversation identifier.');
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    fetchUIState(conversationId).then((result) => {
      if (!isMounted) return;

      setTheme(result.theme);
      setComponents(result.components);
      setEmotion(result.theme?.emotion ?? null);
      setIntent(result.theme?.intent ?? null);
      setError(result.error);
      setLoading(result.loading);
    });

    const channel = supabase
      .channel(`ui_state:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ui_state',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          if (!payload.new) return;
          const nextTheme = payload.new.theme ?? null;
          setTheme(nextTheme);
          setComponents(
            Array.isArray(payload.new.components) ? payload.new.components : [],
          );
          setEmotion(nextTheme?.emotion ?? null);
          setIntent(nextTheme?.intent ?? null);
          setError(null);
          setLoading(false);
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'ui_state',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          if (!payload.new) return;
          const nextTheme = payload.new.theme ?? null;
          setTheme(nextTheme);
          setComponents(
            Array.isArray(payload.new.components) ? payload.new.components : [],
          );
          setEmotion(nextTheme?.emotion ?? null);
          setIntent(nextTheme?.intent ?? null);
          setError(null);
          setLoading(false);
        },
      )
      .subscribe();

    return () => {
      isMounted = false;
      void supabase.removeChannel(channel);
    };
  }, [conversationId]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const handler = (event: Event) => {
      const custom = event as CustomEvent<{
        conversationId: string;
        theme: any;
        components: Array<any>;
        emotion?: string | null;
        intent?: string | null;
      } | null>;

      const detail = custom.detail;
      if (!detail || detail.conversationId !== conversationId) {
        return;
      }

      const nextTheme = detail.theme ?? null;
      setTheme(nextTheme);
      setComponents(Array.isArray(detail.components) ? detail.components : []);
      const nextEmotion =
        detail.emotion ?? nextTheme?.emotion ?? (detail.intent ? detail.intent : null);
      setEmotion(nextEmotion ?? null);
      setIntent(detail.intent ?? nextTheme?.intent ?? null);
      setError(null);
      setLoading(false);
    };

    window.addEventListener('ui-state:update', handler);

    return () => {
      window.removeEventListener('ui-state:update', handler);
    };
  }, [conversationId]);

  return useMemo(
    () => ({
      theme,
      components,
      emotion,
      intent,
      loading,
      error,
    }),
    [theme, components, emotion, intent, loading, error],
  );
}

export const UI_STATE_NOT_FOUND = NOT_FOUND_ERROR;
