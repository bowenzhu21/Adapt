'use client';

import { motion } from 'framer-motion';
import { ChatInput } from '@/components/ChatInput';

type ChatDockProps = {
  conversationId: string;
  emotion?: string | null;
  motionDuration: number;
  isRealigning?: boolean;
};

export function ChatDock({ conversationId, emotion, motionDuration, isRealigning = false }: ChatDockProps) {
  return (
    <motion.div
      className="bg-bg/60 backdrop-blur-md border-t border-white/10"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 24 }}
      transition={{ duration: Math.max(motionDuration, 0.3), ease: 'easeOut' }}
    >
      <motion.div
        animate={{
          filter: isRealigning ? 'blur(6px)' : 'blur(0px)',
          opacity: isRealigning ? 0.7 : 1,
        }}
        transition={{ duration: Math.max(motionDuration, 0.25), ease: 'easeOut' }}
        className="mx-auto w-full max-w-3xl px-4 sm:px-6 py-3 sm:py-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))]"
      >
        <ChatInput conversationId={conversationId} emotion={emotion} />
      </motion.div>
    </motion.div>
  );
}
