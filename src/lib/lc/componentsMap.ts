export const aliases: Record<string, string> = {
  title: 'header',
  paragraph: 'text',
  cta: 'button',
  countdown: 'timer',
  visual_breathing: 'visualbreathing',
  schedule: 'planner',
  day_planner: 'planner',
  plan: 'planner',
  checklist_item: 'checklist',
  progressbar: 'progress',
  progress_bar: 'progress',
  progressmeter: 'progress',
  sound: 'soundscape',
  soundscape_card: 'soundscape',
  day: 'daygrid',
  day_grid: 'daygrid',
  board: 'kanban',
  kanban_board: 'kanban',
  affirmation_card: 'affirmation',
  quote_card: 'quote',
};

export function normalizeType(t: string): string {
  const key = (t || '').toLowerCase().trim();
  return aliases[key] ?? key;
}
