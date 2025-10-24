'use client';

import { useChatDock } from '@/hooks/useChatDock';
import { ReactNode, useEffect, useState } from 'react';

export function ChatDock({ children }: { children: ReactNode }) {
  const { open, toggle, setOpen } = useChatDock();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (!mounted) {
      const id = window.requestAnimationFrame(() => setMounted(true));
      return () => window.cancelAnimationFrame(id);
    }
  }, [mounted]);

  const ariaExpanded = mounted ? open : false;
  const ariaHidden = mounted ? !open : true;

  return (
    <div className="chatdock-root" aria-hidden={ariaHidden}>
      <div className="chatdock-panel" role="complementary" aria-label="Chat panel">
        <button
          type="button"
          className="chatdock-handle"
          aria-label={ariaExpanded ? 'Collapse chat' : 'Expand chat'}
          aria-expanded={ariaExpanded}
          onClick={toggle}
        >
          <span className="chatdock-handleIcon" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M5 6.5C5 5.119 6.343 4 8 4h8c1.657 0 3 1.119 3 2.5v5c0 1.381-1.343 2.5-3 2.5h-1.382l-3.4 3.198c-.634.596-1.68.152-1.68-.725V14H8c-1.657 0-3-1.119-3-2.5v-5Z" />
            </svg>
          </span>
          <span className="chatdock-handleLabel" aria-hidden="true">
            {ariaExpanded ? 'Hide chat' : 'Chat with Adapt'}
          </span>
          <span className="chatdock-handleArrow" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M8 5L16 12L8 19" />
            </svg>
          </span>
        </button>

        <div className="chatdock-inner">{children}</div>
      </div>
      <div className="chatdock-backdrop" onClick={() => setOpen(false)} />
    </div>
  );
}
