'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase/client';

type Subscriber = (payload?: unknown) => void;

export type Bus = {
  on(event: string, fn: Subscriber): () => void;
  emit(event: string, payload?: unknown): void;
};

class SimpleBus implements Bus {
  private listeners = new Map<string, Set<Subscriber>>();

  on(event: string, fn: Subscriber): () => void {
    const set = this.listeners.get(event) ?? new Set<Subscriber>();
    set.add(fn);
    this.listeners.set(event, set);

    return () => {
      const current = this.listeners.get(event);
      if (!current) return;
      current.delete(fn);
      if (current.size === 0) {
        this.listeners.delete(event);
      }
    };
  }

  emit(event: string, payload?: unknown) {
    const set = this.listeners.get(event);
    if (!set) return;
    for (const fn of Array.from(set)) {
      try {
        fn(payload);
      } catch (error) {
        console.error(`uiBus listener for "${event}" failed`, error);
      }
    }
  }
}

export const uiBus = new SimpleBus();

type ComponentEntry = {
  type: string;
  props?: Record<string, any>;
};

type DynamicSurfaceProps = {
  components: ComponentEntry[];
};

type RegistryKey =
  | 'chat'
  | 'journal'
  | 'todo'
  | 'breathing'
  | 'header'
  | 'text'
  | 'button'
  | 'timer'
  | 'footer';

export const registry: Record<RegistryKey, (props?: any) => JSX.Element> = {
  chat: ChatPanel,
  journal: JournalPad,
  todo: TodoList,
  breathing: BreathingGuide,
  header: Header,
  text: TextBlock,
  button: ActionButton,
  timer: Timer,
  footer: FooterNote,
};

const TYPE_ALIASES: Record<string, RegistryKey> = {
  title: 'header',
  heading: 'header',
  paragraph: 'text',
  copy: 'text',
  cta: 'button',
  button: 'button',
  countdown: 'timer',
  timer: 'timer',
  footer: 'footer',
};

function isUnitlessString(value: string) {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return true;
  return (
    !trimmed.includes(':') &&
    !trimmed.includes('hour') &&
    !trimmed.includes('hr') &&
    !trimmed.includes('min') &&
    !trimmed.includes('sec') &&
    !trimmed.endsWith('m') &&
    !trimmed.endsWith('s')
  );
}

function parseSeconds(value: unknown, opts?: { treatAsMinutes?: boolean }): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return null;
    return opts?.treatAsMinutes ? value * 60 : value;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim().toLowerCase();
    if (!trimmed) return null;

    if (trimmed.includes(':')) {
      const [minutesPart, secondsPart] = trimmed.split(':');
      const minutesNum = Number.parseFloat(minutesPart);
      const secondsNum = Number.parseFloat(secondsPart ?? '0');
      if (Number.isFinite(minutesNum) && Number.isFinite(secondsNum)) {
        return minutesNum * 60 + secondsNum;
      }
    }

    const match = trimmed.match(/(\d+(\.\d+)?)/);
    if (!match) return null;
    const numeric = Number.parseFloat(match[1]);
    if (!Number.isFinite(numeric)) return null;

    if (opts?.treatAsMinutes) {
      return numeric * 60;
    }

    if (trimmed.includes('hour')) {
      return numeric * 3600;
    }
    if (trimmed.includes('min') || trimmed.includes(' m') || trimmed.endsWith('m')) {
      return numeric * 60;
    }
    if (trimmed.includes('sec') || trimmed.includes(' s') || trimmed.endsWith('s')) {
      return numeric;
    }

    return numeric;
  }

  return null;
}

function resolveTimerSeconds(rawProps: Record<string, unknown>): number | null {
  const candidates: Array<{ value: unknown; treatAsMinutes?: boolean; source: string }> = [
    { source: 'seconds', value: rawProps.seconds },
    { source: 'duration', value: rawProps.duration },
    { source: 'value', value: rawProps.value },
    { source: 'time', value: rawProps.time },
    { source: 'length', value: rawProps.length },
    { source: 'minutes', value: rawProps.minutes, treatAsMinutes: true },
  ];

  for (const candidate of candidates) {
    const seconds = parseSeconds(candidate.value, {
      treatAsMinutes: candidate.treatAsMinutes,
    });
    if (seconds !== null && seconds > 0) {
      if (
        candidate.source !== 'seconds' &&
        !candidate.treatAsMinutes &&
        ((typeof candidate.value === 'number' && candidate.value > 0 && candidate.value <= 10) ||
          (typeof candidate.value === 'string' &&
            isUnitlessString(candidate.value) &&
            seconds <= 10))
      ) {
        return Math.round(
          typeof candidate.value === 'number'
            ? candidate.value * 60
            : Number.isFinite(seconds) && seconds <= 10
              ? seconds * 60
              : seconds,
        );
      }
      return Math.round(seconds);
    }
  }

  if (typeof rawProps.pattern === 'string' && rawProps.pattern.includes('-')) {
    const pieces = rawProps.pattern
      .split('-')
      .map((segment) => Number.parseFloat(segment))
      .filter((segment) => Number.isFinite(segment));
    if (pieces.length > 0) {
      return Math.round(pieces.reduce((sum, part) => sum + part, 0) * 4);
    }
  }

  return null;
}

export function normalizeComponent(entry: ComponentEntry): ComponentEntry {
  const rawType = entry.type?.toLowerCase?.().trim() ?? '';
  const normalizedType = (TYPE_ALIASES[rawType] ?? rawType) as string;
  const props = { ...(entry.props ?? {}) };

  if (normalizedType === 'timer') {
    const seconds = resolveTimerSeconds(props);
    if (seconds !== null && seconds > 0) {
      props.seconds = seconds;
    } else if (props.seconds == null) {
      props.seconds = 1500;
    }
    delete props.minutes;
    delete props.duration;
    delete props.value;
    delete props.time;
    delete props.length;
  }

  return {
    ...entry,
    type: normalizedType,
    props,
  };
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

export function DynamicSurface({ components }: DynamicSurfaceProps) {
  const duration = useMotionDurationSeconds();
  const transition = useMemo(
    () => ({
      duration: Math.max(duration, 0.2),
      ease: 'easeOut' as const,
    }),
    [duration],
  );

  if (!Array.isArray(components) || components.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-white/15 bg-bg/10 px-4 py-6 text-sm text-fg/80">
        No components to render yet.
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      <AnimatePresence mode="sync" initial={false}>
        {components.map((component, index) => {
          const normalized = normalizeComponent(component);
          const normalizedProps = normalized.props ?? {};
          const componentId =
            typeof normalizedProps.id === 'string' ? normalizedProps.id : undefined;
          const componentKey = componentId ?? `${normalized.type}-${index}`;
          const Component = registry[(normalized.type ?? '') as RegistryKey];

          return (
            <motion.div
              key={componentKey}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={transition}
              className="rounded-2xl border border-white/10 bg-bg/20 text-fg pad shadow-sm transition-all duration-[var(--motion-duration)]"
            >
              {Component ? (
                <Component {...normalizedProps} />
              ) : (
                <TextBlock content={`Unknown component: ${normalized.type || 'unspecified'}`} />
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

function ChatPanel() {
  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-lg font-semibold tracking-tight text-fg">Chat Surface</h2>
      <p className="text-sm leading-relaxed text-fg/80">
        A quiet space to share intentions, plans, or reflections.
      </p>
    </div>
  );
}

type JournalPadProps = {
  title?: string;
  placeholder?: string;
};

function JournalPad({
  title = 'Daily reflections',
  placeholder = 'Start writing…',
}: JournalPadProps) {
  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold tracking-tight text-fg">{title}</h2>
      <textarea
        rows={6}
        placeholder={placeholder}
        className="w-full rounded-md border border-white/10 bg-bg/40 px-3 py-2 text-sm text-fg shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
        aria-label={title}
      />
      <button
        type="button"
        className="self-end inline-flex items-center gap-2 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-white transition hover:opacity-90"
        disabled
        aria-disabled="true"
      >
        Save
      </button>
    </div>
  );
}

type TodoListProps = {
  title?: string;
  items?: string[];
};

function TodoList({
  title = 'Tasks',
  items = ['Plan the flow', 'Draft layout ideas', 'Review moodboard'],
}: TodoListProps) {
  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold tracking-tight text-fg">{title}</h2>
      <ul className="space-y-2" aria-label={title}>
        {items.map((item, index) => (
          <li
            key={`${item}-${index}`}
            className="flex items-center gap-3 rounded-md border border-white/10 bg-bg/30 px-3 py-2 text-sm text-fg/85"
          >
            <span className="inline-flex h-2 w-2 rounded-full bg-primary/70" aria-hidden="true" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

type BreathingGuideProps = {
  pattern?: '4-4-4' | '4-7-8';
};

function BreathingGuide({ pattern = '4-4-4' }: BreathingGuideProps) {
  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <div className="flex h-28 w-28 items-center justify-center rounded-full border border-primary/30 bg-primary/10">
        <div
          className="h-20 w-20 rounded-full bg-primary/60"
          style={{ animation: 'breath 8s ease-in-out infinite' }}
          aria-hidden="true"
        />
      </div>
      <p className="text-sm leading-relaxed text-fg/75">
        Follow the {pattern} cadence to soften your breath.
      </p>
    </div>
  );
}

type HeaderProps = {
  title?: string;
  subtitle?: string;
};

function Header({ title = 'Welcome', subtitle }: HeaderProps) {
  return (
    <header className="space-y-2">
      <h1 className="text-2xl font-semibold tracking-tight text-fg">{title}</h1>
      {subtitle ? <p className="text-sm leading-relaxed text-fg/70">{subtitle}</p> : null}
    </header>
  );
}

type TextBlockProps = {
  content?: string;
};

function TextBlock({ content = '...' }: TextBlockProps) {
  return <p className="text-base leading-relaxed text-fg/80">{content}</p>;
}

type ActionButtonProps = {
  label?: string;
  href?: string;
  action?: 'noop' | 'logout' | 'timer:start' | 'timer:pause' | 'timer:reset';
};

function ActionButton({ label = 'Click me', href, action = 'noop' }: ActionButtonProps) {
  async function handleClick() {
    switch (action) {
      case 'logout': {
        await supabase.auth.signOut();
        window.location.assign('/login');
        break;
      }
      case 'timer:start':
      case 'timer:pause':
      case 'timer:reset': {
        uiBus.emit(action);
        break;
      }
      default:
        break;
    }
  }

  const isNoop = action === 'noop' && !href;
  const commonClasses =
    'inline-flex items-center justify-center rounded-md border border-primary/40 bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-60';

  if (href) {
    return (
      <a
        href={href}
        className={commonClasses}
        style={{ transitionDuration: 'var(--motion-duration)' }}
        aria-label={label}
      >
        {label}
      </a>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isNoop}
      className={commonClasses}
      style={{ transitionDuration: 'var(--motion-duration)' }}
      aria-label={label}
    >
      {label}
    </button>
  );
}

type TimerProps = {
  seconds?: number;
  autostart?: boolean;
  autoStart?: boolean;
  state?: 'running' | 'paused';
  start?: 'running' | 'paused';
};

function Timer({
  seconds = 1500,
  autostart,
  autoStart,
  state,
  start,
}: TimerProps) {
  const derivedAutoStart = useMemo(() => {
    if (typeof autostart === 'boolean') return autostart;
    if (typeof autoStart === 'boolean') return autoStart;
    if (state === 'running' || start === 'running') return true;
    return false;
  }, [autostart, autoStart, state, start]);

  const numericSeconds = Number(seconds);
  const initialSeconds = Number.isFinite(numericSeconds) ? Math.max(0, numericSeconds) : 1500;
  const initialRef = useRef(initialSeconds);
  const [left, setLeft] = useState(initialSeconds);
  const [running, setRunning] = useState<boolean>(derivedAutoStart);
  const leftRef = useRef(left);

  useEffect(() => {
    const nextSeconds = Math.max(0, seconds ?? 1500);
    initialRef.current = nextSeconds;
    setLeft(nextSeconds);
    setRunning(derivedAutoStart);
  }, [seconds, derivedAutoStart]);

  useEffect(() => {
    leftRef.current = left;
  }, [left]);

  useEffect(() => {
    const pause = uiBus.on('timer:pause', () => setRunning(false));
    const startListener = uiBus.on('timer:start', () => {
      if (leftRef.current === 0) {
        setLeft(initialRef.current);
      }
      setRunning(true);
    });
    const reset = uiBus.on('timer:reset', () => {
      setLeft(initialRef.current);
      setRunning(false);
    });

    return () => {
      pause();
      startListener();
      reset();
    };
  }, []);

  useEffect(() => {
    if (!running) return;

    const id = window.setInterval(() => {
      setLeft((value) => {
        if (value <= 1) {
          window.clearInterval(id);
          setRunning(false);
          return 0;
        }
        return value - 1;
      });
    }, 1000);

    return () => {
      window.clearInterval(id);
    };
  }, [running]);

  const formatted = useMemo(() => {
    const minutes = Math.floor(left / 60)
      .toString()
      .padStart(2, '0');
    const secs = (left % 60).toString().padStart(2, '0');
    return `${minutes}:${secs}`;
  }, [left]);

  return (
    <div className="flex flex-col gap-2" aria-live="polite">
      <div className="text-3xl font-semibold text-fg" aria-label="Time remaining">
        {formatted}
      </div>
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-fg/60">
        {running ? 'RUNNING' : 'PAUSED'}
      </p>
    </div>
  );
}

type FooterNoteProps = {
  note?: string;
};

function FooterNote({ note = 'Made with openness and calm.' }: FooterNoteProps) {
  return <footer className="text-xs uppercase tracking-wide text-fg/60">{note}</footer>;
}
