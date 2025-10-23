export type ThemeInput = {
  palette?: {
    bg?: string;
    fg?: string;
    primary?: string;
    accent?: string;
  };
  motion?: 'slow' | 'normal' | 'snappy';
  density?: 'cozy' | 'comfy' | 'compact';
  font?: string;
};

const DEFAULTS = {
  bg: '#f8fafc',
  fg: '#0f172a',
  primary: '#6366f1',
  accent: '#a855f7',
  bgA: 'rgba(99, 102, 241, 0.28)',
  bgB: 'rgba(168, 85, 247, 0.22)',
};

let debugHooked = false;

function norm(color?: string): string | undefined {
  if (!color) return undefined;
  const trimmed = String(color).trim();
  if (!trimmed) return undefined;
  const lower = trimmed.toLowerCase();
  if (
    lower.startsWith('#') ||
    lower.startsWith('rgb') ||
    lower.startsWith('hsl') ||
    lower.startsWith('color-mix') ||
    lower.startsWith('var(')
  ) {
    return trimmed;
  }
  return trimmed.startsWith('#') ? trimmed : `#${trimmed.replace(/^#/, '')}`;
}

function current(root: HTMLElement, name: string, fallback: string): string {
  const existing = getComputedStyle(root).getPropertyValue(name).trim();
  return existing || fallback;
}

export function applyTheme(theme?: ThemeInput | null): void {
  if (typeof window === 'undefined') return;

  const root = document.documentElement;
  const body = document.body;
  if (!body) return;

  const palette = theme?.palette ?? {};

  const bg = norm(palette.bg) ?? current(root, '--bg', DEFAULTS.bg);
  const fg = norm(palette.fg) ?? current(root, '--fg', DEFAULTS.fg);
  const primary = norm(palette.primary) ?? current(root, '--primary', DEFAULTS.primary);
  const accent = norm(palette.accent) ?? current(root, '--accent', DEFAULTS.accent);

  root.style.setProperty('--bg', bg);
  root.style.setProperty('--fg', fg);
  root.style.setProperty('--primary', primary);
  root.style.setProperty('--accent', accent);
  root.style.setProperty('--bgA', toRgba(primary, 0.28, DEFAULTS.bgA));
  root.style.setProperty('--bgB', toRgba(accent, 0.22, DEFAULTS.bgB));

  const motion = theme?.motion ?? 'normal';
  const density = theme?.density ?? 'comfy';

  body.setAttribute('data-motion', motion);
  body.setAttribute('data-density', density);
  root.setAttribute('data-motion', motion);
  root.setAttribute('data-density', density);

  if (theme?.font) {
    body.style.fontFamily = theme.font;
  }

  body.dataset.themeTick = String(Date.now());

  if (process.env.NODE_ENV !== 'production' && !debugHooked) {
    debugHooked = true;
    window.addEventListener(
      'keydown',
      (event) => {
        if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'd') {
          const styles = getComputedStyle(document.documentElement);
          console.log('[palette]', {
            bg: styles.getPropertyValue('--bg').trim(),
            fg: styles.getPropertyValue('--fg').trim(),
            primary: styles.getPropertyValue('--primary').trim(),
            accent: styles.getPropertyValue('--accent').trim(),
          });
        }
      },
      { once: true },
    );
  }

  window.dispatchEvent(new Event('theme:changed'));
}

function toRgba(color: string, alpha: number, fallback: string): string {
  const normalized = color.trim();
  if (normalized.startsWith('#')) {
    const hex = normalized.replace('#', '');
    const full = hex.length === 3 ? hex.split('').map((c) => c + c).join('') : hex;
    const value = Number.parseInt(full, 16);
    if (!Number.isNaN(value)) {
      const r = (value >> 16) & 255;
      const g = (value >> 8) & 255;
      const b = value & 255;
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
  } else if (normalized.startsWith('rgb')) {
    const numbers = normalized
      .replace(/rgba?\(/i, '')
      .replace(/\)/g, '')
      .split(/[,\s/]+/)
      .map((segment) => Number.parseFloat(segment.trim()))
      .filter((value) => Number.isFinite(value)) as number[];
    if (numbers.length >= 3) {
      const [r, g, b] = numbers;
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
  }
  return fallback;
}
