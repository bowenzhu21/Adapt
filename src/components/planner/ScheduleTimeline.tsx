'use client';
import { PlanItem } from './schedule';

type ScheduleTimelineProps = {
  start: string;
  end: string;
  items: PlanItem[];
};

const PRIORITY_COLOR: Record<PlanItem['priority'], string> = {
  High: 'border-primary/80 bg-primary/20',
  Med: 'border-accent/70 bg-accent/15',
  Low: 'border-white/15 bg-bg/40',
};

export function ScheduleTimeline({ start, end, items }: ScheduleTimelineProps) {
  const startMinutes = parseHHMM(start);
  const endMinutes = parseHHMM(end);
  const windowMinutes = endMinutes - startMinutes;

  const ticks: string[] = [];
  for (let m = startMinutes; m <= endMinutes; m += 60) {
    ticks.push(formatMinutes(m));
  }

  const containerHeight = Math.max(360, (windowMinutes / 60) * 80);

  return (
    <div className="relative flex gap-6">
      <div className="flex flex-col items-end text-xs text-fg/60">
        {ticks.map((tick) => (
          <div key={tick} className="h-20 leading-none">{tick}</div>
        ))}
      </div>
      <div className="relative flex-1 rounded-2xl border border-white/10 bg-bg/20 p-3">
        <div className="relative" style={{ height: `${containerHeight}px` }}>
          {items.map((item) => {
            const itemStart = Math.max(0, parseHHMM(item.start) - startMinutes);
            const itemEnd = Math.min(windowMinutes, parseHHMM(item.end) - startMinutes);
            const top = (itemStart / windowMinutes) * 100;
            const height = Math.max(4, ((itemEnd - itemStart) / windowMinutes) * 100);
            return (
              <div
                key={item.id}
                className={`absolute left-0 right-0 rounded-xl border px-3 py-2 text-left text-xs text-fg shadow-sm ${PRIORITY_COLOR[item.priority]}`}
                style={{ top: `${top}%`, height: `${height}%` }}
                title={`${item.title} · ${item.start} - ${item.end}`}
              >
                <div className="text-sm font-semibold">{item.title}</div>
                <div className="text-[11px] uppercase tracking-[0.3em] text-fg/60">{item.start} – {item.end}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function parseHHMM(value: string): number {
  const [h, m] = value.split(':').map((part) => Number(part));
  if (!Number.isFinite(h) || !Number.isFinite(m)) return 0;
  return h * 60 + m;
}

function formatMinutes(total: number): string {
  const hours = Math.floor(total / 60)
    .toString()
    .padStart(2, '0');
  const minutes = (total % 60).toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}
