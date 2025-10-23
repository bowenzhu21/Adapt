'use client';

import Image from 'next/image';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useRef, useState, type ReactElement } from 'react';
import { TimerCircle } from '@/components/widgets/TimerCircle';
import { BreathingCircle, type BreathingCircleProps } from '@/components/widgets/BreathingCircle';
import { PlannerWizard } from '@/components/planner/PlannerWizard';
import { uiBus } from '@/lib/uiBus';
import { normalizeType } from '@/lib/lc/componentsMap';
import { Checklist as ChecklistBlock, type ChecklistProps } from '@/components/blocks/Checklist';
import { ProgressBar, type ProgressBarProps } from '@/components/blocks/ProgressBar';
import { Soundscape, type SoundscapeProps } from '@/components/blocks/Soundscape';
import { DayGrid, type DayGridProps } from '@/components/blocks/DayGrid';
import { MicroKanban, type MicroKanbanProps } from '@/components/blocks/MicroKanban';
import { Affirmation as AffirmationBlock, type AffirmationProps } from '@/components/blocks/Affirmation';
import { Quote as QuoteBlock, type QuoteProps } from '@/components/blocks/Quote';

type ComponentProps = Record<string, unknown>;

type ComponentEntry = {
  type: string;
  props?: ComponentProps;
};

type DynamicSurfaceProps = {
  components: ComponentEntry[];
};

type RegistryComponent = (props?: ComponentProps) => ReactElement | null;

export const registry: Partial<Record<string, RegistryComponent>> = {
  journal: (props) => <JournalPad {...(props as JournalPadProps)} />,
  todo: (props) => <TodoList {...(props as TodoListProps)} />,
  breathing: (props) => <BreathingCircle {...(props as BreathingCircleProps)} />,
  visualbreathing: (props) => <BreathingCircle {...(props as BreathingCircleProps)} />,
  header: (props) => <Header {...(props as HeaderProps)} />,
  text: (props) => <TextBlock {...(props as TextBlockProps)} />,
  button: (props) => <ActionButton {...(props as ActionButtonProps)} />,
  timer: (props) => <TimerCircle {...(props as Record<string, unknown>)} />,
  moodgradient: (props) => <MoodGradient {...(props as MoodGradientProps)} />,
  quote: (props) => <QuoteBlock {...(props as QuoteProps)} />,
  affirmation: (props) => <AffirmationBlock {...(props as AffirmationProps)} />,
  music: (props) => <MusicCard {...(props as MusicCardProps)} />,
  soundscape: (props) => <Soundscape {...(props as SoundscapeProps)} />,
  moodimage: (props) => <MoodImage {...(props as MoodImageProps)} />,
  gallery: (props) => <Gallery {...(props as GalleryProps)} />,
  checklist: (props) => <ChecklistBlock {...(props as ChecklistProps)} />,
  progress: (props) => <ProgressBar {...(props as ProgressBarProps)} />,
  daygrid: (props) => <DayGrid {...(props as DayGridProps)} />,
  kanban: (props) => <MicroKanban {...(props as MicroKanbanProps)} />,
  prompt: (props) => <PromptCard {...(props as { question?: string })} />,
  task: (props) => <TaskPrompt {...(props as { goal?: string })} />,
  emotionchip: (props) => <EmotionChip {...(props as EmotionChipProps)} />,
  planner: () => <PlannerWizard />,
  footer: (props) => <FooterNote {...(props as Record<string, unknown>)} />,
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
  const normalizedType = normalizeType(entry.type);
  const props: ComponentProps = { ...(entry.props ?? {}) };

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

  if (normalizedType === 'planner') {
    return {
      ...entry,
      type: normalizedType,
      props: {},
    };
  }

  if (normalizedType === 'gallery') {
    const rawImages = Array.isArray(props.images)
      ? (props.images as unknown[])
      : typeof props.images === 'string'
        ? [props.images]
        : [];
    props.images = rawImages
      .filter((value): value is string => typeof value === 'string' && value.length > 0)
      .map((value) => value.trim());
  }

  if (normalizedType === 'checklist') {
    const rawItems = Array.isArray(props.items)
      ? (props.items as unknown[])
      : props.items && typeof props.items === 'object'
        ? [props.items]
        : [];
    const checklistItems = rawItems
      .map((item, index) => {
        if (typeof item === 'string') {
          return { id: `item-${index}`, text: item.trim(), done: false };
        }
        if (item && typeof item === 'object') {
          const record = item as Record<string, unknown>;
          const text =
            typeof record.text === 'string'
              ? record.text
              : typeof record.task === 'string'
              ? record.task
              : '';
          if (!text) return null;
          return {
            id: typeof record.id === 'string' && record.id.trim() ? record.id : `item-${index}`,
            text: text.trim(),
            done: Boolean(record.done ?? record.checked ?? false),
          };
        }
        return null;
      })
      .filter((value): value is { id: string; text: string; done: boolean } => Boolean(value && value.text));
    props.items = checklistItems;
  }

  if (normalizedType === 'progress') {
    const value = Number(props.value ?? props.percent ?? props.progress ?? 0);
    props.label =
      typeof props.label === 'string' && props.label.trim().length > 0
        ? props.label.trim()
        : 'Progress';
    props.value = Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 0;
    delete props.percent;
    delete props.progress;
  }

  if (normalizedType === 'soundscape') {
    if (typeof props.title !== 'string' || !props.title.trim()) {
      props.title = 'Ambient Horizon';
    } else {
      props.title = (props.title as string).trim();
    }
    if (typeof props.artist !== 'string' || !props.artist.trim()) {
      props.artist = 'Adapt Waves';
    } else {
      props.artist = (props.artist as string).trim();
    }
    if (props.playing != null) {
      props.playing = Boolean(props.playing);
    }
  }

  if (normalizedType === 'daygrid') {
    const rawEntries = Array.isArray(props.entries) ? (props.entries as unknown[]) : [];
    if (typeof props.day === 'string' && props.day.trim()) {
      props.day = props.day.trim();
    }
    props.entries = rawEntries
      .map((entry) => {
        if (entry && typeof entry === 'object') {
          const record = entry as Record<string, unknown>;
          const time = typeof record.time === 'string' ? record.time : typeof record.start === 'string' ? record.start : '';
          const text =
            typeof record.text === 'string'
              ? record.text
              : typeof record.title === 'string'
              ? record.title
              : '';
          if (!text) return null;
          return { time: time || '--:--', text };
        }
        return null;
      })
      .filter((entry): entry is { time: string; text: string } => Boolean(entry));
  }

  if (normalizedType === 'kanban') {
    const toArray = (value: unknown): string[] => {
      if (Array.isArray(value)) {
        return value
          .map((item) => (typeof item === 'string' ? item : null))
          .filter((item): item is string => Boolean(item && item.trim()))
          .map((item) => item.trim());
      }
      if (typeof value === 'string') {
        return [value.trim()];
      }
      return [];
    };
    props.todo = toArray(props.todo ?? props.backlog);
    props.doing = toArray(props.doing ?? props.in_progress);
    props.done = toArray(props.done ?? props.complete);
    delete props.backlog;
    delete props.in_progress;
    delete props.complete;
  }

  if (normalizedType === 'affirmation') {
    if (typeof props.text !== 'string' || !props.text.trim()) {
      props.text =
        typeof props.message === 'string' && props.message.trim()
          ? props.message
          : 'You are capable of shaping this moment.';
    }
    delete props.message;
  }

  if (normalizedType === 'quote') {
    if (typeof props.text !== 'string' || !props.text.trim()) {
      props.text =
        typeof props.quote === 'string' && props.quote.trim()
          ? props.quote
          : 'Creativity is intelligence having fun.';
    }
    props.by =
      typeof props.by === 'string' && props.by.trim()
        ? props.by
        : typeof props.author === 'string' && props.author.trim()
        ? props.author
        : undefined;
    delete props.quote;
    delete props.author;
  }

  if (normalizedType === 'todo') {
    const rawItems = Array.isArray(props.items)
      ? (props.items as unknown[])
      : props.items && typeof props.items === 'object'
        ? [props.items]
        : [];
    const todoItems = rawItems
      .map((item): string | null => {
        if (typeof item === 'string') {
          return item;
        }
        if (item && typeof item === 'object') {
          const record = item as Record<string, unknown>;
          if (typeof record.text === 'string') {
            return record.text;
          }
          if (typeof record.task === 'string') {
            return record.task;
          }
        }
        return null;
      })
      .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
      .map((value) => value.trim());
    props.items = todoItems;
  }

  if (normalizedType === 'prompt') {
    if (typeof props.question !== 'string' || props.question.trim().length === 0) {
      props.question = 'What is one thing you want to note right now?';
    }
  }

  if (normalizedType === 'task') {
    if (typeof props.goal !== 'string' || props.goal.trim().length === 0) {
      props.goal = 'Complete one small action to move forward.';
    }
  }

  if (normalizedType === 'moodimage') {
    if (props.intent == null && props.mood == null && props.themeIntent) {
      props.intent = props.themeIntent;
    }
  }

  if (normalizedType === 'quote') {
    if (typeof props.text !== 'string' || props.text.trim().length === 0) {
      props.text = 'Take a breath. You are exactly where you need to be.';
    }
  }

  if (normalizedType === 'affirmation') {
    if (typeof props.message !== 'string' || props.message.trim().length === 0) {
      props.message = 'You are grounded, capable, and ready.';
    }
  }

  if (normalizedType === 'music') {
    if (typeof props.trackName !== 'string' || props.trackName.trim().length === 0) {
      props.trackName = 'Ambient Focus';
    }
    if (typeof props.artist !== 'string' || props.artist.trim().length === 0) {
      props.artist = 'Adaptive Waves';
    }
  }

  if (normalizedType === 'emotionchip') {
    if (typeof props.label !== 'string' || props.label.trim().length === 0) {
      props.label = 'Mood';
    }
  }

  if (normalizedType === 'visualbreathing' && typeof props.pattern !== 'string') {
    props.pattern = '4-4-4';
  }

  if (normalizedType === 'moodgradient') {
    if (typeof props.intent !== 'string' || props.intent.trim().length === 0) {
      props.intent = props.mood ?? props.themeIntent ?? '';
    }
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
          const componentId = typeof normalizedProps.id === 'string' ? normalizedProps.id : undefined;
          const componentKey = componentId ?? `${normalized.type}-${index}`;
          const componentType = normalizeType(normalized.type ?? '');
          const Component = registry[componentType];
          const selfContained =
            componentType === 'timer' ||
            componentType === 'breathing' ||
            componentType === 'visualbreathing' ||
            componentType === 'planner';

          return (
            <motion.div
              key={componentKey}
              initial={{ opacity: 0, y: 14, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -14, scale: 0.97 }}
              transition={transition}
              className={selfContained
                ? componentType === 'planner'
                  ? 'w-full'
                  : 'flex justify-center'
                : 'backdrop-blur-md rounded-2xl border border-white/10 bg-bg/30 text-fg pad shadow-[0_18px_48px_-24px_rgba(15,23,42,0.4)] transition-all duration-[var(--motion-duration)]'}
            >
              {Component ? (
                <Component {...normalizedProps} />
              ) : (
                <TextBlock content="This component is not supported yet." />
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

type HeaderProps = {
  title?: string;
  subtitle?: string;
};

function Header({ title = 'Welcome', subtitle }: HeaderProps = {}): ReactElement | null {
  const safeTitle = typeof title === 'string' ? title.trim() : '';
  const safeSubtitle = typeof subtitle === 'string' ? subtitle.trim() : '';
  if (!safeTitle && !safeSubtitle) {
    return null;
  }

  return (
    <header className="space-y-3">
      {safeTitle ? (
        <h1 className="text-3xl font-semibold tracking-tight text-fg sm:text-4xl">{safeTitle}</h1>
      ) : null}
      {safeSubtitle ? <p className="text-sm leading-[1.65] text-fg/75">{safeSubtitle}</p> : null}
    </header>
  );
}

type TextBlockProps = {
  content?: string;
};

function TextBlock({ content = '...' }: TextBlockProps = {}): ReactElement | null {
  let display: string | null = null;
  if (typeof content === 'string') {
    display = content.trim();
  } else if (content != null) {
    try {
      display = JSON.stringify(content);
    } catch {
      display = String(content);
    }
  }

  if (!display) {
    return null;
  }

  return <p className="text-base leading-[1.6] text-fg/90 sm:text-lg">{display}</p>;
}

type JournalPadProps = {
  title?: string;
  placeholder?: string;
};

function JournalPad({ title = 'Journal', placeholder = 'Let the thoughts flow…' }: JournalPadProps = {}): ReactElement {
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

type TodoListItem = string | { text?: string; task?: string };

type TodoListProps = {
  title?: string;
  items?: TodoListItem[];
};

function TodoList({
  title = 'Focus Points',
  items = ['Outline the next steps', 'Revisit assumptions', 'Commit to a next action'],
}: TodoListProps = {}): ReactElement {
  const normalizedItems = Array.isArray(items)
    ? items
        .map((item) => {
          if (typeof item === 'string') return item.trim();
          if (item && typeof item === 'object') {
            if (typeof item.text === 'string') return item.text.trim();
            if (typeof item.task === 'string') return item.task.trim();
          }
          return '';
        })
        .filter((text) => Boolean(text))
    : [];

  return (
    <div className="flex flex-col gap-3">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold tracking-tight text-fg">{title}</h2>
        <p className="text-xs uppercase tracking-[0.3em] text-fg/50">Lightweight checklist</p>
      </div>
      {normalizedItems.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-white/15 bg-bg/20 px-3 py-2 text-sm text-fg/70">
          No tasks yet. Add tasks in the planner first.
        </p>
      ) : (
        <ul className="space-y-2">
          {normalizedItems.map((item, index) => (
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
      )}
    </div>
  );
}

type MusicCardProps = {
  trackName?: string;
  artist?: string;
  mood?: string;
};

function MusicCard({ trackName = 'Ambient Focus', artist = 'Adaptive Waves', mood }: MusicCardProps = {}): ReactElement {
  const [playing, setPlaying] = useState(false);
  const bars = [0, 1, 2, 3];
  const motionDuration = useMotionDurationSeconds();
  const base = Math.max(motionDuration * 1.2, 0.6);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-fg/60">Soundscape</p>
          <h3 className="text-lg font-semibold tracking-tight text-fg">{trackName}</h3>
          <p className="text-sm text-fg/65">{artist}</p>
          {mood ? <p className="mt-1 text-xs uppercase tracking-[0.3em] text-fg/50">Mood · {mood}</p> : null}
        </div>
        <button
          type="button"
          onClick={() => setPlaying((prev) => !prev)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-bg/30 text-sm font-medium text-fg/80 transition hover:bg-bg/40 focus:outline-none focus:ring-2 focus:ring-primary/40"
          aria-label={playing ? 'Pause track' : 'Play track'}
        >
          {playing ? '❚❚' : '▶'}
        </button>
      </div>
      <div className="flex h-20 items-end justify-start gap-2">
        {bars.map((bar, index) => (
          <motion.span
            key={bar}
            className="w-2 rounded-full bg-primary/70"
            animate={{ scaleY: playing ? [0.35, 1, 0.45] : [0.35] }}
            transition={{
              duration: playing ? base + index * 0.1 : 0.001,
              repeat: playing ? Infinity : 0,
              ease: 'easeInOut',
            }}
            style={{ transformOrigin: '50% 100%' }}
          />
        ))}
      </div>
    </div>
  );
}

type MoodImageProps = {
  src?: string;
  alt?: string;
  caption?: string;
  intent?: string;
  mood?: string;
};

function MoodImage({ src, alt = 'Mood visual', caption, intent, mood }: MoodImageProps = {}): ReactElement {
  const computedSrc = useMemo(() => {
    if (src) return src;
    const keyword = encodeURIComponent((intent || mood || 'calm atmosphere').toLowerCase());
    return `https://source.unsplash.com/1600x900/?${keyword}`;
  }, [src, intent, mood]);

  return (
    <motion.figure
      className="overflow-hidden rounded-3xl"
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
    >
      <div className="relative h-48 w-full sm:h-56 md:h-64">
        <Image
          src={computedSrc}
          alt={alt}
          fill
          className="object-cover"
          sizes="(min-width: 768px) 50vw, 100vw"
          loading="lazy"
          unoptimized
        />
      </div>
      {caption ? <figcaption className="mt-2 text-xs text-fg/60">{caption}</figcaption> : null}
    </motion.figure>
  );
}

type GalleryProps = {
  images?: string[];
};

function Gallery({ images = [] }: GalleryProps = {}): ReactElement {
  const sanitized = images.filter(Boolean);
  const fallbackImages = ['https://source.unsplash.com/800x600/?creative', 'https://source.unsplash.com/800x600/?focus'];
  const display = sanitized.length > 0 ? sanitized : fallbackImages;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {display.slice(0, 4).map((url, index) => (
        <motion.div
          key={`${url}-${index}`}
          className="overflow-hidden rounded-2xl"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.35, delay: index * 0.05, ease: 'easeOut' }}
        >
          <div className="relative h-32 w-full">
            <Image
              src={url}
              alt="Gallery"
              fill
              className="object-cover transition-transform duration-500 hover:scale-105"
              sizes="(min-width: 768px) 33vw, 50vw"
              loading="lazy"
              unoptimized
            />
          </div>
        </motion.div>
      ))}
    </div>
  );
}

type MoodGradientProps = {
  intent?: string;
};

function MoodGradient({ intent }: MoodGradientProps = {}): ReactElement {
  const [from, to] = useMemo(() => {
    const lower = intent?.toLowerCase() ?? '';
    switch (lower) {
      case 'happy':
        return ['#fde047', '#f97316'];
      case 'calm':
        return ['#bfdbfe', '#c4b5fd'];
      case 'focus':
        return ['#bfdbfe', '#1d4ed8'];
      case 'creative':
        return ['#fbcfe8', '#f472b6'];
      case 'reflective':
        return ['#e2e8f0', '#94a3b8'];
      case 'energized':
      case 'energised':
        return ['#facc15', '#ef4444'];
      default:
        return ['#c7d2fe', '#a855f7'];
    }
  }, [intent]);

  const label = formatLabel(intent) ?? 'Atmosphere';

  return (
    <div className="relative h-48 overflow-hidden rounded-3xl sm:h-56 md:h-64">
      <motion.div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(circle at 25% 20%, ${from}55, transparent 60%), radial-gradient(circle at 80% 80%, ${to}55, transparent 65%)`,
        }}
        animate={{ rotate: [0, 8, -6, 0], scale: [1.05, 1, 1.08, 1.02] }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
      />
      <div className="relative flex h-full w-full items-center justify-center backdrop-blur-sm">
        <p className="text-sm uppercase tracking-[0.35em] text-fg/60">{label}</p>
      </div>
    </div>
  );
}

type EmotionChipProps = {
  label?: string;
  emotion?: string;
};

function EmotionChip({ label, emotion }: EmotionChipProps = {}): ReactElement {
  const source = (emotion ?? label ?? 'curious').toString();
  const formatted = source
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .trim();

  return (
    <span
      className="inline-flex items-center rounded-full px-3 py-1 text-xs"
      style={{
        background: 'color-mix(in oklab, var(--accent) 18%, transparent)',
        color: 'var(--fg)',
      }}
    >
      {formatted || 'Curious'}
    </span>
  );
}

type PromptCardProps = {
  question?: string;
};

function PromptCard({ question = 'What do you want to note?' }: PromptCardProps): ReactElement {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

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
    <div className="space-y-3">
      <h3 className="text-lg font-semibold tracking-tight text-fg">{question}</h3>
      <textarea
        ref={textareaRef}
        rows={3}
        placeholder="Capture your thoughts here…"
        onChange={autoResize}
        onInput={autoResize}
        className="w-full resize-none rounded-2xl border border-white/10 bg-bg/35 px-4 py-3 text-sm leading-relaxed text-fg shadow-inner transition focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
      />
    </div>
  );
}

type TaskPromptProps = {
  goal?: string;
};

function TaskPrompt({ goal = 'Define your next small win.' }: TaskPromptProps): ReactElement {
  const [done, setDone] = useState(false);

  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-bg/30 px-4 py-3">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-fg/55">Focus Task</p>
        <h3 className="text-base font-semibold tracking-tight text-fg">{goal}</h3>
      </div>
      <motion.button
        type="button"
        onClick={() => setDone((prev) => !prev)}
        className={`rounded-full px-4 py-1.5 text-sm font-semibold text-white transition focus:outline-none focus:ring-2 focus:ring-primary/40 ${done ? 'bg-accent/80' : 'bg-primary/80 hover:bg-primary'}`}
        animate={{ scale: done ? 1.05 : 1 }}
      >
        {done ? 'Done!' : 'Mark done'}
      </motion.button>
    </div>
  );
}

type ActionButtonProps = {
  label?: string;
  href?: string;
  action?: string;
};

function ActionButton({ label = 'Explore', href, action = 'noop' }: ActionButtonProps = {}): ReactElement {
  const normalizedAction = action?.trim() ?? 'noop';

  const lowerAction = normalizedAction.toLowerCase();

  const handleClick = () => {
    if (!normalizedAction || lowerAction === 'noop') return;
    if (lowerAction === 'logout') return;

    if (lowerAction === 'explore' || lowerAction === 'explore:open') {
      uiBus.emit('explore:open');
      return;
    }

    if (lowerAction.startsWith('explore:')) {
      uiBus.emit(lowerAction);
      return;
    }

    if (lowerAction === 'timer:start' || lowerAction === 'timer:pause' || lowerAction === 'timer:reset') {
      uiBus.emit(lowerAction);
      return;
    }

    if (lowerAction === 'breathing:start' || lowerAction === 'breathing:pause' || lowerAction === 'breathing:reset') {
      uiBus.emit(lowerAction);
      return;
    }

    if (lowerAction.startsWith('timer:set:')) {
      const value = Number(normalizedAction.split(':')[2]);
      if (Number.isFinite(value) && value > 0) {
        uiBus.emit('timer:set', value);
      }
      return;
    }

    if (lowerAction.startsWith('breathing:setpattern:')) {
      const pattern = normalizedAction.split(':')[2];
      if (pattern) {
        uiBus.emit('breathing:setPattern', pattern);
      }
      return;
    }
  };

  const isNoop = lowerAction === 'noop' && !href;
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
        title={label}
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
      aria-disabled={isNoop}
      title={isNoop ? 'No action configured' : undefined}
    >
      {label}
    </button>
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

function formatLabel(value?: string | null) {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}
