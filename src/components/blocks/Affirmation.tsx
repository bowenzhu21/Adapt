'use client';

export type AffirmationProps = {
  text?: string;
};

export function Affirmation({ text = 'You are capable of shaping this moment.' }: AffirmationProps) {
  return (
    <div className="adapt-panel px-4 py-8 text-center">
      <p className="text-lg font-semibold tracking-tight text-fg sm:text-xl">{text}</p>
    </div>
  );
}
