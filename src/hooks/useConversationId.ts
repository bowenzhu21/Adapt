'use client';

import { useCallback, useEffect, useState } from 'react';

export const CONVERSATION_STORAGE_KEY = 'conversationId';

export function useConversationId() {
  const [conversationId, setConversationIdState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const frame = window.requestAnimationFrame(() => {
      const storedId = localStorage.getItem(CONVERSATION_STORAGE_KEY);
      setConversationIdState(storedId);
      setIsLoading(false);
    });
    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, []);

  const setConversationId = useCallback((id: string | null) => {
    setConversationIdState(id);
    if (typeof window === 'undefined') return;

    if (id) {
      localStorage.setItem(CONVERSATION_STORAGE_KEY, id);
    } else {
      localStorage.removeItem(CONVERSATION_STORAGE_KEY);
    }
  }, []);

  const getConversationId = useCallback(() => {
    if (typeof window === 'undefined') {
      return conversationId;
    }

    return localStorage.getItem(CONVERSATION_STORAGE_KEY) || null;
  }, [conversationId]);

  return {
    conversationId,
    isLoading,
    getConversationId,
    setConversationId,
  };
}
