"use client";

export type Task = {
  id: string;
  title: string;
  minutes: number;
  priority: "Low" | "Med" | "High";
  deadline?: string;
};

export type PlanItem = {
  id: string;
  title: string;
  start: string;
  end: string;
  priority: "Low" | "Med" | "High";
};

type GenerateScheduleArgs = {
  dayStart: string;
  dayEnd: string;
  tasks: Task[];
  bufferMin?: number;
  focusBlockMin?: number;
  addBreaks?: boolean;
};

const PRIORITY_WEIGHT: Record<Task["priority"], number> = {
  High: 0,
  Med: 1,
  Low: 2,
};

export function generateSchedule({
  dayStart,
  dayEnd,
  tasks,
  bufferMin = 5,
  focusBlockMin = 25,
  addBreaks = true,
}: GenerateScheduleArgs): { items: PlanItem[]; warnings: string[] } {
  const warnings: string[] = [];
  const items: PlanItem[] = [];

  const startMinutes = parseHHMM(dayStart);
  const endMinutes = parseHHMM(dayEnd);

  if (endMinutes <= startMinutes) {
    warnings.push("Invalid availability window. End time must be after start time.");
    return { items, warnings };
  }

  if (!Array.isArray(tasks) || tasks.length === 0) {
    warnings.push("No tasks were provided. Add tasks to build a schedule.");
    return { items, warnings };
  }

  const normalizedTasks = tasks
    .map((task) => ({
      ...task,
      minutes: Math.max(5, Math.floor(task.minutes)),
      deadlineMinutes: task.deadline ? parseHHMM(task.deadline) : undefined,
    }))
    .sort((a, b) => {
      const priorityCompare = PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority];
      if (priorityCompare !== 0) return priorityCompare;
      return b.minutes - a.minutes;
    });

  let cursor = startMinutes;
  let minutesSinceBreak = 0;
  let breakIndex = 0;

  for (const task of normalizedTasks) {
    const chunks = chunkTask(task, focusBlockMin);
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      if (cursor + chunk > endMinutes) {
        warnings.push(`Not enough time to schedule "${task.title}".`);
        break;
      }

      if (addBreaks && minutesSinceBreak >= 90) {
        const breakDuration = Math.min(10, endMinutes - cursor);
        if (breakDuration >= 5) {
          items.push({
            id: `break-${breakIndex}`,
            title: "Break",
            start: formatMinutes(cursor),
            end: formatMinutes(cursor + breakDuration),
            priority: "Low",
          });
          cursor += breakDuration + bufferMin;
          minutesSinceBreak = 0;
          breakIndex += 1;
        }
      }

      const deadlineLimit =
        task.deadlineMinutes !== undefined ? Math.min(task.deadlineMinutes, endMinutes) : endMinutes;
      if (cursor + chunk > deadlineLimit) {
        const adjustedStart = Math.max(startMinutes, deadlineLimit - chunk);
        if (adjustedStart >= cursor) {
          cursor = adjustedStart;
        } else {
          warnings.push(`"${task.title}" could not be finished before its deadline.`);
        }
      }

      if (cursor + chunk > endMinutes) {
        warnings.push(`Not enough time to schedule "${task.title}".`);
        break;
      }

      items.push({
        id: `${task.id}-${i}`,
        title: task.title,
        start: formatMinutes(cursor),
        end: formatMinutes(cursor + chunk),
        priority: task.priority,
      });

      cursor += chunk;
      minutesSinceBreak += chunk;

      if (bufferMin > 0) {
        cursor += bufferMin;
        minutesSinceBreak += bufferMin;
      }
    }
  }

  return { items, warnings };
}

function chunkTask(task: Task & { deadlineMinutes?: number }, focusBlockMin: number) {
  const chunks: number[] = [];
  const size = Math.max(10, Math.floor(focusBlockMin));
  let remaining = task.minutes;
  while (remaining > 0) {
    const chunk = remaining > size ? size : remaining;
    chunks.push(chunk);
    remaining -= chunk;
  }
  return chunks;
}

function parseHHMM(value: string): number {
  const [hours, minutes] = value.split(":").map((part) => Number(part));
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return 0;
  return hours * 60 + minutes;
}

function formatMinutes(total: number): string {
  const hours = Math.floor(total / 60)
    .toString()
    .padStart(2, "0");
  const minutes = (total % 60).toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}
