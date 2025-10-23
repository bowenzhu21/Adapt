import { classifyIntent } from './intent';
import { normalizeType } from './componentsMap';
import { SAFE_PLAN, ensurePlan } from './planUtils';
import { UiPlan, UiTheme, AppIntent, MemoryHit } from './types';
import { AppEmotion, defaultEmotionForIntent, classifyEmotion } from './emotion';
import { retrieveUserMemories, storeUserMemory } from '@/lib/supabase/memory';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export function themeFromEmotion(emotion: string): UiTheme {
  const e = (emotion || '').toLowerCase() as AppEmotion;
  switch (e) {
    case 'calm':
      return {
        palette: { bg: '#eef6ff', fg: '#0b3b67', primary: '#60a5fa', accent: '#93c5fd' },
        motion: 'slow',
        font: 'Georgia',
        density: 'comfy',
      };
    case 'focus':
      return {
        palette: { bg: '#0b1020', fg: '#e5e7eb', primary: '#3b82f6', accent: '#1d4ed8' },
        motion: 'normal',
        font: 'Space Grotesk',
        density: 'compact',
      };
    case 'happy':
      return {
        palette: { bg: '#fff7ed', fg: '#1f2937', primary: '#f59e0b', accent: '#fb923c' },
        motion: 'snappy',
        font: 'Inter',
        density: 'cozy',
      };
    case 'energized':
      return {
        palette: { bg: '#0a0a0a', fg: '#fafafa', primary: '#22d3ee', accent: '#a78bfa' },
        motion: 'snappy',
        font: 'Inter',
        density: 'compact',
      };
    case 'reflective':
      return {
        palette: { bg: '#fafafa', fg: '#1f2937', primary: '#94a3b8', accent: '#64748b' },
        motion: 'slow',
        font: 'Georgia',
        density: 'comfy',
      };
    case 'sad':
      return {
        palette: { bg: '#0f172a', fg: '#cbd5e1', primary: '#64748b', accent: '#94a3b8' },
        motion: 'slow',
        font: 'Inter',
        density: 'cozy',
      };
    case 'anxious':
      return {
        palette: { bg: '#0f172a', fg: '#e2e8f0', primary: '#6366f1', accent: '#22d3ee' },
        motion: 'slow',
        font: 'Inter',
        density: 'comfy',
      };
    default:
      return {
        palette: { bg: '#f8fafc', fg: '#0f172a', primary: '#6366f1', accent: '#a855f7' },
        motion: 'normal',
        font: 'Inter',
        density: 'comfy',
      };
  }
}

export async function fetchMemory(userId: string, message: string, limit = 5): Promise<MemoryHit[]> {
  try {
    const hits = (await retrieveUserMemories(userId, message, limit)) as MemoryHit[];
    return hits;
  } catch (error) {
    console.error('Memory retrieval failed', error);
    return [];
  }
}

export function analyzeIntent(message: string) {
  const intent = classifyIntent(message);
  const emotionGuessRaw = classifyEmotion(message);
  const emotionGuess =
    emotionGuessRaw !== 'neutral' ? emotionGuessRaw : defaultEmotionForIntent(intent);
  return { intent, emotionGuess };
}

export async function generateUI(
  message: string,
  memoryContext: string,
  intentHint?: string,
  emotionHint?: string,
): Promise<UiPlan> {
  const system = `
You are an adaptive interface designer.

IMPORTANT OUTPUT RULE:
- Respond with a single json object only (the word "json" is intentional). No prose outside of json.

Hints to use:
- intent_hint: ${intentHint || '(none)'}
- emotion_hint: ${emotionHint || '(none)'}
- relevant_memory:
${memoryContext || '(none)'}
  
Available components (use 1–5):
header, text, button, timer, breathing, visualbreathing, journal, todo, checklist, quote, affirmation, music, soundscape, moodimage, gallery, progress, daygrid, kanban, prompt, task, planner, emotionchip, footer.

Rules:
- If intent is plan/schedule, include 'planner' and DO NOT invent tasks (1–3 components).
- If intent is focus, prefer header + timer + button (optionally add checklist or progress).
- If intent is calm, prefer header + breathing or visualbreathing + short text/affirmation.
- If intent is create or happy, combine header + moodimage or soundscape + quote/affirmation.
- If intent is reflect, pair header + journal (quote optional).
- If intent is organize/plan, use header + planner or checklist/kanban + progress.
- Always include an anchor (header or text).
- Never include logout unless explicitly asked.
- Include an "emotion" that best fits emotion_hint or the design (calm, focus, happy, energized, reflective, anxious, sad, etc.).
`;

  try {
    const res = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: `Return only json for this request: ${message}` },
      ],
    });

    const text = res.choices[0]?.message?.content ?? '';
    let parsed: unknown = null;
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = parseTaggedPlan(text);
    }

    const plan = parsed ? ensurePlan(parsed) : SAFE_PLAN;
    return plan;
  } catch {
    return SAFE_PLAN;
  }
}

export function sanitizePlan(
  planInput: unknown,
  intent: AppIntent,
  emotionHint?: AppEmotion,
): UiPlan {
  const plan = ensurePlan(planInput);

  const normalizedEmotion =
    (typeof plan.emotion === 'string' && plan.emotion !== 'curious'
      ? (plan.emotion as AppEmotion)
      : undefined) || emotionHint || defaultEmotionForIntent(intent);
  plan.emotion = normalizedEmotion;
  plan.theme = {
    ...themeFromEmotion(normalizedEmotion),
    ...(plan.theme || {}),
  };

  const allowedTypes = new Set<string>([
    'header',
    'text',
    'button',
    'timer',
    'breathing',
    'visualbreathing',
    'journal',
    'todo',
    'checklist',
    'quote',
    'affirmation',
    'music',
    'soundscape',
    'moodgradient',
    'moodimage',
    'gallery',
    'progress',
    'daygrid',
    'kanban',
    'prompt',
    'task',
    'planner',
    'emotionchip',
    'footer',
  ]);

  const components = Array.isArray(plan.components) ? plan.components : [];
  plan.components = components
    .map((component) => {
      if (!component || typeof component !== 'object') return null;
      const type = typeof component.type === 'string' ? component.type.toLowerCase() : '';
      if (!type) return null;
      const props = component.props && typeof component.props === 'object' ? component.props : {};
      return { type, props };
    })
    .filter((component): component is UiPlan['components'][number] =>
      Boolean(component && allowedTypes.has(component.type)),
    )
    .filter((component) => {
      if (component.type === 'button') {
        const action = typeof component.props?.action === 'string' ? component.props.action : '';
        return action.toLowerCase() !== 'logout';
      }
      return true;
    });

  const hasType = (type: string) => plan.components.some((component) => component.type === type);
  const addComponent = (component: UiPlan['components'][number], position: 'start' | 'end' = 'end') => {
    if (!allowedTypes.has(component.type)) return;
    if (position === 'start') {
      plan.components = [component, ...plan.components];
    } else {
      plan.components = [...plan.components, component];
    }
  };

  if (intent === 'plan') {
    const header = {
      type: 'header',
      props: {
        title: 'Plan your day',
        subtitle: 'Tell me your window and tasks. I’ll draft a schedule you can edit.',
      },
    };

    const helper = plan.components.find(
      (component) =>
        component.type === 'text' &&
        typeof component.props?.content === 'string' &&
        component.props.content.trim().length > 0 &&
        component.props.content.trim().length < 160,
    );

    const planner = { type: 'planner', props: {} };
    plan.components = helper ? [header, helper, planner] : [header, planner];
  } else {
    if (intent === 'focus') {
      if (!hasType('header')) {
        addComponent(
          {
            type: 'header',
            props: {
              title: 'Focus Sprint',
              subtitle: 'Let’s capture a tight loop of deep work.',
            },
          },
          'start',
        );
      }
      if (!hasType('timer')) {
        addComponent({ type: 'timer', props: { seconds: 1500 } });
      }
      const hasStartButton = plan.components.some(
        (component) =>
          component.type === 'button' &&
          typeof component.props?.action === 'string' &&
          component.props.action.toLowerCase().startsWith('timer:start'),
      );
      if (!hasStartButton) {
        addComponent({ type: 'button', props: { label: 'Start Focus', action: 'timer:start' } });
      }
      if (!hasType('progress')) {
        addComponent({ type: 'progress', props: { label: 'Session progress', value: 0 } });
      }
    }

    if (intent === 'calm' || normalizedEmotion === 'calm') {
      if (!hasType('breathing') && !hasType('visualbreathing')) {
        addComponent({ type: 'breathing', props: { pattern: '4-7-8' } });
      }
      if (!hasType('affirmation') && !hasType('text')) {
        addComponent({ type: 'affirmation', props: { text: 'Slow down. You have space to breathe.' } });
      }
    }

    if (intent === 'create' || normalizedEmotion === 'happy') {
      if (!hasType('moodimage') && !hasType('soundscape') && !hasType('gallery')) {
        addComponent({ type: 'soundscape', props: { title: 'Creative Flow', artist: 'Adapt' } });
      }
      if (!hasType('affirmation') && !hasType('quote')) {
        addComponent({ type: 'quote', props: { text: 'Let curiosity set the pace.', by: 'Adapt' } });
      }
    }

    if (intent === 'reflect') {
      if (!hasType('journal')) {
        addComponent({ type: 'journal', props: { title: 'Reflection Log', prompt: 'What are you noticing right now?' } });
      }
      if (!hasType('quote')) {
        addComponent({ type: 'quote', props: { text: 'Pause, notice, note.', by: 'Adapt' } });
      }
    }

    if (intent === 'focus' && !hasType('checklist') && hasType('todo')) {
      addComponent({ type: 'checklist', props: { title: 'Key steps' } });
    }
  }

  if (
    !plan.components.some((component) => {
      if (component.type === 'header') {
        const title = typeof component.props?.title === 'string' ? component.props.title.trim() : '';
        const subtitle = typeof component.props?.subtitle === 'string' ? component.props.subtitle.trim() : '';
        return Boolean(title || subtitle);
      }
      if (component.type === 'text') {
        const content = typeof component.props?.content === 'string' ? component.props.content.trim() : '';
        return Boolean(content);
      }
      return false;
    })
  ) {
    addComponent({
      type: 'text',
      props: { content: 'How should this space adapt next?' },
    }, 'start');
  }

  plan.components = plan.components.slice(0, 5);

  plan.intent = (plan.intent as AppIntent) || intent || 'chat';
  plan.confidence = plan.confidence ?? 0.6;

  return plan;
}

export async function persistTurn(
  userId: string,
  message: string,
  plan: UiPlan,
  intent: AppIntent,
) {
  await storeUserMemory(userId, message, {
    intent,
    emotion: plan.emotion,
    components: plan.components.map((component) => component.type),
  }).catch((error) => {
    console.error('Failed to store user memory', error);
  });
}

function parseTaggedPlan(raw: string): UiPlan | null {
  if (!raw || raw.indexOf('<') === -1) return null;

  const components: UiPlan['components'] = [];
  const tagRegex = /<([a-zA-Z]+)([^>]*)>(.*?)<\/\1>|<([a-zA-Z]+)([^>]*)\/>/gs;
  let match: RegExpExecArray | null;
  while ((match = tagRegex.exec(raw))) {
    const name = (match[1] || match[4] || '').toLowerCase();
    const inner = match[3] ? match[3].trim() : '';
    switch (name) {
      case 'header':
        components.push({ type: 'header', props: { title: stripTags(inner) } });
        break;
      case 'text':
        components.push({ type: 'text', props: { content: stripTags(inner) } });
        break;
      case 'quote':
        components.push({ type: 'quote', props: { text: stripTags(inner) } });
        break;
      case 'affirmation':
        components.push({ type: 'affirmation', props: { message: stripTags(inner) } });
        break;
      case 'button':
        components.push({ type: 'button', props: { label: stripTags(inner) } });
        break;
      case 'breathing':
      case 'visualbreathing':
      case 'planner':
      case 'timer':
      case 'music':
      case 'gallery':
      case 'moodimage':
      case 'todo':
      case 'checklist':
      case 'prompt':
      case 'task':
        components.push({ type: name, props: {} });
        break;
      default:
        components.push({
          type: normalizeType(name) || 'text',
          props: inner ? { content: stripTags(inner) } : {},
        });
    }
  }

  if (components.length === 0) return null;

  return ensurePlan({ components });
}

function stripTags(value: string) {
  return value.replace(/<[^>]+>/g, '').trim();
}
