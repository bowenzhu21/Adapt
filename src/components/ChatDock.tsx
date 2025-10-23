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
          <svg className="chev-svg" viewBox="0 0 24 24" aria-hidden="true">
            <path className="chev-path" d="M8 5 L16 12 L8 19" />
          </svg>
        </button>

        <div className="chatdock-inner">{children}</div>
      </div>
      <div className="chatdock-backdrop" onClick={() => setOpen(false)} />
    </div>
  );
}
