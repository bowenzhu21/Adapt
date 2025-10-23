'use client';

import clsx from 'clsx';
import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { applyTheme, type ThemeInput } from '@/lib/ui/applyTheme';

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
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const placeholder = useMemo(() => resolvePlaceholder(emotion), [emotion]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [message]);

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
          | {
              theme?: unknown;
              components?: unknown;
              emotion?: string | null;
              intent?: string | null;
            }
          | null;
        setMessage('');
        setStatus('Space realigned. Describe the next shift when you are ready.');
        if (payload && typeof window !== 'undefined') {
          const optimisticComponents = Array.isArray(payload.components)
            ? payload.components
            : [];
          const optimisticTheme = (payload.theme ?? null) as ThemeInput | null;
          const optimisticEmotion = payload.emotion ?? null;
          const optimisticIntent = payload.intent ?? null;
          const optimisticTimestamp = Date.now();
          applyTheme(optimisticTheme);
          window.dispatchEvent(
            new CustomEvent('ui-state:update', {
              detail: {
                conversationId,
                theme: optimisticTheme,
                components: optimisticComponents,
                emotion: optimisticEmotion,
                intent: optimisticIntent,
                source: 'optimistic',
                updatedAt: optimisticTimestamp,
              },
            }),
          );
          window.setTimeout(async () => {
            try {
              const { data, error } = await supabase
                .from('ui_state')
                .select('theme, components, updated_at')
                .eq('conversation_id', conversationId)
                .maybeSingle();
              if (error || !data) {
                return;
              }
              const refreshedTheme = (data.theme ?? null) as ThemeInput | null;
              const refreshedComponents = Array.isArray(data.components)
                ? data.components
                : [];
              const refreshedTimestamp = data.updated_at
                ? new Date(data.updated_at).getTime()
                : Date.now();
              applyTheme(refreshedTheme);
              window.dispatchEvent(
                new CustomEvent('ui-state:update', {
                  detail: {
                    conversationId,
                    theme: refreshedTheme,
                    components: refreshedComponents,
                    emotion: optimisticEmotion,
                    intent: optimisticIntent,
                    source: 'poll',
                    updatedAt: refreshedTimestamp,
                  },
                }),
              );
            } catch {
              // Swallow poll errors; realtime should sync shortly after.
            }
          }, 400);
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
        ref={textareaRef}
        id="chat-input"
        name="message"
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        placeholder={placeholder}
        disabled={isSubmitting}
        rows={4}
        aria-invalid={Boolean(error)}
        aria-describedby={clsx(informationalId, error ? errorId : undefined)}
        className="w-full resize-none rounded-lg border border-white/10 bg-bg/40 px-4 py-3 text-sm leading-relaxed text-fg shadow-inner transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-60"
      />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p id={informationalId} className="text-xs text-fg/70" aria-live="polite">
          {status}
        </p>
        <button
          type="submit"
          disabled={isSubmitting || message.trim().length === 0}
          className={clsx(
            'adapt-btn inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-semibold shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-60',
            isSubmitting && 'animate-send-pulse',
          )}
          aria-label="Send message"
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
