'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { applyTheme, type ThemeInput } from '@/lib/ui/applyTheme';

type UIState = {
  theme: unknown | null;
  components: unknown[];
  emotion: string | null;
  intent: string | null;
};

type UIStateHookReturn = UIState & {
  loading: boolean;
  error: string | null;
};

type UiStateDetail = {
  conversationId: string;
  theme: unknown | null;
  components: unknown[];
  emotion: string | null;
  intent: string | null;
  source?: string | null;
  updatedAt?: number;
};

const NOT_FOUND_ERROR = 'NOT_FOUND';

function emitUiStateUpdate(detail: UiStateDetail) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('ui-state:update', { detail }));
}

async function fetchUIState(conversationId: string): Promise<UIStateHookReturn> {
  try {
    const response = await fetch(
      `/api/ui-state?conversationId=${encodeURIComponent(conversationId)}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );

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
    const emotion =
      typeof data?.emotion === 'string'
        ? data.emotion
        : typeof theme?.emotion === 'string'
        ? theme.emotion
        : null;
    const intent =
      typeof data?.intent === 'string'
        ? data.intent
        : typeof theme?.intent === 'string'
        ? theme.intent
        : null;

    return {
      theme,
      components,
      emotion,
      intent,
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
  const [theme, setTheme] = useState<unknown | null>(null);
  const [components, setComponents] = useState<unknown[]>([]);
  const [emotion, setEmotion] = useState<string | null>(null);
  const [intent, setIntent] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const lastUpdatedAtRef = useRef(0);
  const emotionRef = useRef<string | null>(null);
  const intentRef = useRef<string | null>(null);

  const applyState = useCallback(
    ({
      theme: nextTheme,
      components: nextComponents,
      emotion: nextEmotion,
      intent: nextIntent,
      updatedAt,
      source,
      error: nextError,
      emit = true,
      force = false,
    }: {
      theme: unknown | null;
      components: unknown[];
      emotion?: string | null;
      intent?: string | null;
      updatedAt?: number;
      source?: string | null;
      error?: string | null;
      emit?: boolean;
      force?: boolean;
    }) => {
      const timestamp =
        typeof updatedAt === 'number' && Number.isFinite(updatedAt)
          ? updatedAt
          : Date.now();
      if (!force && timestamp <= lastUpdatedAtRef.current) {
        return;
      }
      lastUpdatedAtRef.current = timestamp;
      const safeTheme = nextTheme ?? null;
      const themeRecord =
        safeTheme !== null && typeof safeTheme === 'object'
          ? (safeTheme as Record<string, unknown>)
          : null;
      const themeInput =
        themeRecord !== null ? (themeRecord as ThemeInput) : undefined;
      const safeComponents = Array.isArray(nextComponents) ? nextComponents : [];
      const safeEmotion =
        nextEmotion !== undefined
          ? nextEmotion ?? null
          : themeRecord && typeof themeRecord.emotion === 'string'
          ? (themeRecord.emotion as string)
          : emotionRef.current ?? null;
      const safeIntent =
        nextIntent !== undefined
          ? nextIntent ?? null
          : themeRecord && typeof themeRecord.intent === 'string'
          ? (themeRecord.intent as string)
          : intentRef.current ?? null;

      setTheme(safeTheme);
      setComponents(safeComponents);
      emotionRef.current = safeEmotion ?? null;
      intentRef.current = safeIntent ?? null;
      setEmotion(emotionRef.current);
      setIntent(intentRef.current);
      setLoading(false);
      if (nextError !== undefined) {
        setError(nextError);
      } else {
        setError(null);
      }

      applyTheme(themeInput);

      if (emit) {
        emitUiStateUpdate({
          conversationId,
          theme: safeTheme,
          components: safeComponents,
          emotion: safeEmotion ?? null,
          intent: safeIntent ?? null,
          source: source ?? null,
          updatedAt: timestamp,
        });
      }
    },
    [conversationId],
  );

  useEffect(() => {
    lastUpdatedAtRef.current = 0;
    emotionRef.current = null;
    intentRef.current = null;
    if (!conversationId) {
      emotionRef.current = null;
      intentRef.current = null;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      applyState({
        theme: null,
        components: [],
        emotion: null,
        intent: null,
        updatedAt: Date.now(),
        source: 'reset',
        emit: false,
        force: true,
        error: 'Missing conversation identifier.',
      });
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    fetchUIState(conversationId).then((result) => {
      if (!isMounted) return;

      if (result.error && result.error !== NOT_FOUND_ERROR) {
        setError(result.error);
        setLoading(false);
        return;
      }

      applyState({
        theme: result.theme,
        components: result.components,
        emotion: result.emotion,
        intent: result.intent,
        updatedAt: Date.now(),
        source: 'initial',
        error: result.error === NOT_FOUND_ERROR ? null : result.error,
      });
    });

    const channel = supabase
      .channel(`ui_state:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ui_state',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          if (!payload.new) return;
          const record = payload.new as {
            theme?: unknown;
            components?: unknown;
            updated_at?: string;
          };
          const timestamp = record.updated_at
            ? new Date(record.updated_at).getTime()
            : Date.now();
          applyState({
            theme: record.theme ?? null,
            components: Array.isArray(record.components) ? record.components : [],
            updatedAt: timestamp,
            source: 'realtime',
            error: null,
            force: true,
          });
        },
      )
      .subscribe();

    return () => {
      isMounted = false;
      void supabase.removeChannel(channel);
    };
  }, [applyState, conversationId]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const handler = (event: Event) => {
      const detail = (event as CustomEvent<UiStateDetail | null>).detail;
      if (!detail || detail.conversationId !== conversationId) {
        return;
      }

      applyState({
        theme: detail.theme ?? null,
        components: Array.isArray(detail.components) ? detail.components : [],
        emotion: detail.emotion ?? null,
        intent: detail.intent ?? null,
        updatedAt: detail.updatedAt,
        source: detail.source ?? 'external',
        emit: false,
      });
    };

    window.addEventListener('ui-state:update', handler);

    return () => {
      window.removeEventListener('ui-state:update', handler);
    };
  }, [applyState, conversationId]);

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
