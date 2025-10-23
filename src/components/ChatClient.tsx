'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useSendMessage } from '@/hooks/useSendMessage';
import { useConversationId } from '@/hooks/useConversationId';
import { fetchMessages, subscribeMessages, type ChatMessage } from '@/lib/supabase/chat';

export function ChatClient() {
  const [text, setText] = useState('');
  const [msgs, setMsgs] = useState<ChatMessage[]>([]);
  const { send, pending, error } = useSendMessage();
  const { conversationId } = useConversationId();
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!conversationId) return;
    fetchMessages(conversationId).then(setMsgs).catch(() => {});
    const sub = subscribeMessages(conversationId, (message) => {
      setMsgs((prev) => [...prev, message]);
    });
    return () => {
      sub?.unsubscribe?.();
    };
  }, [conversationId]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [msgs.length]);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const value = text.trim();
    if (!value || !conversationId) return;
    setText('');

    const optimistic: ChatMessage = {
      id: `local-${Date.now()}`,
      role: 'user',
      content: value,
      created_at: new Date().toISOString(),
    };
    setMsgs((prev) => [...prev, optimistic]);

    const reply = await send(value);
    if (reply) {
      const assistant: ChatMessage = {
        id: `local-assistant-${Date.now()}`,
        role: 'assistant',
        content: reply,
        created_at: new Date().toISOString(),
      };
      setMsgs((prev) => [...prev, assistant]);
    }
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void onSubmit(event);
    }
  }

  const messages = useMemo(() => msgs.slice(-100), [msgs]);

  return (
    <div className="chatdock-content">
      <header className="chatdock-header">
        <h2 className="chatdock-title">Messages</h2>
      </header>

      <div
        ref={listRef}
        className="chatdock-thread"
        role="log"
        aria-live="polite"
        aria-relevant="additions"
      >
        {messages.map((msg) => (
          <article
            key={msg.id}
            className={`chatdock-message ${
              msg.role === 'user' ? 'chatdock-message--user' : 'chatdock-message--assistant'
            }`}
          >
            {msg.content}
          </article>
        ))}
        {pending && (
          <article className="chatdock-message chatdock-message--assistant chatdock-message--thinking">
            Thinking…
          </article>
        )}
        {!messages.length && !pending && (
          <div className="chatdock-empty">No messages yet — start the conversation above.</div>
        )}
      </div>

      <form onSubmit={onSubmit} className="chatdock-composer">
        <textarea
          className="chatdock-input"
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Tell Adapt how you want the space to feel (“focus 25m”, “calm me down”, “plan my afternoon”)."
          rows={3}
        />
        <div className="chatdock-composerActions">
          <button className="chatdock-send" type="submit" disabled={pending || !text.trim()}>
            {pending ? 'Sending…' : 'Send'}
          </button>
        </div>
        {error && <div className="chatdock-error">{error}</div>}
      </form>
    </div>
  );
}
