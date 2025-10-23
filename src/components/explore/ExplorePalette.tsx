'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { uiBus } from '@/lib/uiBus';

type Option = {
  label: string;
  event: string;
};

const OPTIONS: Option[] = [
  { label: 'Focus', event: 'explore:focus' },
  { label: 'Calm', event: 'explore:calm' },
  { label: 'Create', event: 'explore:create' },
  { label: 'Plan', event: 'explore:plan' },
  { label: 'Reflect', event: 'explore:reflect' },
];

export function ExplorePalette() {
  const [isOpen, setIsOpen] = useState(false);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const container = typeof window !== 'undefined' ? document.body : null;

  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    const handleMode = () => setIsOpen(false);

    const unregister = [
      uiBus.on('explore:open', handleOpen),
      uiBus.on('explore:focus', handleMode),
      uiBus.on('explore:calm', handleMode),
      uiBus.on('explore:create', handleMode),
      uiBus.on('explore:plan', handleMode),
      uiBus.on('explore:reflect', handleMode),
    ];

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      unregister.forEach((off) => off());
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (!overlayRef.current) return;
      if (event.target instanceof Node && overlayRef.current.contains(event.target)) return;
      setIsOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  if (!container) return null;

  const content = (
    <AnimatePresence>
      {isOpen ? (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-end pb-[env(safe-area-inset-bottom)] pr-[env(safe-area-inset-right)]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div ref={overlayRef} className="pointer-events-none flex w-full justify-end">
            <motion.div
              className="pointer-events-auto m-4 w-72 max-w-[90vw] rounded-3xl border border-white/10 bg-bg/80 p-4 shadow-[0_24px_60px_-24px_rgba(15,23,42,0.45)] backdrop-blur-lg"
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
            >
              <header className="mb-3 flex items-center justify-between text-sm font-semibold text-fg/80">
                Explore modes
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="rounded-full border border-white/10 bg-bg/40 px-2 py-1 text-xs text-fg/70 transition hover:bg-bg/50 focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  ×
                </button>
              </header>
              <div className="flex flex-wrap gap-2">
                {OPTIONS.map((option) => (
                  <button
                    key={option.event}
                    type="button"
                    onClick={() => {
                      setIsOpen(false);
                      uiBus.emit(option.event);
                    }}
                    className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-bg/40 px-3 py-1.5 text-sm font-medium text-fg/80 transition hover:bg-bg/50 focus:outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );

  return createPortal(content, container);
}
