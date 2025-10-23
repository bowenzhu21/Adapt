import { UiPlan, UiTheme } from './types';
import { normalizeType } from './componentsMap';

const defaultPalette = {
  bg: '#f8fafc',
  fg: '#0f172a',
  primary: '#6366f1',
  accent: '#a855f7',
};

export const SAFE_PLAN: UiPlan = {
  intent: 'chat',
  emotion: 'curious',
  confidence: 0.6,
  theme: {
    palette: defaultPalette,
    motion: 'normal',
    font: 'Inter',
    density: 'comfy',
  },
  components: [
    {
      type: 'text',
      props: { content: 'Describe how you want this space to feel.' },
    },
  ],
};

export function ensurePlan(input: unknown): UiPlan {
  if (!input || typeof input !== 'object') {
    return { ...SAFE_PLAN };
  }

  const data = input as Record<string, unknown>;

  const intentRaw = data.intent;
  const emotionRaw = data.emotion;
  const confidenceRaw = data.confidence;
  const themeRaw = data.theme;
  const componentsRaw = data.components;

  const intent = typeof intentRaw === 'string' && intentRaw.length > 0 ? intentRaw : 'chat';
  const emotion = typeof emotionRaw === 'string' && emotionRaw.length > 0 ? emotionRaw : 'curious';
  const confidence = typeof confidenceRaw === 'number' && Number.isFinite(confidenceRaw) ? confidenceRaw : 0.6;
  const theme = coerceTheme(themeRaw);
  const components = coerceComponents(componentsRaw);

  return {
    intent,
    emotion,
    confidence,
    theme,
    components: components.map((component) => ({
      ...component,
      type: normalizeType(component.type ?? 'text'),
      props: component.props ?? {},
    })),
  } satisfies UiPlan;
}

function coerceTheme(theme: unknown): UiTheme {
  const paletteSource =
    theme && typeof theme === 'object' && (theme as Record<string, unknown>).palette && typeof (theme as Record<string, unknown>).palette === 'object'
      ? ((theme as Record<string, unknown>).palette as Record<string, unknown>)
      : {};

  const palette = {
    bg: typeof paletteSource.bg === 'string' ? paletteSource.bg : defaultPalette.bg,
    fg: typeof paletteSource.fg === 'string' ? paletteSource.fg : defaultPalette.fg,
    primary: typeof paletteSource.primary === 'string' ? paletteSource.primary : defaultPalette.primary,
    accent: typeof paletteSource.accent === 'string' ? paletteSource.accent : defaultPalette.accent,
  };

  return {
    palette,
    motion:
      theme && typeof theme === 'object' && (theme as Record<string, unknown>).motion
        ? ((theme as Record<string, unknown>).motion as UiTheme['motion'])
        : 'normal',
    font:
      theme && typeof theme === 'object' && typeof (theme as Record<string, unknown>).font === 'string'
        ? ((theme as Record<string, unknown>).font as string)
        : 'Inter',
    density:
      theme && typeof theme === 'object' && (theme as Record<string, unknown>).density
        ? ((theme as Record<string, unknown>).density as UiTheme['density'])
        : 'comfy',
  } satisfies UiTheme;
}

function coerceComponents(components: unknown): UiPlan['components'] {
  if (!Array.isArray(components)) {
    return [];
  }

  return components
    .filter(Boolean)
    .map((component) => {
      const item = component as Record<string, unknown>;
      return {
        type: typeof item?.type === 'string' ? (item.type as string) : 'text',
        props: (item?.props as Record<string, unknown>) ?? {},
      };
    });
}
