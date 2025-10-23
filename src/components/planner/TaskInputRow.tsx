'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';

type Priority = 'Low' | 'Med' | 'High';

export type TaskInputRowProps = {
  initial?: {
    title: string;
    minutes: number;
    priority: Priority;
  };
  onSubmit: (task: { title: string; minutes: number; priority: Priority }) => void;
  onCancelEdit?: () => void;
};

const PRIORITIES: Priority[] = ['High', 'Med', 'Low'];

export function TaskInputRow({ initial, onSubmit, onCancelEdit }: TaskInputRowProps) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [minutes, setMinutes] = useState(initial?.minutes ?? 30);
  const [priority, setPriority] = useState<Priority>(initial?.priority ?? 'Med');

  useEffect(() => {
    if (!initial || typeof window === 'undefined') {
      return;
    }
    const frame = window.requestAnimationFrame(() => {
      setTitle(initial.title);
      setMinutes(initial.minutes);
      setPriority(initial.priority);
    });
    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [initial]);

  const isValid = useMemo(() => title.trim().length > 0 && minutes > 0, [title, minutes]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isValid) return;
    onSubmit({
      title: title.trim(),
      minutes: Math.max(5, Math.floor(minutes)),
      priority,
    });
    if (!initial) {
      setTitle('');
      setMinutes(30);
      setPriority('Med');
    }
  };

  return (
    <form
      className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-bg/30 p-3 sm:flex-row sm:items-end"
      onSubmit={handleSubmit}
    >
      <label className="flex flex-1 flex-col text-xs font-medium uppercase tracking-[0.3em] text-fg/60">
        Title
        <input
          type="text"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          className="mt-1 rounded-lg border border-white/10 bg-bg/40 px-3 py-2 text-sm text-fg shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
          placeholder="Plan sprint review"
        />
      </label>
      <label className="flex w-full flex-col text-xs font-medium uppercase tracking-[0.3em] text-fg/60 sm:w-28">
        Minutes
        <input
          type="number"
          min={5}
          value={minutes}
          onChange={(event) => {
            const value = Number(event.target.value);
            setMinutes(Number.isFinite(value) ? value : 0);
          }}
          className="mt-1 rounded-lg border border-white/10 bg-bg/40 px-3 py-2 text-sm text-fg shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
      </label>
      <label className="flex w-full flex-col text-xs font-medium uppercase tracking-[0.3em] text-fg/60 sm:w-32">
        Priority
        <select
          value={priority}
          onChange={(event) => setPriority(event.target.value as Priority)}
          className="mt-1 rounded-lg border border-white/10 bg-bg/40 px-3 py-2 text-sm text-fg focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
        >
          {PRIORITIES.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>
      <div className="flex items-center gap-2 pt-1 sm:pt-0">
        <button
          type="submit"
          className="rounded-full bg-primary/80 px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-50"
          disabled={!isValid}
        >
          {initial ? 'Save' : 'Add task'}
        </button>
        {initial ? (
          <button
            type="button"
            onClick={onCancelEdit}
            className="rounded-full border border-white/10 bg-bg/40 px-3 py-2 text-sm font-medium text-fg/70 transition hover:bg-bg/50 focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            Cancel
          </button>
        ) : null}
      </div>
    </form>
  );
}
