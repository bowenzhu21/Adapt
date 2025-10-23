'use client';

import { useMemo, useState } from 'react';

export type ChecklistItem = {
  id: string;
  text: string;
  done?: boolean;
};

export type ChecklistProps = {
  title?: string;
  items?: ChecklistItem[];
};

const fallbackItems: ChecklistItem[] = [
  { id: 'item-1', text: 'Set your focus for this block' },
  { id: 'item-2', text: 'Tidy loose ends before you start' },
];

export function Checklist({ title = 'Checklist', items }: ChecklistProps) {
  const initial = useMemo(
    () => (items && items.length > 0 ? items : fallbackItems).map((item, index) => ({
      id: item.id || `item-${index}`,
      text: item.text ?? '',
      done: Boolean(item.done),
    })),
    [items],
  );

  const [entries, setEntries] = useState(initial);

  const toggle = (id: string) => {
    setEntries((current) =>
      current.map((entry) => (entry.id === id ? { ...entry, done: !entry.done } : entry)),
    );
  };

  return (
    <div className="adapt-panel space-y-3 px-4 py-4 text-sm text-fg/80">
      <header className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-fg">{title}</h3>
        <span className="text-xs text-fg/60">{entries.filter((item) => item.done).length}/{entries.length}</span>
      </header>
      <ul className="space-y-2">
        {entries.map((entry) => (
          <li key={entry.id}>
            <button
              type="button"
              onClick={() => toggle(entry.id)}
              className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-bg/40 px-3 py-2 text-left transition hover:bg-bg/50 focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-full border ${
                  entry.done ? 'border-primary bg-primary text-white' : 'border-white/30 text-fg/60'
                }`}
              >
                {entry.done ? '✓' : ''}
              </span>
              <span className={entry.done ? 'line-through opacity-70' : undefined}>{entry.text}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
