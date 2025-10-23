'use client';

export type MicroKanbanProps = {
  todo?: string[];
  doing?: string[];
  done?: string[];
};

const defaultColumns: Required<MicroKanbanProps> = {
  todo: ['Clarify goal', 'Outline approach'],
  doing: ['Build first iteration'],
  done: ['Prep space'],
};

const columnOrder: Array<keyof MicroKanbanProps> = ['todo', 'doing', 'done'];

export function MicroKanban({ todo, doing, done }: MicroKanbanProps) {
  const data: Required<MicroKanbanProps> = {
    todo: todo && todo.length > 0 ? todo : defaultColumns.todo,
    doing: doing && doing.length > 0 ? doing : defaultColumns.doing,
    done: done && done.length > 0 ? done : defaultColumns.done,
  };

  const titles: Record<keyof MicroKanbanProps, string> = {
    todo: 'Todo',
    doing: 'Doing',
    done: 'Done',
  };

  return (
    <div className="adapt-panel px-4 py-4 text-sm text-fg/80">
      <div className="grid gap-3 sm:grid-cols-3">
        {columnOrder.map((key) => (
          <div key={key} className="space-y-2">
            <h3 className="text-xs uppercase tracking-[0.25em] text-fg/60">{titles[key]}</h3>
            <div className="space-y-2">
              {data[key].map((item, index) => (
                <div
                  key={`${key}-${index}`}
                  className="rounded-xl border border-white/10 bg-bg/35 px-3 py-2 text-sm text-fg/85"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
