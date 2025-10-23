'use client';

export type DayGridEntry = {
  time: string;
  text: string;
};

export type DayGridProps = {
  day?: string;
  entries?: DayGridEntry[];
};

const defaultEntries: DayGridEntry[] = [
  { time: '09:00', text: 'Deep focus block' },
  { time: '12:30', text: 'Lunch + reset' },
  { time: '15:00', text: 'Review progress' },
];

export function DayGrid({ day = 'Today', entries }: DayGridProps) {
  const list = entries && entries.length > 0 ? entries : defaultEntries;
  const columns = Array.from({ length: 7 });

  return (
    <div className="adapt-panel space-y-3 px-4 py-4 text-sm text-fg/80">
      <header className="flex items-baseline justify-between">
        <span className="text-base font-semibold text-fg">{day}</span>
        <span className="text-xs text-fg/60">Snapshot</span>
      </header>
      <div className="grid grid-cols-7 gap-2 text-xs">
        {columns.map((_, index) => {
          const entry = list[index];
          return (
            <div key={index} className="rounded-xl border border-white/10 bg-bg/35 p-2">
              <p className="text-[10px] uppercase tracking-[0.15em] text-fg/60">{entry?.time ?? '--:--'}</p>
              <p className="mt-1 text-[11px] text-fg/80">{entry?.text ?? 'Reserved space'}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
