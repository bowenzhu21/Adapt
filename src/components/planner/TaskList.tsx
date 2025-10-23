'use client';

import { motion } from 'framer-motion';
import { Task } from './schedule';

export type TaskListProps = {
  tasks: Task[];
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
};

export function TaskList({ tasks, onEdit, onDelete }: TaskListProps) {
  if (tasks.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-white/15 bg-bg/20 px-4 py-6 text-sm text-fg/70">
        No tasks yet. Add your first task above.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {tasks.map((task, index) => (
        <motion.div
          key={task.id}
          className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-bg/25 px-4 py-3 text-sm text-fg"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: index * 0.03, ease: 'easeOut' }}
        >
          <div className="flex flex-1 flex-col">
            <span className="font-semibold text-fg">{task.title}</span>
            <span className="text-xs uppercase tracking-[0.3em] text-fg/60">
              {task.minutes} min · {task.priority}
              {task.deadline ? ` · deadline ${task.deadline}` : ''}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onEdit(task)}
              className="rounded-full border border-white/10 bg-bg/40 px-3 py-1 text-xs font-medium text-fg/80 transition hover:bg-bg/50 focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => onDelete(task.id)}
              className="rounded-full border border-white/10 bg-bg/40 px-3 py-1 text-xs font-medium text-fg/80 transition hover:bg-bg/50 focus:outline-none focus:ring-2 focus:ring-red-400/40"
            >
              Delete
            </button>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
