'use client';

import clsx from 'clsx';
import { FormEvent, useState } from 'react';

type ChatInputProps = {
  conversationId: string;
  className?: string;
  emotion?: string | null;
};

const emotionPlaceholderMap: Record<string, string> = {
  focus: 'What should we concentrate on next?',
  calm: 'Share how you want to unwind…',
  curious: 'What are you curious about right now?',
  reflective: 'What reflections are on your mind?',
  energized: 'Where should we channel this energy?',
  energised: 'Where should we channel this energy?',
  creative: 'What would you like to create today?',
  relaxed: 'What helps you slow down?',
};

function resolvePlaceholder(emotion?: string | null) {
  if (!emotion) return 'Share how you’d like this space to feel…';
  const key = emotion.toLowerCase();
  return emotionPlaceholderMap[key] ?? 'Share how you’d like this space to feel…';
}

export function ChatInput({ conversationId, className, emotion }: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('Describe how this space should feel.');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmed = message.trim();
    if (trimmed.length === 0 || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setStatus('Shifting your space…');
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('ui-state:pending', {
          detail: { conversationId, active: true },
        }),
      );
    }

    try {
      const response = await fetch('/api/interpret', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversationId,
          message: trimmed,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        const messageText =
          typeof payload?.error === 'string'
            ? payload.error
            : `Failed to send message (status ${response.status}).`;
        setError(messageText);
        setStatus('Something went wrong. Try again gently.');
      } else {
        const payload = (await response.json().catch(() => null)) as
          | { theme?: unknown; components?: unknown; emotion?: string; intent?: string }
          | null;
        setMessage('');
        setStatus('Space realigned. Describe the next shift when you are ready.');
        if (payload && typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('ui-state:update', {
              detail: {
                conversationId,
                theme: payload.theme ?? null,
                components: Array.isArray(payload.components) ? payload.components : [],
                emotion: payload.emotion ?? null,
                intent: payload.intent ?? null,
              },
            }),
          );
        }
      }
    } catch (error) {
      const messageText =
        error instanceof Error ? error.message : 'Unexpected error sending message.';
      setError(messageText);
      setStatus('Something went wrong. Try again gently.');
    } finally {
      setIsSubmitting(false);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('ui-state:pending', {
            detail: { conversationId, active: false },
          }),
        );
      }
    }
  }

  const informationalId = 'chat-input-status';
  const errorId = 'chat-input-error';

  return (
    <form
      onSubmit={handleSubmit}
      className={clsx('flex w-full flex-col gap-3', className)}
      aria-busy={isSubmitting}
    >
      <label htmlFor="chat-input" className="text-sm font-medium text-fg/80">
        How can I help reimagine this space?
      </label>
      <textarea
        id="chat-input"
        name="message"
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        placeholder={resolvePlaceholder(emotion)}
        disabled={isSubmitting}
        rows={4}
        aria-invalid={Boolean(error)}
        aria-describedby={clsx(informationalId, error ? errorId : undefined)}
        className="w-full resize-y rounded-lg border border-white/10 bg-bg/40 px-4 py-3 text-sm leading-relaxed text-fg shadow-inner transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-60"
      />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p id={informationalId} className="text-xs text-fg/70" aria-live="polite">
          {status}
        </p>
        <button
          type="submit"
          disabled={isSubmitting || message.trim().length === 0}
          className={clsx(
            'inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-60',
            isSubmitting && 'animate-send-pulse',
          )}
          style={{ transitionDuration: 'var(--motion-duration)' }}
        >
          Send
        </button>
      </div>
      {error ? (
        <p
          id={errorId}
          className="text-xs font-medium text-red-400"
          role="alert"
          aria-live="assertive"
        >
          {error}
        </p>
      ) : null}
    </form>
  );
}
