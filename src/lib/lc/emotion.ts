export type AppEmotion =
  | 'calm'
  | 'focus'
  | 'happy'
  | 'energized'
  | 'reflective'
  | 'sad'
  | 'anxious'
  | 'neutral';

import { AppIntent } from './types';

export function classifyEmotion(text: string): AppEmotion {
  const s = (text || '').toLowerCase();
  if (/\b(anxious|anxiety|overwhelmed|panic|nervous|worried)\b/.test(s)) return 'anxious';
  if (/\b(stress|stressed|tense|calm me|relax|unwind|breathe)\b/.test(s)) return 'calm';
  if (/\b(focus|deep work|concentrate|productive|execute)\b/.test(s)) return 'focus';
  if (/\b(happy|joy|celebrate|excited|fun|playful)\b/.test(s)) return 'happy';
  if (/\b(energized|hype|pump(?:ed)? up|motivate)\b/.test(s)) return 'energized';
  if (/\b(reflect|journal|grateful|gratitude|introspect)\b/.test(s)) return 'reflective';
  if (/\b(sad|down|blue|upset)\b/.test(s)) return 'sad';
  return 'neutral';
}

export function defaultEmotionForIntent(intent: AppIntent): AppEmotion {
  switch (intent) {
    case 'calm':
      return 'calm';
    case 'focus':
      return 'focus';
    case 'create':
      return 'happy';
    case 'reflect':
      return 'reflective';
    case 'plan':
      return 'focus';
    default:
      return 'neutral';
  }
}
