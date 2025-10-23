import { AppIntent } from './types';

export function classifyIntent(text: string): AppIntent {
  const s = (text || '').toLowerCase();

  if (/(schedule|plan|planner|calendar|my day|today|afternoon|evening)\b/.test(s)) {
    return 'plan';
  }

  if (/(focus|deep work|pomodoro|timer|sprint)\b/.test(s)) {
    return 'focus';
  }

  if (/(calm|breathe|anxious|relax|unwind|stress|stressed)\b/.test(s)) {
    return 'calm';
  }

  if (/(create|inspire|ideas|moodboard|happy|playful|music|image)\b/.test(s)) {
    return 'create';
  }

  if (/(journal|reflect|write|thoughts|gratitude)\b/.test(s)) {
    return 'reflect';
  }

  if (/(chat|talk)\b/.test(s)) {
    return 'chat';
  }

  return 'unknown';
}
