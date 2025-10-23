'use client';

import { useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { DynamicSurface } from '@/components/registry';
import { useUIState, UI_STATE_NOT_FOUND } from '@/hooks/useUIState';
import { ExplorePalette } from '@/components/explore/ExplorePalette';
import { useExploreHandlers } from '@/components/explore/useExploreHandlers';
import { uiBus } from '@/lib/uiBus';

type AdaptiveSurfaceProps = {
  conversationId: string;
};

export function AdaptiveSurface({ conversationId }: AdaptiveSurfaceProps) {
  const { components, loading, error } = useUIState(conversationId);
  const exploreHandlers = useExploreHandlers(conversationId);

  useEffect(() => {
    const unregister = [
      uiBus.on('explore:focus', exploreHandlers.focus),
      uiBus.on('explore:calm', exploreHandlers.calm),
      uiBus.on('explore:create', exploreHandlers.create),
      uiBus.on('explore:plan', exploreHandlers.plan),
      uiBus.on('explore:reflect', exploreHandlers.reflect),
    ];

    return () => {
      unregister.forEach((off) => off());
    };
  }, [exploreHandlers.focus, exploreHandlers.calm, exploreHandlers.create, exploreHandlers.plan, exploreHandlers.reflect]);

  const surfaceState = useMemo(() => {
    if (loading) return 'loading';
    if (error && error !== UI_STATE_NOT_FOUND) return 'error';
    if (error === UI_STATE_NOT_FOUND || components.length === 0) return 'empty';
    return 'ready';
  }, [loading, error, components.length]);

  return (
    <>
      <ExplorePalette />
      <div className="relative mx-auto w-full max-w-4xl px-4 sm:px-6 md:px-8 py-8 md:py-12">
        <div className="space-y-6 md:space-y-8">
          <SurfaceIntro
            helper={
              surfaceState === 'empty'
                ? 'Describe how you want this space to feel and Adapt will shape it for you.'
                : 'Adjust the feeling of this space at any time — Adapt responds instantly.'
            }
          />
          {surfaceState === 'loading' ? (
            <LoadingState />
          ) : surfaceState === 'error' ? (
            <ErrorState message={error ?? 'Unable to load this space.'} />
          ) : surfaceState === 'empty' ? (
            <EmptyState />
          ) : (
            <DynamicSurface components={components} />
          )}
        </div>
      </div>
    </>
  );
}

function SurfaceIntro({ helper }: { helper: string }) {
  return (
    <div className="space-y-2">
      <p className="text-xs uppercase tracking-[0.2em] text-fg/60">Adaptive surface</p>
      <p className="text-sm leading-relaxed text-fg/70">{helper}</p>
    </div>
  );
}

function LoadingState() {
  return (
    <motion.div
      className="adapt-panel px-6 py-10 text-sm text-fg/70"
      initial={{ opacity: 0.5 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      Calibrating the space…
    </motion.div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="adapt-panel border border-red-200/30 bg-red-500/10 px-6 py-10 text-sm text-red-200">
      {message}
    </div>
  );
}

function EmptyState() {
  return (
    <motion.div
      className="adapt-panel px-6 py-12 text-center text-sm text-fg/70"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
    >
      Describe how you want this space to feel and Adapt will begin shaping it.
    </motion.div>
  );
}
