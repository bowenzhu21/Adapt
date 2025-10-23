'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Circle } from './Circle';
import { uiBus } from '@/lib/uiBus';

type BreathingPattern = '4-4-4' | '4-7-8' | '4-4-4-4';

export type BreathingCircleProps = {
  pattern?: BreathingPattern;
};

type Phase = {
  label: string;
  duration: number;
};

const PATTERN_MAP: Record<BreathingPattern, Phase[]> = {
  '4-4-4': [
    { label: 'Inhale', duration: 4 },
    { label: 'Hold', duration: 4 },
    { label: 'Exhale', duration: 4 },
  ],
  '4-7-8': [
    { label: 'Inhale', duration: 4 },
    { label: 'Hold', duration: 7 },
    { label: 'Exhale', duration: 8 },
  ],
  '4-4-4-4': [
    { label: 'Inhale', duration: 4 },
    { label: 'Hold', duration: 4 },
    { label: 'Exhale', duration: 4 },
    { label: 'Hold', duration: 4 },
  ],
};

export function BreathingCircle({ pattern = '4-4-4' }: BreathingCircleProps) {
  const [patternValue, setPatternValue] = useState<BreathingPattern>(pattern);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [running, setRunning] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  const phases = useMemo(() => PATTERN_MAP[patternValue], [patternValue]);
  const phase = phases[phaseIndex % phases.length];
  const nextPhase = phases[(phaseIndex + 1) % phases.length];

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const frame = window.requestAnimationFrame(() => {
      setPatternValue(pattern);
      setPhaseIndex(0);
      setRunning(false);
    });
    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [pattern]);

  useEffect(() => {
    if (!running) {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      return;
    }

    timeoutRef.current = window.setTimeout(() => {
      setPhaseIndex((index) => (index + 1) % phases.length);
    }, phase.duration * 1000);

    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [running, phase.duration, phases.length]);

  useEffect(() => {
    const unregister = [
      uiBus.on('breathing:start', () => setRunning(true)),
      uiBus.on('breathing:pause', () => setRunning(false)),
      uiBus.on('breathing:reset', () => {
        setRunning(false);
        setPhaseIndex(0);
      }),
      uiBus.on('breathing:setPattern', (payload) => {
        if (typeof payload !== 'string') return;
        if (payload.toLowerCase() === 'off') {
          setRunning(false);
          return;
        }
        if (isPattern(payload)) {
          setPatternValue(payload);
          setPhaseIndex(0);
          setRunning(true);
        }
      }),
    ];
    return () => {
      unregister.forEach((off) => off());
    };
  }, []);

  const setPattern = useCallback((next: BreathingPattern) => {
    setPatternValue(next);
    setPhaseIndex(0);
    setRunning(true);
  }, []);

  const cyclePattern = useCallback(() => {
    const keys: BreathingPattern[] = ['4-4-4', '4-7-8', '4-4-4-4'];
    const currentIndex = keys.indexOf(patternValue);
    const next = keys[(currentIndex + 1) % keys.length];
    setPattern(next);
  }, [patternValue, setPattern]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const targetTag = (event.target as HTMLElement | null)?.tagName;
      if (targetTag && ['INPUT', 'TEXTAREA', 'SELECT'].includes(targetTag)) {
        return;
      }
      if (event.key.toLowerCase() === 'b') {
        event.preventDefault();
        cyclePattern();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [cyclePattern]);

  const toggleRunning = () => {
    setRunning((prev) => !prev);
  };

  const handleReset = () => {
    setRunning(false);
    setPhaseIndex(0);
  };

  const menu = (close: () => void) => (
    <div className="flex flex-col gap-1">
      {(['4-4-4', '4-7-8', '4-4-4-4'] as BreathingPattern[]).map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => {
            setPattern(option);
            close();
          }}
          className="rounded-lg px-2 py-1 text-left text-sm text-fg/80 transition hover:bg-bg/40 focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          {patternLabel(option)}
        </button>
      ))}
      <button
        type="button"
        onClick={() => {
          setRunning(false);
          close();
        }}
        className="rounded-lg px-2 py-1 text-left text-sm text-fg/80 transition hover:bg-bg/40 focus:outline-none focus:ring-2 focus:ring-primary/30"
      >
        Off
      </button>
    </div>
  );

  const phaseText = `${phase.label}${phase.label === 'Hold' ? ` · ${phase.duration}s` : ''}`;
  const nextPhaseText = `Next: ${nextPhase.label}`;

  return (
    <Circle
      title="Breathing"
      sublabel={running ? 'Running' : 'Paused'}
      description={nextPhaseText}
      interactive
      isRunning={running}
      onToggle={toggleRunning}
      onReset={handleReset}
      menu={menu}
      ariaLabel="Breathing control"
    >
      <motion.div
        className="relative flex h-32 w-32 items-center justify-center rounded-full bg-primary/20"
        animate={{
          scale:
            phase.label === 'Inhale'
              ? [0.9, 1.1]
              : phase.label === 'Exhale'
                ? [1.1, 0.9]
                : [1, 1],
          opacity: [0.8, 1],
        }}
        transition={{ duration: Math.max(phase.duration, 1), ease: 'easeInOut', repeat: running ? Infinity : 0, repeatType: 'mirror' }}
      >
        <motion.span
          key={phaseText}
          className="text-lg font-semibold text-fg"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          aria-live="polite"
        >
          {phaseText}
        </motion.span>
      </motion.div>
    </Circle>
  );
}

function patternLabel(pattern: BreathingPattern) {
  switch (pattern) {
    case '4-4-4':
      return 'Calm (4-4-4)';
    case '4-7-8':
      return 'Rest (4-7-8)';
    case '4-4-4-4':
      return 'Box (4-4-4-4)';
    default:
      return pattern;
  }
}

function isPattern(value: unknown): value is BreathingPattern {
  return value === '4-4-4' || value === '4-7-8' || value === '4-4-4-4';
}
