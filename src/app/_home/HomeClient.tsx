'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { EnsureConversation } from '@/components/EnsureConversation';
import { useConversationId } from '@/hooks/useConversationId';
import { AdaptiveSurface } from './AdaptiveSurface';
import { CornerActions } from './CornerActions';
import { ChatDock } from './ChatDock';

type UiSummary = {
  emotion: string | null;
  intent: string | null;
};

export default function HomeClient() {
  const { conversationId, isLoading, setConversationId } = useConversationId();
  const [uiSummary, setUiSummary] = useState<UiSummary>({ emotion: null, intent: null });
  const [isRealigning, setIsRealigning] = useState(false);
  const blurTimeoutRef = useRef<number | null>(null);
  const motionDuration = useMotionDurationSeconds();

  useEffect(() => {
    if (!conversationId) {
      if (typeof window === 'undefined') {
        return;
      }
      const frame = window.requestAnimationFrame(() => {
        setUiSummary({ emotion: null, intent: null });
      });
      return () => {
        window.cancelAnimationFrame(frame);
      };
    }

    let cancelled = false;

    async function hydrate() {
      try {
        const response = await fetch(
          `/api/ui-state?conversationId=${encodeURIComponent(conversationId)}`,
        );
        if (!response.ok) return;
        const data = await response.json();
        if (cancelled) return;
        setUiSummary({
          emotion: data?.theme?.emotion ?? null,
          intent: data?.theme?.intent ?? null,
        });
      } catch {
        // ignore hydration errors, realtime will update later
      }
    }

    hydrate();

    const handleUpdate = (event: Event) => {
      const detail = (event as CustomEvent<{
        conversationId: string;
        emotion?: string | null;
        intent?: string | null;
      } | null>).detail;
      if (!detail || detail.conversationId !== conversationId) return;
      setUiSummary((previous) => ({
        emotion: detail.emotion ?? previous.emotion ?? null,
        intent: detail.intent ?? previous.intent ?? null,
      }));
    };

    const handlePending = (event: Event) => {
      const detail = (event as CustomEvent<{ conversationId: string; active: boolean }>).detail;
      if (!detail || detail.conversationId !== conversationId) return;
      if (detail.active) {
        if (blurTimeoutRef.current) window.clearTimeout(blurTimeoutRef.current);
        setIsRealigning(true);
      } else {
        if (blurTimeoutRef.current) window.clearTimeout(blurTimeoutRef.current);
        blurTimeoutRef.current = window.setTimeout(() => {
          setIsRealigning(false);
        }, 800);
      }
    };

    window.addEventListener('ui-state:update', handleUpdate);
    window.addEventListener('ui-state:pending', handlePending);

    return () => {
      cancelled = true;
      window.removeEventListener('ui-state:update', handleUpdate);
      window.removeEventListener('ui-state:pending', handlePending);
      if (blurTimeoutRef.current) window.clearTimeout(blurTimeoutRef.current);
    };
  }, [conversationId]);

  const emotionLabel = useMemo(() => formatLabel(uiSummary.emotion), [uiSummary.emotion]);

  if (isLoading) {
    return (
      <main className="relative min-h-dvh flex flex-col items-center justify-center text-fg/70">
        <motion.div
          className="rounded-2xl border border-white/10 bg-bg/25 px-6 py-4 text-sm shadow-sm backdrop-blur-md"
          initial={{ opacity: 0.4, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        >
          Preparing your adaptive space…
        </motion.div>
      </main>
    );
  }

  if (!conversationId) {
    return (
      <main className="relative min-h-dvh flex flex-col items-center justify-center px-4 py-16 text-center text-fg">
        <div className="max-w-md space-y-6">
          <h1 className="text-3xl font-semibold tracking-tight">Welcome to Adapt</h1>
          <p className="text-sm leading-relaxed text-fg/70">
            We’re creating your adaptive space. Share how you need this moment to feel and Adapt will
            respond instantly.
          </p>
          <EnsureConversation onReady={setConversationId} />
        </div>
      </main>
    );
  }

  return (
    <>
      <CornerActions conversationId={conversationId} emotion={emotionLabel} intent={uiSummary.intent} />
      <main className="relative min-h-dvh flex flex-col">
        <header className="pointer-events-none h-12" />
        <motion.section
          className="flex-1"
          animate={{
            filter: isRealigning ? 'blur(8px)' : 'blur(0px)',
            opacity: isRealigning ? 0.65 : 1,
          }}
          transition={{ duration: Math.max(motionDuration, 0.3), ease: 'easeOut' }}
        >
          <AdaptiveSurface conversationId={conversationId} />
        </motion.section>
        <footer className="sticky bottom-0">
          <ChatDock
            conversationId={conversationId}
            emotion={uiSummary.emotion}
            motionDuration={motionDuration}
            isRealigning={isRealigning}
          />
        </footer>
      </main>
    </>
  );
}

function formatLabel(value: string | null) {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

function useMotionDurationSeconds() {
  const [duration, setDuration] = useState(0.3);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const compute = () => {
      const raw = getComputedStyle(document.documentElement)
        .getPropertyValue('--motion-duration')
        .trim();
      const parsed = Number.parseFloat(raw);
      setDuration(Number.isFinite(parsed) ? parsed / 1000 : 0.3);
    };

    compute();

    const handleTheme = () => compute();
    window.addEventListener('theme:changed', handleTheme);
    return () => {
      window.removeEventListener('theme:changed', handleTheme);
    };
  }, []);

  return duration;
}
