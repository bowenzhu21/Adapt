'use client';

import clsx from 'clsx';
import { AnimatePresence, motion } from 'framer-motion';
import { ReactNode, useState } from 'react';

export type CircleProps = {
  title: string;
  label?: string;
  sublabel?: string;
  description?: string;
  progress?: number | null;
  interactive?: boolean;
  isRunning?: boolean;
  onToggle?: () => void;
  onReset?: () => void;
  menu?: (close: () => void) => ReactNode;
  children?: ReactNode;
  ariaLabel?: string;
};

const RADIUS = 78;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function Circle({
  title,
  label,
  sublabel,
  description,
  progress,
  interactive = false,
  isRunning = false,
  onToggle,
  onReset,
  menu,
  children,
  ariaLabel,
}: CircleProps) {
  const [controlsVisible, setControlsVisible] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const normalizedProgress =
    typeof progress === 'number' ? Math.min(Math.max(progress, 0), 1) : null;

  const startPauseLabel = isRunning ? 'Pause' : 'Start';

  const handleToggle = () => {
    onToggle?.();
  };

  const handleCircleClick = () => {
    if (interactive) {
      setControlsVisible(true);
      onToggle?.();
    }
  };

  const handleReset = () => {
    onReset?.();
  };

  const toggleMenu = () => setMenuOpen((open) => !open);

  const closeMenu = () => setMenuOpen(false);

  return (
    <motion.div
      className="relative flex h-[260px] flex-col items-center justify-center rounded-2xl border border-white/10 bg-bg/30 px-6 py-6 text-center text-fg shadow-sm backdrop-blur-md sm:h-[320px] md:h-[380px]"
      onMouseEnter={() => interactive && setControlsVisible(true)}
      onMouseLeave={() => interactive && setControlsVisible(false)}
      onFocusCapture={() => interactive && setControlsVisible(true)}
      onBlurCapture={(event) => {
        if (!interactive) return;
        if (!event.currentTarget.contains(event.relatedTarget as Node)) {
          setControlsVisible(false);
        }
      }}
      initial={{ opacity: 0, y: 12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      <div className="absolute top-4 left-1/2 -translate-x-1/2 space-y-1 text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-fg/60">{title}</p>
        {description ? (
          <p className="text-xs text-fg/50">{description}</p>
        ) : null}
      </div>

      {interactive ? (
        <AnimatePresence>
          {(controlsVisible || menuOpen) && (
            <motion.div
              className="absolute right-4 top-4 flex items-center gap-2"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
            >
              <button
                type="button"
                onClick={handleToggle}
                className="rounded-full bg-primary/80 px-3 py-1 text-xs font-semibold text-white shadow focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                {startPauseLabel}
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="rounded-full border border-white/10 bg-bg/40 px-3 py-1 text-xs font-medium text-fg/70 transition hover:bg-bg/50 focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                Reset
              </button>
              {menu ? (
                <div className="relative">
                  <button
                    type="button"
                    onClick={toggleMenu}
                    aria-haspopup="menu"
                    aria-expanded={menuOpen}
                    className="rounded-full border border-white/10 bg-bg/40 px-2 py-1 text-xs text-fg/70 transition hover:bg-bg/50 focus:outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    ▼
                  </button>
                  <AnimatePresence>
                    {menuOpen ? (
                      <motion.div
                        className="absolute right-0 top-9 z-20 w-40 rounded-xl border border-white/10 bg-bg/40 p-2 text-left text-sm text-fg shadow-lg backdrop-blur-md"
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                      >
                        {menu(closeMenu)}
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </div>
              ) : null}
            </motion.div>
          )}
        </AnimatePresence>
      ) : null}

      <button
        type="button"
        onClick={interactive ? handleCircleClick : undefined}
        className={clsx(
          'relative flex h-40 w-40 items-center justify-center rounded-full focus:outline-none focus:ring-4 focus:ring-primary/30 sm:h-48 sm:w-48 md:h-56 md:w-56',
          interactive && 'cursor-pointer',
        )}
        aria-pressed={interactive ? isRunning : undefined}
        aria-label={ariaLabel ?? title}
      >
        {normalizedProgress !== null ? (
          <svg
            className="absolute inset-0"
            width="100%"
            height="100%"
            viewBox="0 0 200 200"
          >
            <circle
              cx="100"
              cy="100"
              r={RADIUS}
              stroke="rgb(var(--fg) / 0.2)"
              strokeWidth="10"
              fill="transparent"
            />
            <motion.circle
              cx="100"
              cy="100"
              r={RADIUS}
              stroke="rgb(var(--primary) / 0.9)"
              strokeWidth="10"
              strokeLinecap="round"
              fill="transparent"
              style={{
                strokeDasharray: `${CIRCUMFERENCE} ${CIRCUMFERENCE}`,
                strokeDashoffset: CIRCUMFERENCE - CIRCUMFERENCE * normalizedProgress,
              }}
              animate={{
                strokeDashoffset: CIRCUMFERENCE - CIRCUMFERENCE * normalizedProgress,
              }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            />
          </svg>
        ) : null}

        <div className="relative flex h-[80%] w-[80%] items-center justify-center rounded-full bg-bg/30 shadow-inner">
          {children}
          {!children ? (
            <div className="flex flex-col items-center gap-1 px-4">
              {label ? (
                <span className="text-2xl font-semibold text-fg" aria-live="polite">
                  {label}
                </span>
              ) : null}
              {sublabel ? (
                <span className="text-xs uppercase tracking-[0.3em] text-fg/60">{sublabel}</span>
              ) : null}
            </div>
          ) : null}
        </div>
      </button>

      {children ? (
        <div className="mt-3 flex flex-col items-center gap-1">
          {label ? <span className="text-xl font-semibold text-fg">{label}</span> : null}
          {sublabel ? (
            <span className="text-xs uppercase tracking-[0.3em] text-fg/60">{sublabel}</span>
          ) : null}
        </div>
      ) : null}
    </motion.div>
  );
}
