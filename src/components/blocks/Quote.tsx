'use client';

export type QuoteProps = {
  text?: string;
  by?: string;
};

export function Quote({ text = 'Creativity is intelligence having fun.', by = 'Albert Einstein' }: QuoteProps) {
  return (
    <figure className="adapt-panel space-y-3 px-4 py-6 text-center text-fg/80">
      <blockquote className="text-lg italic leading-relaxed text-fg">“{text}”</blockquote>
      <figcaption className="text-xs uppercase tracking-[0.25em] text-fg/60">{by}</figcaption>
    </figure>
  );
}
