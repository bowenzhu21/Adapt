'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Circle } from './Circle';
import { uiBus } from '@/lib/uiBus';

type TimerCircleProps = {
  seconds?: number;
};

const PRESET_DURATIONS: Array<{ label: string; seconds: number }> = [
  { label: '5 min', seconds: 300 },
  { label: '10 min', seconds: 600 },
  { label: '15 min', seconds: 900 },
  { label: '25 min', seconds: 1500 },
];

export function TimerCircle({ seconds = 1500 }: TimerCircleProps) {
  const initialSeconds = Math.max(5, Math.floor(seconds));
  const [totalSeconds, setTotalSeconds] = useState(initialSeconds);
  const [left, setLeft] = useState(initialSeconds);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef<number | null>(null);

  const formatted = useMemo(() => formatSeconds(left), [left]);
  const progress = totalSeconds > 0 ? Math.min(Math.max(1 - left / totalSeconds, 0), 1) : 0;

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const frame = window.requestAnimationFrame(() => {
      setTotalSeconds(initialSeconds);
      setLeft(initialSeconds);
      setRunning(false);
    });
    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [initialSeconds]);

  useEffect(() => {
    if (!running) {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = window.setInterval(() => {
      setLeft((prev) => {
        if (prev <= 1) {
          setRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [running]);

  const setNewDuration = useCallback((secondsValue: number) => {
    const sanitized = Math.max(5, Math.floor(secondsValue));
    setTotalSeconds(sanitized);
    setLeft(sanitized);
    setRunning(false);
  }, []);

  const handleReset = useCallback(() => {
    setRunning(false);
    setLeft(totalSeconds);
  }, [totalSeconds]);

  const handleStart = useCallback(() => {
    setLeft((current) => (current <= 0 ? totalSeconds : current));
    setRunning(true);
  }, [totalSeconds]);

  const handlePause = useCallback(() => {
    setRunning(false);
  }, []);

  const toggleRunning = useCallback(() => {
    setLeft((current) => (current <= 0 ? totalSeconds : current));
    setRunning((prev) => !prev);
  }, [totalSeconds]);

  useEffect(() => {
    const unregister = [
      uiBus.on('timer:start', handleStart),
      uiBus.on('timer:pause', handlePause),
      uiBus.on('timer:reset', handleReset),
      uiBus.on('timer:set', (payload) => {
        if (typeof payload === 'number' && payload > 0) {
          setNewDuration(payload);
        }
      }),
    ];

    return () => {
      unregister.forEach((off) => off());
    };
  }, [handleStart, handlePause, handleReset, setNewDuration]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const targetTag = (event.target as HTMLElement | null)?.tagName;
      if (targetTag && ['INPUT', 'TEXTAREA', 'SELECT'].includes(targetTag)) {
        return;
      }
      switch (event.key.toLowerCase()) {
        case ' ':
        case 'spacebar':
          event.preventDefault();
          toggleRunning();
          break;
        case 'r':
          event.preventDefault();
          handleReset();
          break;
        case '1':
          setNewDuration(300);
          break;
        case '2':
          setNewDuration(600);
          break;
        case '3':
          setNewDuration(900);
          break;
        case '4':
          setNewDuration(1500);
          break;
        default:
          break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [toggleRunning, handleReset, setNewDuration]);

  const handleCustomDuration = () => {
    const minutes = window.prompt('Set timer minutes', '10');
    if (!minutes) return;
    const parsed = Number(minutes);
    if (!Number.isFinite(parsed) || parsed <= 0) return;
    setNewDuration(parsed * 60);
  };

  const menu = (close: () => void) => (
    <div className="flex flex-col gap-1">
      {PRESET_DURATIONS.map((preset) => (
        <button
          key={preset.seconds}
          type="button"
          onClick={() => {
            setNewDuration(preset.seconds);
            close();
          }}
          className="rounded-lg px-2 py-1 text-left text-sm text-fg/80 transition hover:bg-bg/40 focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          {preset.label}
        </button>
      ))}
      <button
        type="button"
        onClick={() => {
          handleCustomDuration();
          close();
        }}
        className="rounded-lg px-2 py-1 text-left text-sm text-fg/80 transition hover:bg-bg/40 focus:outline-none focus:ring-2 focus:ring-primary/30"
      >
        Custom…
      </button>
    </div>
  );

  return (
    <Circle
      title="Timer"
      label={formatted}
      sublabel={running ? 'Running' : 'Paused'}
      progress={progress}
      interactive
      isRunning={running}
      onToggle={toggleRunning}
      onReset={handleReset}
      menu={menu}
      ariaLabel="Timer control"
    />
  );
}

function formatSeconds(value: number) {
  const minutes = Math.floor(value / 60)
    .toString()
    .padStart(2, '0');
  const seconds = (value % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}
