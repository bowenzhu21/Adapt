'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { EnsureConversation } from '@/components/EnsureConversation';
import { ChatInput } from '@/components/ChatInput';
import { DynamicSurface } from '@/components/registry';
import { useConversationId } from '@/hooks/useConversationId';
import { useUIState, UI_STATE_NOT_FOUND } from '@/hooks/useUIState';
import { applyTheme } from '@/theme/applyTheme';

const cardClass =
  'rounded-2xl border border-white/10 bg-bg/10 text-fg shadow-sm pad transition-all duration-[var(--motion-duration)]';

const cardVariants = {
  hidden: { opacity: 0, y: 12, scale: 0.98 },
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

    const handleTheme = (_event: Event) => compute();
    const handleUpdate = (_event: Event) => compute();
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
  const duration = useMotionDurationSeconds();

  if (isLoading) {
    return (
      <main className="max-w-2xl mx-auto flex flex-col gap-6 py-8 px-4 sm:px-0 transition-colors duration-[var(--motion-duration)]">
        <motion.section
          className={`${cardClass} animate-pulse`}
          initial="hidden"
          animate="visible"
          variants={cardVariants}
          transition={{ duration, ease: 'easeOut' }}
        >
          <div className="h-5 w-32 rounded bg-white/10" />
        </motion.section>
        <motion.section
          className={`${cardClass} animate-pulse`}
          initial="hidden"
          animate="visible"
          variants={cardVariants}
          transition={{ duration: Math.max(duration, 0.35), ease: 'easeOut' }}
        >
          <div className="h-48 rounded bg-white/5" />
        </motion.section>
        <motion.section
          className={`${cardClass} animate-pulse`}
          initial="hidden"
          animate="visible"
          variants={cardVariants}
          transition={{ duration: Math.max(duration, 0.35), ease: 'easeOut' }}
        >
          <div className="h-24 rounded bg-white/5" />
        </motion.section>
      </main>
    );
  }

  if (!conversationId) {
    return (
      <main className="max-w-2xl mx-auto flex flex-col gap-6 py-8 px-4 sm:px-0 transition-colors duration-[var(--motion-duration)]">
        <motion.section
          className={cardClass}
          initial="hidden"
          animate="visible"
          variants={cardVariants}
          transition={{ duration, ease: 'easeOut' }}
        >
          <h1 className="text-2xl font-semibold tracking-tight text-fg">Welcome</h1>
          <p className="text-sm leading-relaxed text-fg/80">
            Setting up your adaptive space…
          </p>
        </motion.section>
        <motion.section
          className={cardClass}
          initial="hidden"
          animate="visible"
          variants={cardVariants}
          transition={{ duration: Math.max(duration, 0.35), ease: 'easeOut' }}
        >
          <EnsureConversation onReady={setConversationId} />
        </motion.section>
      </main>
    );
  }

  return <ConversationSection conversationId={conversationId} cardDuration={duration} />;
}

type ConversationSectionProps = {
  conversationId: string;
  cardDuration: number;
};

function ConversationSection({ conversationId, cardDuration }: ConversationSectionProps) {
  const { theme, components, loading, error } = useUIState(conversationId);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const shortenedId = useMemo(() => {
    return conversationId.length > 12
      ? `${conversationId.slice(0, 6)}…${conversationId.slice(-4)}`
      : conversationId;
  }, [conversationId]);

  return (
    <main className="max-w-2xl mx-auto flex flex-col gap-6 py-8 px-4 sm:px-0 transition-colors duration-[var(--motion-duration)]">
      <motion.section
        className={`${cardClass} flex flex-col gap-3`}
        initial="hidden"
        animate="visible"
        variants={cardVariants}
        transition={{ duration: cardDuration, ease: 'easeOut' }}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-fg">Conversation ready</h1>
            <p className="text-xs uppercase tracking-wide text-fg/60">
              ID <span className="font-mono text-fg/70">{shortenedId}</span>
            </p>
          </div>
          <Link
            href="/logout"
            className="inline-flex items-center justify-center rounded-md border border-white/15 bg-bg/40 px-3 py-1.5 text-xs font-semibold text-fg transition hover:bg-bg/30 focus:outline-none focus:ring-2 focus:ring-primary/40"
            style={{ transitionDuration: 'var(--motion-duration)' }}
          >
            Sign out
          </Link>
        </div>
      </motion.section>

      <motion.section
        className={`${cardClass} flex flex-col gap-4`}
        initial="hidden"
        animate="visible"
        variants={cardVariants}
        transition={{ duration: Math.max(cardDuration, 0.35), ease: 'easeOut' }}
        aria-live="polite"
      >
        <header className="flex flex-col gap-1">
          <h2 className="text-sm font-semibold uppercase tracking-[0.3em] text-fg/60">
            UI State
          </h2>
          <p className="text-sm text-fg/70">
            Components adapt to your intent. Refreshes in real time.
          </p>
        </header>
        {loading ? (
          <p className="text-sm text-fg/70">Calibrating the space…</p>
        ) : error && error !== UI_STATE_NOT_FOUND ? (
          <p className="text-sm text-red-400">Unable to load UI state: {error}</p>
        ) : error === UI_STATE_NOT_FOUND ? (
          <p className="text-sm text-fg/70">No ui_state yet — start by sharing what you need.</p>
        ) : (
          <DynamicSurface components={components} />
        )}
      </motion.section>

      <motion.section
        className={cardClass}
        initial="hidden"
        animate="visible"
        variants={cardVariants}
        transition={{ duration: Math.max(cardDuration, 0.35), ease: 'easeOut' }}
      >
        <ChatInput conversationId={conversationId} />
      </motion.section>
    </main>
  );
}
