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
      const listeners = this.listeners.get(event);
      if (!listeners) return;
      listeners.delete(fn);
      if (listeners.size === 0) {
        this.listeners.delete(event);
      }
    };
  }

  emit(event: string, payload?: unknown): void {
    const listeners = this.listeners.get(event);
    if (!listeners) return;
    for (const fn of Array.from(listeners)) {
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
  if (value === null || value === undefined) return null;

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

    if (trimmed.includes('hour')) return numeric * 3600;
    if (trimmed.includes('min') || trimmed.includes(' m') || trimmed.endsWith('m')) return numeric * 60;
    if (trimmed.includes('sec') || trimmed.includes(' s') || trimmed.endsWith('s')) return numeric;

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
    const seconds = parseSeconds(candidate.value, { treatAsMinutes: candidate.treatAsMinutes });
    if (seconds !== null && seconds > 0) {
      if (
        candidate.source !== 'seconds' &&
        !candidate.treatAsMinutes &&
        ((typeof candidate.value === 'number' && candidate.value > 0 && candidate.value <= 10) ||
          (typeof candidate.value === 'string' && isUnitlessString(candidate.value) && seconds <= 10))
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

export function DynamicSurface({ components }: DynamicSurfaceProps) {
  const duration = useMotionDurationSeconds();
  const transition = useMemo(
    () => ({
      duration: Math.max(duration, 0.25),
      ease: 'easeOut' as const,
    }),
    [duration],
  );

  if (!Array.isArray(components) || components.length === 0) {
    return (
      <div className="backdrop-blur-md rounded-2xl border border-white/10 bg-bg/25 px-4 py-6 text-sm text-fg/70 shadow-[0_18px_48px_-24px_rgba(15,23,42,0.35)]">
        No components yet — invite Adapt to shape the space.
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
              initial={{ opacity: 0, y: 14, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -14, scale: 0.97 }}
              transition={transition}
              className="backdrop-blur-md rounded-2xl border border-white/10 bg-bg/30 text-fg pad shadow-[0_18px_48px_-24px_rgba(15,23,42,0.4)] transition-all duration-[var(--motion-duration)]"
            >
              {Component ? (
                <Component {...normalizedProps} />
              ) : (
                <TextBlock content="…" />
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
      <h2 className="text-lg font-semibold tracking-tight text-fg">Orientation</h2>
      <p className="text-sm leading-relaxed text-fg/80">
        A space to define the vibe. Describe how you want this environment to feel.
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
    <header className="space-y-3">
      <h1 className="text-3xl font-semibold tracking-tight text-fg sm:text-4xl">{title}</h1>
      {subtitle ? <p className="text-sm leading-[1.65] text-fg/75">{subtitle}</p> : null}
    </header>
  );
}

type TextBlockProps = {
  content?: string;
};

function TextBlock({ content = '...' }: TextBlockProps) {
  return <p className="text-base leading-[1.6] text-fg/90 sm:text-lg">{content}</p>;
}

type JournalPadProps = {
  title?: string;
  placeholder?: string;
};

function JournalPad({ title = 'Journal', placeholder = 'Let the thoughts flow…' }: JournalPadProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const autoResize = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
  };

  useEffect(() => {
    autoResize();
  }, []);

  return (
    <div className="flex flex-col gap-3">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold tracking-tight text-fg">{title}</h2>
        <p className="text-xs uppercase tracking-[0.3em] text-fg/50">Private to you</p>
      </div>
      <textarea
        ref={textareaRef}
        rows={4}
        placeholder={placeholder}
        spellCheck={false}
        onChange={() => {
          autoResize();
        }}
        onInput={autoResize}
        className="min-h-[120px] w-full resize-none rounded-2xl border border-white/10 bg-bg/35 px-4 py-3 text-sm leading-relaxed text-fg shadow-inner transition placeholder:text-fg/40 focus:border-accent/70 focus:outline-none focus:ring-2 focus:ring-accent/30"
      />
      <div className="flex items-center justify-end gap-2 text-xs text-fg/50">
        <span>Autosaves automatically</span>
      </div>
    </div>
  );
}

type TodoListProps = {
  title?: string;
  items?: string[];
};

function TodoList({
  title = 'Focus Points',
  items = ['Outline the next steps', 'Revisit assumptions', 'Commit to a next action'],
}: TodoListProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold tracking-tight text-fg">{title}</h2>
        <p className="text-xs uppercase tracking-[0.3em] text-fg/50">Lightweight checklist</p>
      </div>
      <ul className="space-y-2">
        {items.map((item, index) => (
          <motion.li
            key={`${item}-${index}`}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.35, delay: index * 0.05, ease: 'easeOut' }}
            className="flex items-center gap-3 rounded-xl border border-white/10 bg-bg/35 px-3 py-2 text-sm text-fg/85"
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-full border border-white/20 bg-transparent">
              <span className="h-2.5 w-2.5 rounded-full bg-primary/70" />
            </span>
            <span>{item}</span>
          </motion.li>
        ))}
      </ul>
    </div>
  );
}

type BreathingGuideProps = {
  pattern?: '4-4-4' | '4-7-8';
};

function BreathingGuide({ pattern = '4-4-4' }: BreathingGuideProps) {
  const totalDuration = pattern === '4-7-8' ? 20 : 14;
  const guidance =
    pattern === '4-7-8' ? 'Inhale 4 • Hold 7 • Exhale 8' : 'Steady rhythm • Inhale • Hold • Exhale';

  return (
    <div className="flex flex-col items-center gap-5 text-center">
      <motion.div
        className="relative flex h-32 w-32 items-center justify-center rounded-full border border-white/15 bg-primary/15"
        animate={{ scale: [0.85, 1.12, 0.9] }}
        transition={{ duration: totalDuration, repeat: Infinity, ease: 'easeInOut', times: [0, 0.5, 1] }}
      >
        <motion.div
          className="absolute inset-0 rounded-full bg-primary/20 blur-xl"
          animate={{ opacity: [0.4, 0.9, 0.4] }}
          transition={{ duration: totalDuration, repeat: Infinity, ease: 'easeInOut', times: [0, 0.5, 1] }}
        />
        <motion.div
          className="relative h-20 w-20 rounded-full bg-primary/60 shadow-[0_0_24px_rgba(168,85,247,0.45)]"
          animate={{ scale: [0.9, 1.1, 0.92] }}
          transition={{ duration: totalDuration, repeat: Infinity, ease: 'easeInOut', times: [0, 0.5, 1] }}
        />
      </motion.div>
      <p className="text-sm leading-relaxed text-fg/70">{guidance}</p>
    </div>
  );
}

type ActionButtonProps = {
  label?: string;
  href?: string;
  action?: 'noop' | 'logout' | 'timer:start' | 'timer:pause' | 'timer:reset';
};

function ActionButton({ label = 'Continue', href, action = 'noop' }: ActionButtonProps) {
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
    'inline-flex items-center justify-center rounded-full px-5 py-2 text-sm font-semibold text-white shadow-[0_18px_36px_-24px_rgba(15,23,42,0.45)] transition-transform duration-[var(--motion-duration)] hover:scale-[1.03] active:scale-[0.97] focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-60';
  const backgroundStyle = {
    background: 'linear-gradient(135deg, rgb(var(--primary) / 0.7), rgb(var(--accent) / 0.55))',
  };

  if (href) {
    return (
      <a
        href={href}
        className={commonClasses}
        style={backgroundStyle}
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
      style={backgroundStyle}
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

function Timer({ seconds = 1500, autostart, autoStart, state, start }: TimerProps) {
  const derivedAutoStart = useMemo(() => {
    if (typeof autostart === 'boolean') return autostart;
    if (typeof autoStart === 'boolean') return autoStart;
    if (state === 'running' || start === 'running') return true;
    return false;
  }, [autostart, autoStart, state, start]);

  const initialSeconds = Math.max(0, Number.isFinite(Number(seconds)) ? Number(seconds) : 1500);
  const initialRef = useRef(initialSeconds);
  const [left, setLeft] = useState(initialSeconds);
  const [running, setRunning] = useState<boolean>(derivedAutoStart);
  const leftRef = useRef(left);
  const duration = useMotionDurationSeconds();

  useEffect(() => {
    const nextSeconds = Math.max(0, Number.isFinite(Number(seconds)) ? Number(seconds) : 1500);
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

  const total = Math.max(initialRef.current, 1);
  const progress = total <= 0 ? 1 : 1 - left / total;
  const radius = 60;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="flex flex-col items-center gap-3" aria-live="polite">
      <div className="relative flex items-center justify-center">
        <svg className="h-40 w-40" viewBox="0 0 160 160">
          <circle
            className="text-fg/15"
            stroke="currentColor"
            strokeWidth="8"
            fill="transparent"
            cx="80"
            cy="80"
            r={radius}
          />
          <motion.circle
            stroke="rgb(var(--primary) / 0.9)"
            strokeLinecap="round"
            strokeWidth="8"
            fill="transparent"
            cx="80"
            cy="80"
            r={radius}
            style={{
              strokeDasharray: `${circumference} ${circumference}`,
              strokeDashoffset: circumference - circumference * progress,
            }}
            animate={{
              strokeDashoffset: circumference - circumference * progress,
            }}
            transition={{ duration: Math.max(duration, 0.25), ease: 'easeOut' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center rounded-full bg-fg/5 backdrop-blur-sm">
          <span className="text-3xl font-semibold text-fg">{formatted}</span>
        </div>
      </div>
      <p className="text-xs font-medium uppercase tracking-[0.3em] text-fg/60">
        {running ? 'RUNNING' : 'PAUSED'}
      </p>
    </div>
  );
}

type FooterNoteProps = {
  note?: string;
};

function FooterNote({ note = 'Made with calm.' }: FooterNoteProps) {
  return (
    <footer className="text-center text-xs uppercase tracking-[0.4em] text-fg/50">
      {note}
    </footer>
  );
}
