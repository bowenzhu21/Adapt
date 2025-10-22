'use client';

import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';
import { EnsureConversation } from '@/components/EnsureConversation';
import { ChatInput } from '@/components/ChatInput';
import { DynamicSurface } from '@/components/registry';
import { useConversationId } from '@/hooks/useConversationId';
import { useUIState, UI_STATE_NOT_FOUND } from '@/hooks/useUIState';
import { applyTheme } from '@/theme/applyTheme';

const glassCard =
  'backdrop-blur-md bg-bg/20 border border-white/10 rounded-2xl shadow-[0_18px_48px_-24px_rgba(15,23,42,0.45)] pad text-fg transition-all duration-[var(--motion-duration)]';

const emotionMeta: Record<string, string> = {
  focus: 'Focus',
  calm: 'Calm',
  curious: 'Curious',
  reflective: 'Reflective',
  energized: 'Energised',
  energizeduk: 'Energised',
  relaxed: 'Relaxed',
  creative: 'Creative',
};

const intentMeta: Record<string, string> = {
  chat: 'Conversation',
  focus: 'Focus',
  reflect: 'Reflect',
  plan: 'Plan',
  relax: 'Relax',
  create: 'Create',
};

const cardVariants = {
  hidden: { opacity: 0, y: 18, scale: 0.97 },
  visible: { opacity: 1, y: 0, scale: 1 },
};

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
    const handleUpdate = () => compute();

    window.addEventListener('theme:changed', handleTheme);
    window.addEventListener('ui-state:update', handleUpdate);

    return () => {
      window.removeEventListener('theme:changed', handleTheme);
      window.removeEventListener('ui-state:update', handleUpdate);
    };
  }, []);

  return duration;
}

export default function HomeClient() {
  const { conversationId, isLoading, setConversationId } = useConversationId();
  const motionDuration = useMotionDurationSeconds();

  if (isLoading) {
    return (
      <main className="max-w-2xl mx-auto flex flex-col gap-6 py-12 px-4 sm:px-0 transition-colors duration-[var(--motion-duration)]">
        {[180, 320, 200].map((height, index) => (
          <motion.section
            key={index}
            className={`${glassCard} animate-pulse`}
            initial="hidden"
            animate="visible"
            variants={cardVariants}
            transition={{ duration: motionDuration + index * 0.05, ease: 'easeOut' }}
            style={{ minHeight: height }}
          />
        ))}
      </main>
    );
  }

  if (!conversationId) {
    return (
      <main className="max-w-2xl mx-auto flex flex-col gap-6 py-12 px-4 sm:px-0 transition-colors duration-[var(--motion-duration)]">
        <motion.section
          className={glassCard}
          initial="hidden"
          animate="visible"
          variants={cardVariants}
          transition={{ duration: motionDuration, ease: 'easeOut' }}
        >
          <h1 className="text-3xl font-semibold tracking-tight text-fg">Welcome to Adapt</h1>
          <p className="text-sm leading-relaxed text-fg/75">
            We&apos;re creating your adaptive space. Tell Adapt how you need this moment to feel.
          </p>
        </motion.section>
        <motion.section
          className={glassCard}
          initial="hidden"
          animate="visible"
          variants={cardVariants}
          transition={{ duration: motionDuration + 0.05, ease: 'easeOut' }}
        >
          <EnsureConversation onReady={setConversationId} />
        </motion.section>
      </main>
    );
  }

  return <Workspace conversationId={conversationId} motionDuration={motionDuration} />;
}

type WorkspaceProps = {
  conversationId: string;
  motionDuration: number;
};

function Workspace({ conversationId, motionDuration }: WorkspaceProps) {
  const { theme, components, emotion, intent, loading, error } = useUIState(conversationId);
  const [isRealigning, setIsRealigning] = useState(false);
  const blurTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handler = (event: Event) => {
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

    window.addEventListener('ui-state:pending', handler);
    return () => {
      window.removeEventListener('ui-state:pending', handler);
      if (blurTimeoutRef.current) window.clearTimeout(blurTimeoutRef.current);
    };
  }, [conversationId]);

  const emotionKey = useMemo(
    () => (emotion ?? theme?.emotion ?? '').toLowerCase().trim(),
    [emotion, theme],
  );
  const displayEmotion = emotionMeta[emotionKey] ?? formatLabel(emotionKey) ?? 'Settled';

  const intentKey = useMemo(
    () => (intent ?? theme?.intent ?? '').toLowerCase().trim(),
    [intent, theme],
  );
  const displayIntent = intentMeta[intentKey] ?? formatLabel(intentKey);

  const motionTransition = useMemo(
    () => ({ duration: Math.max(motionDuration, 0.25), ease: 'easeOut' as const }),
    [motionDuration],
  );

  return (
    <>
      <TopBar conversationId={conversationId} emotionLabel={displayEmotion} intentLabel={displayIntent} />
      <main className="relative max-w-2xl mx-auto flex flex-col gap-6 py-28 pb-44 px-4 sm:px-0 transition-colors duration-[var(--motion-duration)]">
        <motion.div
          animate={{
            filter: isRealigning ? 'blur(8px)' : 'blur(0px)',
            opacity: isRealigning ? 0.65 : 1,
            scale: isRealigning ? 0.99 : 1,
          }}
          transition={motionTransition}
          className="flex flex-col gap-6"
        >
          <motion.section
            className={`${glassCard} flex flex-col gap-4`}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            transition={motionTransition}
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-1">
                <h1 className="text-lg font-semibold tracking-tight text-fg">Conversation ready</h1>
                <p className="text-xs uppercase tracking-[0.3em] text-fg/55">
                  ID <span className="font-mono text-fg/70">{formatConversationId(conversationId)}</span>
                </p>
              </div>
              <Link
                href="/logout"
                className="inline-flex items-center justify-center rounded-full border border-white/15 bg-bg/35 px-4 py-1.5 text-xs font-medium text-fg transition-transform duration-[var(--motion-duration)] hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                Sign out
              </Link>
            </div>
            {displayIntent ? (
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-bg/30 px-3 py-1 text-xs font-medium uppercase tracking-[0.3em] text-fg/60 w-max">
                Intent • {displayIntent}
              </div>
            ) : null}
          </motion.section>

          <motion.section
            className={`${glassCard} flex flex-col gap-4`}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            transition={{ ...motionTransition, delay: 0.05 }}
            aria-live="polite"
          >
            <header className="space-y-2">
              <h2 className="text-sm font-semibold uppercase tracking-[0.35em] text-fg/55">
                Adaptive surface
              </h2>
              <p className="text-sm leading-relaxed text-fg/70">
                Components shift with your intent. Adjust the space whenever you need to.
              </p>
            </header>

            {loading ? (
              <p className="text-sm text-fg/70">Calibrating the space…</p>
            ) : error && error !== UI_STATE_NOT_FOUND ? (
              <p className="text-sm text-red-300">Unable to load ui_state: {error}</p>
            ) : error === UI_STATE_NOT_FOUND ? (
              <p className="text-sm text-fg/70">
                No ui_state yet — describe how you&apos;d like this moment to feel.
              </p>
            ) : (
              <DynamicSurface components={components} />
            )}
          </motion.section>
        </motion.div>
      </main>

      <ChatDock
        conversationId={conversationId}
        emotion={emotionKey || undefined}
        motionDuration={motionDuration}
        isRealigning={isRealigning}
      />

      <ModeIndicator emotionLabel={displayEmotion} />

      <AnimatePresence>
        {isRealigning ? (
          <motion.div
            key="realigning"
            className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={motionTransition}
          >
          <div className="backdrop-blur-md rounded-full border border-white/15 bg-bg/30 px-5 py-2 text-sm font-medium text-fg/80 shadow-[0_24px_60px_-30px_rgba(15,23,42,0.5)]">
              Re-aligning space…
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}

type TopBarProps = {
  conversationId: string;
  emotionLabel: string;
  intentLabel: string | null;
};

function TopBar({ conversationId, emotionLabel, intentLabel }: TopBarProps) {
  return (
    <motion.nav
      className="pointer-events-none fixed top-6 left-1/2 z-40 flex w-full max-w-2xl -translate-x-1/2 px-4 sm:px-0"
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      <div className="pointer-events-auto flex w-full items-center justify-between rounded-full border border-white/10 bg-bg/25 px-4 py-3 text-xs font-medium uppercase tracking-[0.3em] text-fg/70 shadow-[0_18px_48px_-24px_rgba(15,23,42,0.35)] backdrop-blur-md">
        <span className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-primary/70 shadow-[0_0_12px_rgba(99,102,241,0.75)]" />
          Adapt Workspace
        </span>
        <span className="flex items-center gap-2 text-fg/60">
          {intentLabel ? <span>{intentLabel}</span> : null}
          <span className="hidden sm:inline text-fg/45">
            {formatConversationId(conversationId)}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-bg/30 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.3em] text-fg/65">
            {emotionLabel}
          </span>
        </span>
      </div>
    </motion.nav>
  );
}

type ChatDockProps = {
  conversationId: string;
  emotion?: string;
  motionDuration: number;
  isRealigning: boolean;
};

function ChatDock({ conversationId, emotion, motionDuration, isRealigning }: ChatDockProps) {
  return (
    <motion.aside
      className="pointer-events-none fixed bottom-6 left-1/2 z-40 flex w-full max-w-2xl -translate-x-1/2 px-4 sm:px-0"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: Math.max(motionDuration, 0.3), ease: 'easeOut' }}
    >
      <motion.div
        animate={{
          filter: isRealigning ? 'blur(6px)' : 'blur(0px)',
          opacity: isRealigning ? 0.7 : 1,
        }}
        transition={{ duration: Math.max(motionDuration, 0.25), ease: 'easeOut' }}
        className="pointer-events-auto w-full rounded-[32px] border border-white/10 bg-bg/25 pad pt-6 pb-6 shadow-[0_20px_50px_-28px_rgba(15,23,42,0.45)] backdrop-blur-xl"
      >
        <ChatInput conversationId={conversationId} emotion={emotion} />
      </motion.div>
    </motion.aside>
  );
}

function ModeIndicator({ emotionLabel }: { emotionLabel: string }) {
  if (!emotionLabel) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="mode-indicator"
        className="pointer-events-none fixed bottom-36 left-1/2 z-30 flex w-full max-w-2xl -translate-x-1/2 justify-center px-4 sm:bottom-6 sm:left-6 sm:w-auto sm:max-w-none sm:translate-x-0 sm:px-0 sm:justify-start"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 16 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
      >
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-bg/25 px-4 py-1.5 text-xs font-medium uppercase tracking-[0.35em] text-fg/70 shadow-[0_16px_40px_-26px_rgba(15,23,42,0.35)] backdrop-blur-md">
          <span className="h-2 w-2 rounded-full bg-primary/70 shadow-[0_0_10px_rgba(99,102,241,0.7)]" />
          {emotionLabel}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

function formatConversationId(id: string) {
  if (id.length <= 12) return id;
  return `${id.slice(0, 4)}…${id.slice(-4)}`;
}

function formatLabel(value: string | null | undefined) {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}
