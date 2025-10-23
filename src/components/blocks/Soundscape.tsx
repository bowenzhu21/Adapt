'use client';

import { useState } from 'react';

export type SoundscapeProps = {
  title?: string;
  artist?: string;
  playing?: boolean;
};

export function Soundscape({ title = 'Ambient Horizon', artist = 'Adapt Waves', playing }: SoundscapeProps) {
  const [isPlaying, setIsPlaying] = useState(Boolean(playing));

  return (
    <div className="adapt-panel flex items-center justify-between gap-4 px-4 py-4 text-sm text-fg/80">
      <div>
        <p className="text-base font-semibold text-fg">{title}</p>
        <p className="text-xs uppercase tracking-[0.2em] text-fg/60">{artist}</p>
      </div>
      <button
        type="button"
        onClick={() => setIsPlaying((state) => !state)}
        className="adapt-btn inline-flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold shadow-sm"
        aria-label={isPlaying ? 'Pause soundscape' : 'Play soundscape'}
      >
        {isPlaying ? '❚❚' : '▶'}
      </button>
    </div>
  );
}
