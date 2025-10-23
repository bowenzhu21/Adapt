'use client';

import { Fragment, FormEvent, useState } from 'react';
import { motion } from 'framer-motion';
import { uiBus } from '@/lib/uiBus';
import { ScheduleTimeline } from './ScheduleTimeline';
import { generateSchedule, Task, PlanItem } from './schedule';
import { TaskInputRow } from './TaskInputRow';
import { TaskList } from './TaskList';

type Step = 0 | 1 | 2 | 3;

type ConstraintState = {
  bufferMin: number;
  focusBlockMin: number;
  addBreaks: boolean;
};

type AvailabilityState = {
  start: string;
  end: string;
  addBreaks: boolean;
};

export function PlannerWizard() {
  const [step, setStep] = useState<Step>(0);
  const [availability, setAvailability] = useState<AvailabilityState>({
    start: '09:00',
    end: '17:00',
    addBreaks: true,
  });
  const [tasks, setTasks] = useState<Task[]>([]);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [constraints, setConstraints] = useState<ConstraintState>({
    bufferMin: 5,
    focusBlockMin: 25,
    addBreaks: true,
  });
  const [plan, setPlan] = useState<{ items: PlanItem[]; warnings: string[] } | null>(null);
  const [accepted, setAccepted] = useState(false);

  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const editingTask = editingTaskId ? tasks.find((task) => task.id === editingTaskId) : undefined;

  const handleAddTask = (values: { title: string; minutes: number; priority: Task['priority'] }) => {
    if (editingTask) {
      setTasks((prev) =>
        prev.map((task) =>
          task.id === editingTask.id ? { ...task, ...values } : task,
        ),
      );
      setEditingTaskId(null);
    } else {
      setTasks((prev) => [
        ...prev,
        {
          id: `task-${Date.now()}-${prev.length}`,
          title: values.title,
          minutes: values.minutes,
          priority: values.priority,
          deadline: undefined,
        },
      ]);
    }
    setAccepted(false);
  };

  const handleDeleteTask = (id: string) => {
    setTasks((prev) => prev.filter((task) => task.id !== id));
    if (editingTaskId === id) {
      setEditingTaskId(null);
    }
    setAccepted(false);
  };

  const handleDeadlineChange = (id: string, value: string | undefined) => {
    setTasks((prev) =>
      prev.map((task) => (task.id === id ? { ...task, deadline: value || undefined } : task)),
    );
    setAccepted(false);
  };

  const handleGenerate = () => {
    const schedule = generateSchedule({
      dayStart: availability.start,
      dayEnd: availability.end,
      tasks,
      bufferMin: constraints.bufferMin,
      focusBlockMin: constraints.focusBlockMin,
      addBreaks: constraints.addBreaks && availability.addBreaks,
    });
    setPlan(schedule);
    setStep(3);
    setAccepted(false);
  };

  const handleAccept = () => {
    if (!plan) return;
    setAccepted(true);
    uiBus.emit('planner:accept', plan);
  };

  return (
    <div className="space-y-6">
      <nav className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-fg/60">
        {['Availability', 'Tasks', 'Constraints', 'Review'].map((label, index) => (
          <Fragment key={label}>
            <span className={index === step ? 'text-fg/90 font-semibold' : undefined}>{label}</span>
            {index < 3 ? <span>·</span> : null}
          </Fragment>
        ))}
      </nav>

      {step === 0 ? (
        <AvailabilityStep
          availability={availability}
          timeZone={timeZone}
          onNext={(next) => {
            setAvailability(next);
            setStep(1);
          }}
        />
      ) : null}

      {step === 1 ? (
        <TasksStep
          tasks={tasks}
          editingTask={editingTask}
          onAddTask={handleAddTask}
          onEditTask={(task) => setEditingTaskId(task.id)}
          onCancelEdit={() => setEditingTaskId(null)}
          onDeleteTask={handleDeleteTask}
          onNext={() => setStep(2)}
          onBack={() => setStep(0)}
        />
      ) : null}

      {step === 2 ? (
      <ConstraintStep
        constraints={constraints}
        tasks={tasks}
        onBack={() => setStep(1)}
        onGenerate={(next) => {
          setConstraints(next);
          handleGenerate();
        }}
        onDeadlineChange={handleDeadlineChange}
      />
    ) : null}

      {step === 3 ? (
        <ReviewStep
          availability={availability}
          plan={plan}
          onRegenerate={() => {
            handleGenerate();
            setAccepted(false);
          }}
          onAccept={handleAccept}
          onBack={() => setStep(2)}
          accepted={accepted}
          tasks={tasks}
        />
      ) : null}
    </div>
  );
}

function AvailabilityStep({
  availability,
  timeZone,
  onNext,
}: {
  availability: AvailabilityState;
  timeZone: string;
  onNext: (next: AvailabilityState) => void;
}) {
  const [start, setStart] = useState(availability.start);
  const [end, setEnd] = useState(availability.end);
  const [addBreaks, setAddBreaks] = useState(availability.addBreaks);

  const isValid = parseHHMM(start) < parseHHMM(end);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isValid) {
      onNext({ start, end, addBreaks });
    }
  };

  return (
    <motion.form
      className="space-y-4 rounded-2xl border border-white/10 bg-bg/30 p-4"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      onSubmit={handleSubmit}
    >
      <p className="text-sm text-fg/70">Set the time window you’re available today.</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col text-xs font-medium uppercase tracking-[0.3em] text-fg/60">
          Start time
          <input
            type="time"
            value={start}
            onChange={(event) => setStart(event.target.value)}
            className="mt-1 rounded-lg border border-white/10 bg-bg/40 px-3 py-2 text-sm text-fg focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </label>
        <label className="flex flex-col text-xs font-medium uppercase tracking-[0.3em] text-fg/60">
          End time
          <input
            type="time"
            value={end}
            onChange={(event) => setEnd(event.target.value)}
            className="mt-1 rounded-lg border border-white/10 bg-bg/40 px-3 py-2 text-sm text-fg focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </label>
      </div>
      <label className="flex items-center gap-2 text-sm text-fg/70">
        <input
          type="checkbox"
          checked={addBreaks}
          onChange={(event) => setAddBreaks(event.target.checked)}
          className="h-4 w-4 rounded border border-white/20 bg-bg/40"
        />
        Add short breaks roughly every 90 minutes
      </label>
      <p className="text-xs uppercase tracking-[0.3em] text-fg/50">Time zone: {timeZone}</p>
      <div className="flex justify-end gap-2">
        <button
          type="submit"
          className="rounded-full bg-primary/80 px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-50"
          disabled={!isValid}
        >
          Next
        </button>
      </div>
    </motion.form>
  );
}

function TasksStep({
  tasks,
  editingTask,
  onAddTask,
  onEditTask,
  onCancelEdit,
  onDeleteTask,
  onNext,
  onBack,
}: {
  tasks: Task[];
  editingTask?: Task;
  onAddTask: (task: { title: string; minutes: number; priority: Task['priority'] }) => void;
  onEditTask: (task: Task) => void;
  onCancelEdit: () => void;
  onDeleteTask: (taskId: string) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  return (
    <motion.div
      className="space-y-4"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      <TaskInputRow initial={editingTask ? { title: editingTask.title, minutes: editingTask.minutes, priority: editingTask.priority } : undefined} onSubmit={onAddTask} onCancelEdit={onCancelEdit} />
      <TaskList tasks={tasks} onEdit={onEditTask} onDelete={onDeleteTask} />
      <div className="flex justify-between">
        <button
          type="button"
          onClick={onBack}
          className="rounded-full border border-white/10 bg-bg/30 px-4 py-2 text-sm text-fg/70 transition hover:bg-bg/40 focus:outline-none focus:ring-2 focus:ring-primary/40"
        >
          Back
        </button>
        <button
          type="button"
          onClick={onNext}
          className="rounded-full bg-primary/80 px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-50"
          disabled={tasks.length === 0}
        >
          Next
        </button>
      </div>
    </motion.div>
  );
}

function ConstraintStep({
  constraints,
  tasks,
  onBack,
  onGenerate,
  onDeadlineChange,
}: {
  constraints: ConstraintState;
  tasks: Task[];
  onBack: () => void;
  onGenerate: (next: ConstraintState) => void;
  onDeadlineChange: (id: string, value: string | undefined) => void;
}) {
  const [bufferMin, setBufferMin] = useState(constraints.bufferMin);
  const [focusBlockMin, setFocusBlockMin] = useState(constraints.focusBlockMin);
  const [addBreaks, setAddBreaks] = useState(constraints.addBreaks);

  return (
    <motion.div
      className="space-y-4"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="flex flex-col text-xs font-medium uppercase tracking-[0.3em] text-fg/60">
          Buffer between tasks (min)
          <input
            type="number"
            min={0}
            value={bufferMin}
            onChange={(event) => {
              const value = Number(event.target.value);
              setBufferMin(Number.isFinite(value) ? value : 0);
            }}
            className="mt-1 rounded-lg border border-white/10 bg-bg/40 px-3 py-2 text-sm text-fg focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </label>
        <label className="flex flex-col text-xs font-medium uppercase tracking-[0.3em] text-fg/60">
          Focus block (min)
          <input
            type="number"
            min={15}
            value={focusBlockMin}
            onChange={(event) => {
              const value = Number(event.target.value);
              setFocusBlockMin(Number.isFinite(value) ? value : 0);
            }}
            className="mt-1 rounded-lg border border-white/10 bg-bg/40 px-3 py-2 text-sm text-fg focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </label>
        <label className="flex items-center gap-2 text-sm text-fg/70">
          <input
            type="checkbox"
            checked={addBreaks}
            onChange={(event) => setAddBreaks(event.target.checked)}
            className="h-4 w-4 rounded border border-white/20 bg-bg/40"
          />
          Insert planning breaks
        </label>
      </div>
      <p className="text-xs text-fg/60">
        Deadlines (optional) can be set per task from the review step if needed. Breaks are approximate and may shift if time is tight.
      </p>
      <div className="space-y-2 rounded-2xl border border-white/10 bg-bg/25 px-3 py-3">
        <p className="text-xs uppercase tracking-[0.3em] text-fg/60">Deadlines (optional)</p>
        {tasks.length === 0 ? (
          <p className="text-xs text-fg/70">Add tasks first to set individual deadlines.</p>
        ) : (
          <div className="space-y-2">
            {tasks.map((task) => (
              <div key={task.id} className="flex items-center gap-3 text-sm text-fg/80">
                <div className="flex-1 truncate font-medium">{task.title}</div>
                <input
                  type="time"
                  value={task.deadline ?? ''}
                  onChange={(event) => onDeadlineChange(task.id, event.target.value || undefined)}
                  className="w-28 rounded-lg border border-white/10 bg-bg/40 px-3 py-1 text-sm text-fg focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="flex justify-between">
        <button
          type="button"
          onClick={onBack}
          className="rounded-full border border-white/10 bg-bg/30 px-4 py-2 text-sm text-fg/70 transition hover:bg-bg/40 focus:outline-none focus:ring-2 focus:ring-primary/40"
        >
          Back
        </button>
        <button
          type="button"
          onClick={() => onGenerate({ bufferMin: Math.max(0, bufferMin), focusBlockMin: Math.max(10, focusBlockMin), addBreaks })}
          className="rounded-full bg-primary/80 px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
        >
          Generate schedule
        </button>
      </div>
    </motion.div>
  );
}

function ReviewStep({
  availability,
  plan,
  tasks,
  onRegenerate,
  onAccept,
  onBack,
  accepted,
}: {
  availability: AvailabilityState;
  plan: { items: PlanItem[]; warnings: string[] } | null;
  tasks: Task[];
  onRegenerate: () => void;
  onAccept: () => void;
  onBack: () => void;
  accepted: boolean;
}) {
  const warnings = plan?.warnings ?? [];
  const items = plan?.items ?? [];

  return (
    <motion.div
      className="space-y-4"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/15 bg-bg/20 px-4 py-6 text-sm text-fg/70">
          We couldn’t build a schedule inside your window. Adjust availability or tasks and try again.
        </div>
      ) : (
        <ScheduleTimeline start={availability.start} end={availability.end} items={items} />
      )}

      {warnings.length > 0 ? (
        <ul className="space-y-1 rounded-2xl border border-amber-200/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-100">
          {warnings.map((warning, index) => (
            <li key={index}>• {warning}</li>
          ))}
        </ul>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-bg/30">
        <table className="min-w-full text-left text-sm text-fg/80">
          <thead className="bg-bg/40 text-xs uppercase tracking-[0.3em] text-fg/50">
            <tr>
              <th className="px-4 py-2">Title</th>
              <th className="px-4 py-2">Start</th>
              <th className="px-4 py-2">End</th>
              <th className="px-4 py-2">Priority</th>
              <th className="px-4 py-2">Deadline</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-t border-white/5">
                <td className="px-4 py-2 font-medium text-fg">{item.title}</td>
                <td className="px-4 py-2">{item.start}</td>
                <td className="px-4 py-2">{item.end}</td>
                <td className="px-4 py-2">{item.priority}</td>
                <td className="px-4 py-2">
                  {tasks.find((task) => item.id.startsWith(task.id))?.deadline ?? '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap justify-between gap-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            className="rounded-full border border-white/10 bg-bg/30 px-4 py-2 text-sm text-fg/70 transition hover:bg-bg/40 focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            Back
          </button>
          <button
            type="button"
            onClick={onRegenerate}
            className="rounded-full border border-white/10 bg-bg/30 px-4 py-2 text-sm text-fg/70 transition hover:bg-bg/40 focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            Regenerate
          </button>
        </div>

        <div className="flex items-center gap-2">
          {accepted ? (
            <span className="rounded-full border border-white/10 bg-primary/20 px-3 py-1 text-xs uppercase tracking-[0.3em] text-primary">
              Plan saved locally
            </span>
          ) : null}
          <button
            type="button"
            onClick={onAccept}
            disabled={items.length === 0}
            className="rounded-full bg-primary/80 px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-50"
          >
            Accept plan
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function parseHHMM(time: string): number {
  const [h, m] = time.split(':').map((part) => Number(part));
  if (!Number.isFinite(h) || !Number.isFinite(m)) return 0;
  return h * 60 + m;
}
