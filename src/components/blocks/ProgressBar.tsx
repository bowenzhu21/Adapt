'use client';

export type ProgressBarProps = {
  label?: string;
  value?: number;
};

export function ProgressBar({ label = 'Progress', value = 0 }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
  return (
    <div className="adapt-panel space-y-3 px-4 py-4 text-sm text-fg/80">
      <header className="flex items-baseline justify-between">
        <span className="text-base font-semibold text-fg">{label}</span>
        <span className="text-xs text-fg/60">{clamped}%</span>
      </header>
      <div className="h-2 w-full overflow-hidden rounded-full bg-fg/10">
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-[var(--motion)]"
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}
