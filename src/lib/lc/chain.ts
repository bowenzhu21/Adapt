import { AppIntent, ChainInput, UiPlan } from './types';
import { fetchMemory, generateUI, sanitizePlan, persistTurn } from './tools';
import { ensurePlan } from './planUtils';
import { classifyEmotion, defaultEmotionForIntent } from './emotion';
import { classifyIntent } from './intent';

function enrichByIntent(plan: UiPlan, intent: AppIntent): UiPlan {
  const p = ensurePlan(plan);
  const count = p.components.length;
  const onlyText = count === 1 && p.components[0]?.type === 'text';

  if (intent === 'plan') {
    return p;
  }

  if (intent === 'focus' && (count < 2 || onlyText)) {
    p.components = [
      {
        type: 'header',
        props: {
          title: 'Focus Sprint',
          subtitle: 'Let’s get 25 minutes of deep work.',
        },
      },
      {
        type: 'timer',
        props: { minutes: 25, state: 'paused' },
      },
      {
        type: 'button',
        props: { label: 'Start', action: 'timer:start' },
      },
    ];
    p.emotion = p.emotion || 'focus';
    return p;
  }

  if (intent === 'calm' && (count < 2 || onlyText)) {
    p.components = [
      { type: 'header', props: { title: 'Steady Breath' } },
      { type: 'breathing', props: { pattern: '4-7-8' } },
      { type: 'text', props: { content: 'Inhale 4 • Hold 7 • Exhale 8' } },
    ];
    p.emotion = p.emotion || 'calm';
    return p;
  }

  if (intent === 'reflect' && (count < 2 || onlyText)) {
    p.components = [
      { type: 'header', props: { title: 'Quick Reflection' } },
      { type: 'journal', props: { prompt: 'What are you noticing right now?' } },
    ];
    p.emotion = p.emotion || 'reflective';
    return p;
  }

  if (intent === 'create' && (count < 2 || onlyText)) {
    p.components = [
      { type: 'header', props: { title: 'Spark' } },
      { type: 'moodimage', props: { seed: 'playful' } },
      { type: 'quote', props: { text: 'Creativity is intelligence having fun.' } },
    ];
    p.emotion = p.emotion || 'happy';
    return p;
  }

  return p;
}

export const interpretChain = {
  async invoke(input: ChainInput): Promise<UiPlan> {
    const { userId, message, intentHint } = input;
    const analyzedIntent = classifyIntent(message);

    const candidateIntent =
      intentHint && intentHint !== 'unknown' ? intentHint : analyzedIntent;
    const preferredIntent: AppIntent =
      candidateIntent && candidateIntent !== 'unknown' ? candidateIntent : 'chat';

    const emotionFromText = classifyEmotion(message);
    const emotionHint =
      emotionFromText !== 'neutral' ? emotionFromText : defaultEmotionForIntent(preferredIntent);

    const memoryHits = await fetchMemory(userId, message, 5);
    const memoryContext =
      memoryHits.map((hit) => `- ${hit.content} (notes: ${JSON.stringify(hit.metadata)})`).join('\n') ||
      '(none)';

    const generatedPlan = await generateUI(message, memoryContext, preferredIntent, emotionHint);
    const basePlan = ensurePlan(generatedPlan);
    const enriched = enrichByIntent(basePlan, preferredIntent);
    const sanitized = sanitizePlan(enriched, preferredIntent, emotionHint);

    sanitized.intent = sanitized.intent || preferredIntent;
    sanitized.emotion = sanitized.emotion || emotionHint;
    sanitized.confidence = Number.isFinite(sanitized.confidence)
      ? sanitized.confidence
      : 0.6;

    persistTurn(userId, message, sanitized, preferredIntent).catch(() => {});

    return sanitized;
  },
};
